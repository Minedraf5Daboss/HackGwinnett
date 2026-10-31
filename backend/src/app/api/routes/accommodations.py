from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import SessionDep
from app.models import Accommodation
from app.schemas import AccommodationRead

router = APIRouter(prefix="/accommodations", tags=["accommodations"])


@router.get("")
def list_accommodations(db: SessionDep) -> list[AccommodationRead]:
    """Every accommodation type, in display order. Group them by `category` in the UI."""
    stmt = select(Accommodation).order_by(Accommodation.sort_order)
    return [AccommodationRead.model_validate(a) for a in db.scalars(stmt)]
