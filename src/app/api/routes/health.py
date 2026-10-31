from fastapi import APIRouter
from sqlalchemy import text

from app import __version__
from app.api.deps import SessionDep

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: SessionDep) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "version": __version__}
