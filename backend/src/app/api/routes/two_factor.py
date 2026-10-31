"""Two-step verification with an authenticator app.

Setup: POST /setup shows a QR code, then POST /enable with a code from the app turns it on.
Login: POST /auth/token returns a `two_factor_token`; POST /verify trades it and a code for a
bearer token.
"""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep, SettingsDep
from app.models import TwoFactor, User
from app.schemas import (
    RecoveryCodesRead,
    Token,
    TwoFactorCode,
    TwoFactorDisable,
    TwoFactorSetupRead,
    TwoFactorVerify,
)
from app.security import create_access_token, decode_two_factor_token, verify_password
from app.two_factor import (
    LOCKOUT,
    TooManyAttempts,
    check_code,
    match_totp,
    new_recovery_codes,
    new_secret,
    provisioning_uri,
    qr_code,
    utcnow,
)

router = APIRouter(prefix="/auth/2fa", tags=["two-factor"])

TOO_MANY_ATTEMPTS = HTTPException(
    status.HTTP_429_TOO_MANY_REQUESTS,
    f"Too many wrong codes. Try again in {int(LOCKOUT.total_seconds() // 60)} minutes.",
)


@router.post("/setup")
def start_setup(db: SessionDep, user: CurrentUser) -> TwoFactorSetupRead:
    """Start setting up an authenticator app: scan the QR code, then call POST /enable.

    Calling this again before enabling starts over with a new QR code.
    """
    if user.two_factor_enabled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Two-step verification is already on")
    secret = new_secret()
    user.two_factor = TwoFactor(secret=secret)
    db.commit()
    uri = provisioning_uri(secret, user.email)
    return TwoFactorSetupRead(secret=secret, otpauth_uri=uri, qr_code=qr_code(uri))


@router.post("/enable")
def enable(payload: TwoFactorCode, db: SessionDep, user: CurrentUser) -> RecoveryCodesRead:
    """Turn two-step verification on with a code from the app. Returns recovery codes."""
    two_factor = user.two_factor
    if two_factor is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Start setup first (POST /auth/2fa/setup)")
    if two_factor.enabled_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Two-step verification is already on")
    counter = match_totp(two_factor.secret, payload.code.strip(), None)
    if counter is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "That code didn't match. Check the time on your phone and try the newest code.",
        )

    codes, rows = new_recovery_codes()
    two_factor.enabled_at = utcnow()
    two_factor.last_used_counter = counter
    two_factor.recovery_codes = rows
    db.commit()
    return RecoveryCodesRead(recovery_codes=codes)


@router.post("/verify")
def verify(payload: TwoFactorVerify, db: SessionDep, settings: SettingsDep) -> Token:
    """The second step of logging in: a code from the app (or a recovery code)."""
    subject = decode_two_factor_token(payload.two_factor_token, settings)
    user = db.get(User, int(subject)) if subject else None
    if user is None or not user.is_active or not user.two_factor_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your login timed out. Log in again.")
    try:
        ok = check_code(user.two_factor, payload.code)
    except TooManyAttempts:
        raise TOO_MANY_ATTEMPTS from None
    finally:
        db.commit()  # keep the failed attempt, or the used recovery code
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That code isn't right")
    return Token(access_token=create_access_token(str(user.id), settings))


@router.post("/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable(payload: TwoFactorDisable, db: SessionDep, user: CurrentUser) -> None:
    """Turn two-step verification off. Needs your password and a code (or a recovery code)."""
    two_factor = user.two_factor
    if two_factor is None:
        return
    if two_factor.enabled_at is not None:
        # 403 rather than 401, which would mean "log in again".
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Incorrect password")
        try:
            ok = check_code(two_factor, payload.code)
        except TooManyAttempts:
            raise TOO_MANY_ATTEMPTS from None
        finally:
            db.commit()
        if not ok:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "That code isn't right")
    user.two_factor = None
    db.commit()
