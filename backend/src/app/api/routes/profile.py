"""The current user's health profile."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.schemas import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def read_profile(user: CurrentUser) -> ProfileRead:
    return ProfileRead.model_validate(user.profile)


@router.patch("")
def update_profile(payload: ProfileUpdate, db: SessionDep, user: CurrentUser) -> ProfileRead:
    profile = user.profile
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return ProfileRead.model_validate(profile)
