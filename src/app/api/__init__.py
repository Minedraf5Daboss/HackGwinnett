from fastapi import APIRouter

from app.api.routes import auth, health, items, users

api_router = APIRouter()
api_router.include_router(health.router)

v1 = APIRouter(prefix="/api/v1")
v1.include_router(auth.router)
v1.include_router(users.router)
v1.include_router(items.router)
api_router.include_router(v1)
