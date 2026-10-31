from fastapi import APIRouter

from app.api.routes import (
    accommodations,
    auth,
    clinics,
    health,
    passport,
    profile,
    simplify,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)

v1 = APIRouter(prefix="/api/v1")
v1.include_router(auth.router)
v1.include_router(users.router)
v1.include_router(profile.router)
v1.include_router(passport.router)
v1.include_router(accommodations.router)
v1.include_router(clinics.router)
v1.include_router(simplify.router)
api_router.include_router(v1)
