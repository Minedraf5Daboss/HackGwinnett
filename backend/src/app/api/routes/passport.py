"""The current user's Accessibility Passport."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Accommodation, Passport
from app.schemas import PassportRead, PassportUpdate

router = APIRouter(prefix="/passport", tags=["passport"])


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
