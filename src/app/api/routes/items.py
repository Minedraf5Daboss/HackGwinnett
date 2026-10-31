"""Example resource: items owned by the current user."""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models import Item, User
from app.schemas import ItemCreate, ItemRead, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


def _get_owned_item(db: SessionDep, user: User, item_id: int) -> Item:
    item = db.get(Item, item_id)
    if item is None or item.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item


@router.get("")
def list_items(
    db: SessionDep,
    user: CurrentUser,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> list[ItemRead]:
    stmt = (
        select(Item).where(Item.owner_id == user.id).order_by(Item.id).offset(offset).limit(limit)
    )
    return [ItemRead.model_validate(item) for item in db.scalars(stmt)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate, db: SessionDep, user: CurrentUser) -> ItemRead:
    item = Item(**payload.model_dump(), owner_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ItemRead.model_validate(item)


@router.get("/{item_id}")
def get_item(item_id: int, db: SessionDep, user: CurrentUser) -> ItemRead:
    return ItemRead.model_validate(_get_owned_item(db, user, item_id))


@router.patch("/{item_id}")
def update_item(item_id: int, payload: ItemUpdate, db: SessionDep, user: CurrentUser) -> ItemRead:
    item = _get_owned_item(db, user, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return ItemRead.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: SessionDep, user: CurrentUser) -> None:
    db.delete(_get_owned_item(db, user, item_id))
    db.commit()
