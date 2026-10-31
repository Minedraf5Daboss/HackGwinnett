"""Password hashing and JWT tokens."""

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import Settings

ALGORITHM = "HS256"
# How long someone has to enter their two-step verification code after their password.
TWO_FACTOR_TOKEN_TTL = timedelta(minutes=5)

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _password_hash.verify(password, hashed)


def create_access_token(subject: str, settings: Settings) -> str:
    ttl = timedelta(minutes=settings.access_token_expire_minutes)
    return _encode(subject, "access", ttl, settings)


def decode_access_token(token: str, settings: Settings) -> str | None:
    """Return the token's subject, or None if the token is invalid or expired."""
    return _decode(token, "access", settings)


def create_two_factor_token(subject: str, settings: Settings) -> str:
    """A token saying the password was right, to trade for an access token plus a 2FA code."""
    return _encode(subject, "2fa", TWO_FACTOR_TOKEN_TTL, settings)


def decode_two_factor_token(token: str, settings: Settings) -> str | None:
    return _decode(token, "2fa", settings)


def _encode(subject: str, kind: str, ttl: timedelta, settings: Settings) -> str:
    expire = datetime.now(timezone.utc) + ttl
    payload = {"sub": subject, "typ": kind, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def _decode(token: str, kind: str, settings: Settings) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    # Tokens made before there were kinds have no "typ"; they're all access tokens.
    if payload.get("typ", "access") != kind:
        return None
    return payload.get("sub")
