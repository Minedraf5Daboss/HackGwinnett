"""The clinic directory. Public: no login needed."""

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import SessionDep
from app.models import Accommodation, Clinic, ClinicAccommodation
from app.schemas import ClinicAccommodationRead, ClinicMatch, ClinicRead

router = APIRouter(prefix="/clinics", tags=["clinics"])

EARTH_RADIUS_MILES = 3958.8


def _distance_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance between two points (the haversine formula)."""
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_MILES * asin(sqrt(a))


def _to_read(
    clinic: Clinic, distance: float | None = None, match: ClinicMatch | None = None
) -> ClinicRead:
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
        match=match,
    )


def _match(clinic: Clinic, needs: list[str]) -> ClinicMatch:
    offered = {ca.accommodation_id for ca in clinic.accommodations}
    met = [need for need in needs if need in offered]
    missing = [need for need in needs if need not in offered]
    return ClinicMatch(met=met, missing=missing, score=round(len(met) / len(needs), 2))


def parse_accommodation_ids(db: Session, raw: str | None) -> list[str]:
    """Split a comma-separated list of accommodation ids. Rejects ids that don't exist."""
    ids = list(dict.fromkeys(part.strip() for part in (raw or "").split(",") if part.strip()))
    known = set(db.scalars(select(Accommodation.id).where(Accommodation.id.in_(ids))))
    unknown = sorted(set(ids) - known)
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown accommodation: {', '.join(unknown)}"
        )
    return ids


@dataclass
class ClinicFilters:
    q: str | None
    clinic_type: str | None
    accommodations: str | None
    lat: float | None
    lng: float | None


def clinic_filters(
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
) -> ClinicFilters:
    if (lat is None) != (lng is None):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Pass both lat and lng")
    return ClinicFilters(q, clinic_type, accommodations, lat, lng)


ClinicFiltersDep = Annotated[ClinicFilters, Depends(clinic_filters)]


def search_clinics(db: Session, filters: ClinicFilters, needs: list[str]) -> list[ClinicRead]:
    """Find clinics matching `filters`.

    Sorted by name, or by distance if `lat`/`lng` are set. With `needs`, clinics meeting more
    of them come first (then by distance or name), and each result gets a `match`.
    """
    stmt = select(Clinic)
    q = (filters.q or "").strip()
    if q:
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
    if filters.clinic_type:
        stmt = stmt.where(func.lower(Clinic.type) == filters.clinic_type.strip().lower())
    for accommodation_id in parse_accommodation_ids(db, filters.accommodations):
        stmt = stmt.where(
            Clinic.accommodations.any(ClinicAccommodation.accommodation_id == accommodation_id)
        )

    results = []
    for clinic in db.scalars(stmt.order_by(Clinic.name)):
        distance = None
        if filters.lat is not None:
            distance = _distance_miles(filters.lat, filters.lng, clinic.latitude, clinic.longitude)
        results.append(_to_read(clinic, distance, _match(clinic, needs) if needs else None))

    # Python's sort is stable, so ties keep the name order from the query.
    if filters.lat is not None:
        results.sort(key=lambda clinic: clinic.distance_miles)
    if needs:
        results.sort(key=lambda clinic: clinic.match.score, reverse=True)
    return results


@router.get("")
def list_clinics(
    db: SessionDep,
    filters: ClinicFiltersDep,
    needs: str | None = Query(
        None,
        description=(
            "Comma-separated accommodation ids to rank by: clinics meeting more of them come "
            "first, and each result gets a `match`. Unlike `accommodations`, nothing is "
            "filtered out."
        ),
        examples=["wheelchair-access,asl-interpreter,low-sensory"],
    ),
) -> list[ClinicRead]:
    """Search the directory."""
    return search_clinics(db, filters, parse_accommodation_ids(db, needs))


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
