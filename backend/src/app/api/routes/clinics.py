"""The clinic directory. Public: no login needed."""

from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.deps import SessionDep
from app.models import Accommodation, Clinic, ClinicAccommodation
from app.schemas import ClinicAccommodationRead, ClinicRead

router = APIRouter(prefix="/clinics", tags=["clinics"])

EARTH_RADIUS_MILES = 3958.8


def _distance_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance between two points (the haversine formula)."""
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * asin(sqrt(a))


def _to_read(clinic: Clinic, distance: float | None = None) -> ClinicRead:
    badges = sorted(clinic.accommodations, key=lambda ca: ca.accommodation.sort_order)
    return ClinicRead(
        id=clinic.id,
        name=clinic.name,
        type=clinic.type,
        street=clinic.street,
        city=clinic.city,
        state=clinic.state,
        zip=clinic.zip,
        phone=clinic.phone,
        hours=clinic.hours,
        latitude=clinic.latitude,
        longitude=clinic.longitude,
        accommodations=[
            ClinicAccommodationRead(
                id=ca.accommodation_id,
                label=ca.accommodation.label,
                category=ca.accommodation.category,
                note=ca.note,
            )
            for ca in badges
        ],
        distance_miles=None if distance is None else round(distance, 1),
    )


@router.get("")
def list_clinics(
    db: SessionDep,
    q: str | None = Query(
        None, max_length=100, description="Search names, types, cities, ZIP codes, and badges"
    ),
    clinic_type: str | None = Query(None, alias="type", description="e.g. Dental"),
    accommodations: str | None = Query(
        None,
        description="Comma-separated accommodation ids. Only clinics offering all of them.",
        examples=["wheelchair-access,asl-interpreter"],
    ),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
) -> list[ClinicRead]:
    """Search the directory. Results are sorted by name, or by distance if you pass `lat` and
    `lng`."""
    if (lat is None) != (lng is None):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Pass both lat and lng")

    stmt = select(Clinic)
    if q and q.strip():
        q = q.strip()
        stmt = stmt.where(
            or_(
                Clinic.name.icontains(q, autoescape=True),
                Clinic.type.icontains(q, autoescape=True),
                Clinic.city.icontains(q, autoescape=True),
                Clinic.zip.startswith(q, autoescape=True),
                Clinic.accommodations.any(
                    ClinicAccommodation.accommodation.has(
                        Accommodation.label.icontains(q, autoescape=True)
                    )
                ),
            )
        )
    if clinic_type:
        stmt = stmt.where(func.lower(Clinic.type) == clinic_type.strip().lower())
    if accommodations:
        wanted = [a.strip() for a in accommodations.split(",") if a.strip()]
        known = set(db.scalars(select(Accommodation.id).where(Accommodation.id.in_(wanted))))
        unknown = sorted(set(wanted) - known)
        if unknown:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                f"Unknown accommodation: {', '.join(unknown)}",
            )
        for accommodation_id in wanted:
            stmt = stmt.where(
                Clinic.accommodations.any(ClinicAccommodation.accommodation_id == accommodation_id)
            )

    clinics = db.scalars(stmt.order_by(Clinic.name)).all()
    if lat is None:
        return [_to_read(clinic) for clinic in clinics]
    with_distance = [
        (clinic, _distance_miles(lat, lng, clinic.latitude, clinic.longitude)) for clinic in clinics
    ]
    with_distance.sort(key=lambda pair: pair[1])
    return [_to_read(clinic, distance) for clinic, distance in with_distance]


@router.get("/types")
def list_clinic_types(db: SessionDep) -> list[str]:
    """Every clinic type in the directory, for a filter dropdown."""
    return list(db.scalars(select(Clinic.type).distinct().order_by(Clinic.type)))


@router.get("/{clinic_id}")
def get_clinic(clinic_id: str, db: SessionDep) -> ClinicRead:
    clinic = db.get(Clinic, clinic_id)
    if clinic is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Clinic not found")
    return _to_read(clinic)
