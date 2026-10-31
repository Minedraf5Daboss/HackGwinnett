"""The current user's Accessibility Passport, and read-only links for sharing it."""

import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep
from app.api.routes.clinics import ClinicFiltersDep, search_clinics
from app.models import Accommodation, Passport
from app.schemas import (
    AccommodationRead,
    ClinicRead,
    PassportRead,
    PassportShareCreate,
    PassportShareRead,
    PassportUpdate,
    SharedPassportRead,
)

router = APIRouter(prefix="/passport", tags=["passport"])
shared_router = APIRouter(prefix="/shared-passports", tags=["passport"])


@router.get("")
def read_passport(user: CurrentUser) -> PassportRead:
    """Your passport. Empty (with `updated_at` null) until you first save it."""
    if user.passport is None:
        return PassportRead(accommodations=[], notes=None, updated_at=None)
    return PassportRead.model_validate(user.passport)


@router.put("")
def save_passport(payload: PassportUpdate, db: SessionDep, user: CurrentUser) -> PassportRead:
    """Save your passport, replacing the accommodations and notes saved before."""
    wanted = set(payload.accommodations)
    selected = db.scalars(
        select(Accommodation).where(Accommodation.id.in_(wanted)).order_by(Accommodation.sort_order)
    ).all()
    unknown = sorted(wanted - {a.id for a in selected})
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown accommodation: {', '.join(unknown)}"
        )

    passport = user.passport or Passport(user=user)
    passport.accommodations = list(selected)
    passport.notes = payload.notes
    passport.updated_at = func.now()  # also when only the accommodations changed
    db.add(passport)
    db.commit()
    db.refresh(passport)
    return PassportRead.model_validate(passport)


@router.get("/matches")
def passport_matches(
    db: SessionDep, user: CurrentUser, filters: ClinicFiltersDep
) -> list[ClinicRead]:
    """Clinics ranked by how many of your passport's accommodations they offer.

    Takes the same filters as GET /clinics. Each result's `match` lists the needs it meets and
    misses. If your passport is empty, clinics aren't ranked and `match` is null.
    """
    needs = [a.id for a in user.passport.accommodations] if user.passport else []
    return search_clinics(db, filters, needs)


@router.post("/share")
def share_passport(
    db: SessionDep, user: CurrentUser, payload: PassportShareCreate | None = None
) -> PassportShareRead:
    """Turn on a read-only link to your passport, for showing clinic staff.

    Calling this again keeps the same link (and updates `include_name`). To make a new link,
    turn sharing off first.
    """
    passport = user.passport
    if passport is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Save your passport before sharing it")
    payload = payload or PassportShareCreate()
    if passport.share_token is None:
        passport.share_token = secrets.token_urlsafe(16)
    passport.share_include_name = payload.include_name
    db.commit()
    return PassportShareRead(token=passport.share_token, include_name=passport.share_include_name)


@router.delete("/share", status_code=status.HTTP_204_NO_CONTENT)
def stop_sharing_passport(db: SessionDep, user: CurrentUser) -> None:
    """Turn the share link off. The old link stops working right away."""
    if user.passport is not None:
        user.passport.share_token = None
        db.commit()


@shared_router.get("/{token}")
def read_shared_passport(token: str, db: SessionDep) -> SharedPassportRead:
    """A shared passport. Public: anyone with the link can see it, without logging in."""
    passport = db.scalar(select(Passport).where(Passport.share_token == token))
    if passport is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This link isn't active")
    return SharedPassportRead(
        name=passport.user.profile.full_name if passport.share_include_name else None,
        accommodations=[AccommodationRead.model_validate(a) for a in passport.accommodations],
        notes=passport.notes,
        updated_at=passport.updated_at,
    )
