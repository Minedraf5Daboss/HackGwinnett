"""The current user's Accessibility Passport, and read-only links for sharing it."""

import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep
from app.api.routes.clinics import ClinicFiltersDep, search_clinics
from app.models import Accommodation, Passport, PassportAccommodation
from app.schemas import (
    AccommodationRead,
    ClinicRead,
    PassportAccommodationRead,
    PassportAccommodationUpdate,
    PassportRead,
    PassportShareCreate,
    PassportShareRead,
    PassportUpdate,
    SharedPassportRead,
)

router = APIRouter(prefix="/passport", tags=["passport"])
shared_router = APIRouter(prefix="/shared-passports", tags=["passport"])


def _accommodations(passport: Passport) -> list[PassportAccommodationRead]:
    """The passport's accommodations, in display order."""
    chosen = sorted(passport.accommodations, key=lambda pa: pa.accommodation.sort_order)
    return [
        PassportAccommodationRead(
            **AccommodationRead.model_validate(pa.accommodation).model_dump(),
            must_have=pa.must_have,
        )
        for pa in chosen
    ]


@router.get("")
def read_passport(user: CurrentUser) -> PassportRead:
    """Your passport. Empty (with `updated_at` null) until you first save it."""
    passport = user.passport
    if passport is None:
        return PassportRead(accommodations=[], notes=None, updated_at=None)
    return PassportRead(
        accommodations=_accommodations(passport),
        notes=passport.notes,
        updated_at=passport.updated_at,
        share_token=passport.share_token,
        share_include_name=passport.share_include_name,
    )


@router.put("")
def save_passport(payload: PassportUpdate, db: SessionDep, user: CurrentUser) -> PassportRead:
    """Save your passport, replacing the accommodations and notes saved before."""
    wanted: dict[str, bool] = {}  # accommodation id -> must-have
    for entry in payload.accommodations:
        entry = PassportAccommodationUpdate(id=entry) if isinstance(entry, str) else entry
        # If an id is listed twice, it's a must-have if either entry says so.
        wanted[entry.id] = wanted.get(entry.id, False) or entry.must_have
    selected = db.scalars(select(Accommodation).where(Accommodation.id.in_(wanted))).all()
    unknown = sorted(wanted.keys() - {a.id for a in selected})
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown accommodation: {', '.join(unknown)}"
        )

    passport = user.passport or Passport(user=user)
    passport.accommodations = [
        PassportAccommodation(accommodation=a, must_have=wanted[a.id]) for a in selected
    ]
    passport.notes = payload.notes
    passport.updated_at = func.now()  # also when only the accommodations changed
    db.add(passport)
    db.commit()
    db.refresh(passport)
    return read_passport(user)


@router.get("/matches")
def passport_matches(
    db: SessionDep, user: CurrentUser, filters: ClinicFiltersDep
) -> list[ClinicRead]:
    """Clinics ranked by how well they meet your passport's accommodations.

    Takes the same filters as GET /clinics. Clinics missing the fewest must-haves come first,
    then those offering the most of your accommodations overall. Each result's `match` lists
    the needs it meets and misses. If your passport is empty, clinics aren't ranked and
    `match` is null.
    """
    chosen = _accommodations(user.passport) if user.passport else []
    return search_clinics(db, filters, {a.id: a.must_have for a in chosen})


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
        accommodations=_accommodations(passport),
        notes=passport.notes,
        updated_at=passport.updated_at,
    )
