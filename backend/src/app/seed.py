"""Load the demo data in app/data/ (accommodation types and clinics) into the database.

Run with `make seed` (`make dev` does it for you). It's safe to run again after editing the
JSON files: accommodation types are updated in place, and the clinics are replaced to match
clinics.json.
"""

import json
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import make_engine
from app.models import Accommodation, Clinic, ClinicAccommodation

DATA_DIR = Path(__file__).parent / "data"


def _load(name: str) -> list[dict]:
    return json.loads((DATA_DIR / name).read_text())


def seed(db: Session) -> None:
    accommodations = _load("accommodations.json")
    for order, item in enumerate(accommodations):
        db.merge(Accommodation(sort_order=order, **item))
    known = {item["id"] for item in accommodations}

    db.execute(delete(ClinicAccommodation))
    db.execute(delete(Clinic))
    for item in _load("clinics.json"):
        offered = []
        # Each accommodation is either an id, or {"id": ..., "note": ...}.
        for entry in item.pop("accommodations"):
            entry = {"id": entry} if isinstance(entry, str) else entry
            if entry["id"] not in known:
                raise ValueError(f"clinics.json: {item['id']} has unknown accommodation {entry}")
            offered.append(
                ClinicAccommodation(accommodation_id=entry["id"], note=entry.get("note"))
            )
        db.add(Clinic(**item, accommodations=offered))
    db.commit()


def main() -> None:
    engine = make_engine(get_settings().database_url)
    with Session(engine) as db:
        seed(db)
        print(
            f"Seeded {db.query(Accommodation).count()} accommodations and "
            f"{db.query(Clinic).count()} clinics."
        )
    engine.dispose()


if __name__ == "__main__":
    main()
