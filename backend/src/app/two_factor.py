"""Two-step verification: 6-digit codes from an authenticator app (TOTP), and recovery codes.

Codes are checked against the current 30-second time step and the ones either side of it,
for clocks that are a little off. A code can't be used twice, and after MAX_FAILURES wrong
codes in a row, code checks are locked for LOCKOUT.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import pyotp
import segno

from app.models import RecoveryCode, TwoFactor

ISSUER = "MedAssist"  # the name shown in the authenticator app
MAX_FAILURES = 5
LOCKOUT = timedelta(minutes=15)
RECOVERY_CODE_COUNT = 10
_RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o, 1/l/i look-alikes


class TooManyAttempts(Exception):
    """Too many wrong codes in a row. Code checks are locked for a while."""


def utcnow() -> datetime:
    # Stored without a time zone, like the database's own timestamps.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str) -> str:
    """The otpauth:// link an authenticator app reads from the QR code."""
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def qr_code(uri: str) -> str:
    """`uri` as a QR code, in an SVG data URI ready for an <img src>."""
    return segno.make(uri, error="m").svg_data_uri(scale=5, border=2)


def match_totp(secret: str, code: str, last_used_counter: int | None) -> int | None:
    """The time step `code` is for, or None if it's wrong or that step's code was used."""
    totp = pyotp.TOTP(secret)
    current = totp.timecode(datetime.now(timezone.utc))
    for counter in (current - 1, current, current + 1):
        if last_used_counter is not None and counter <= last_used_counter:
            continue
        if hmac.compare_digest(totp.generate_otp(counter), code):
            return counter
    return None


def new_recovery_codes() -> tuple[list[str], list[RecoveryCode]]:
    """Fresh recovery codes, e.g. "k3mz9-q7tpa": the codes to show, and rows storing hashes."""
    codes = [
        "-".join("".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(5)) for _ in range(2))
        for _ in range(RECOVERY_CODE_COUNT)
    ]
    return codes, [RecoveryCode(code_hash=_hash_recovery_code(code)) for code in codes]


def _hash_recovery_code(code: str) -> str:
    # The codes are random and long, so a fast hash is enough (unlike passwords).
    normalized = code.strip().lower().replace("-", "").replace(" ", "")
    return hashlib.sha256(normalized.encode()).hexdigest()


def check_code(two_factor: TwoFactor, code: str) -> bool:
    """Check a 6-digit code or a recovery code, and record the attempt. The caller commits.

    A recovery code that works is used up. Raises TooManyAttempts while locked out.
    """
    now = utcnow()
    if two_factor.locked_until and now < two_factor.locked_until:
        raise TooManyAttempts
    code = code.strip().replace(" ", "")

    ok = False
    if code.isdigit():
        counter = match_totp(two_factor.secret, code, two_factor.last_used_counter)
        if counter is not None:
            two_factor.last_used_counter = counter
            ok = True
    else:
        hashed = _hash_recovery_code(code)
        for recovery_code in two_factor.recovery_codes:
            if hmac.compare_digest(recovery_code.code_hash, hashed):
                two_factor.recovery_codes.remove(recovery_code)
                ok = True
                break

    if ok:
        two_factor.failed_attempts = 0
        two_factor.locked_until = None
    else:
        two_factor.failed_attempts += 1
        if two_factor.failed_attempts >= MAX_FAILURES:
            two_factor.failed_attempts = 0
            two_factor.locked_until = now + LOCKOUT
    return ok
