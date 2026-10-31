"""Database tables."""

from datetime import date, datetime

from sqlalchemy import ForeignKey, String, Text, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    profile: Mapped["Profile"] = relationship(back_populates="user", cascade="all, delete-orphan")
    passport: Mapped["Passport | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    two_factor: Mapped["TwoFactor | None"] = relationship(cascade="all, delete-orphan")

    @property
    def two_factor_enabled(self) -> bool:
        return self.two_factor is not None and self.two_factor.enabled_at is not None


class TwoFactor(Base):
    """A user's authenticator app, for two-step verification at login.

    Created when setup starts. Until the user confirms it with a code, `enabled_at` is null and
    it isn't used at login.
    """

    __tablename__ = "two_factor"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    secret: Mapped[str] = mapped_column(String(64))
    enabled_at: Mapped[datetime | None]
    # The time step of the last code accepted, so the same code can't be used twice.
    last_used_counter: Mapped[int | None]
    # Wrong codes in a row. Too many locks out code checks until `locked_until`.
    failed_attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    locked_until: Mapped[datetime | None]

    recovery_codes: Mapped[list["RecoveryCode"]] = relationship(cascade="all, delete-orphan")


class RecoveryCode(Base):
    """A one-time code for logging in without the authenticator app. Only a hash is stored."""

    __tablename__ = "recovery_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("two_factor.user_id", ondelete="CASCADE"), index=True
    )
    code_hash: Mapped[str] = mapped_column(String(64))


class Profile(Base):
    """A user's health details. One per user, created empty when they register."""

    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    full_name: Mapped[str | None] = mapped_column(String(200))
    date_of_birth: Mapped[date | None]
    phone: Mapped[str | None] = mapped_column(String(30))
    emergency_contact_name: Mapped[str | None] = mapped_column(String(200))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30))
    allergies: Mapped[str | None] = mapped_column(Text)
    medications: Mapped[str | None] = mapped_column(Text)
    conditions: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="profile")


class Accommodation(Base):
    """A kind of accessibility support, such as an ASL interpreter.

    Loaded from data/accommodations.json by `make seed`.
    """

    __tablename__ = "accommodations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. "asl-interpreter"
    label: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(String(300))
    sort_order: Mapped[int] = mapped_column(default=0)


class Clinic(Base):
    """A clinic in the directory. Loaded from data/clinics.json by `make seed`."""

    __tablename__ = "clinics"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)  # e.g. "brightpath-dental"
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(50))
    street: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(2))
    zip: Mapped[str] = mapped_column(String(10))
    phone: Mapped[str] = mapped_column(String(30))
    hours: Mapped[str | None] = mapped_column(String(200))
    latitude: Mapped[float]
    longitude: Mapped[float]

    accommodations: Mapped[list["ClinicAccommodation"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )


class ClinicAccommodation(Base):
    """An accommodation a clinic offers, with an optional note such as "Book 48 hours ahead"."""

    __tablename__ = "clinic_accommodations"

    clinic_id: Mapped[str] = mapped_column(
        ForeignKey("clinics.id", ondelete="CASCADE"), primary_key=True
    )
    accommodation_id: Mapped[str] = mapped_column(
        ForeignKey("accommodations.id", ondelete="CASCADE"), primary_key=True
    )
    note: Mapped[str | None] = mapped_column(String(200))

    accommodation: Mapped[Accommodation] = relationship(lazy="joined")


class PassportAccommodation(Base):
    """An accommodation in a passport: one the user must have, or one that's nice to have."""

    __tablename__ = "passport_accommodations"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("passports.user_id", ondelete="CASCADE"), primary_key=True
    )
    accommodation_id: Mapped[str] = mapped_column(
        ForeignKey("accommodations.id", ondelete="CASCADE"), primary_key=True
    )
    must_have: Mapped[bool] = mapped_column(default=True, server_default=true())

    accommodation: Mapped[Accommodation] = relationship(lazy="joined")


class Passport(Base):
    """A user's Accessibility Passport: the accommodations they need at appointments."""

    __tablename__ = "passports"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    # Set while the user shares a read-only link. Clearing it turns the link off.
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    share_include_name: Mapped[bool] = mapped_column(default=True, server_default=true())

    user: Mapped[User] = relationship(back_populates="passport")
    accommodations: Mapped[list[PassportAccommodation]] = relationship(cascade="all, delete-orphan")
