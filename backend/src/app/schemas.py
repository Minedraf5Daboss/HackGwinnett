"""Request/response models."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    """Editable profile fields. Omitted fields are left as-is; blank strings clear a field."""

    full_name: str | None = Field(default=None, max_length=200)
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=30)
    emergency_contact_name: str | None = Field(default=None, max_length=200)
    emergency_contact_phone: str | None = Field(default=None, max_length=30)
    allergies: str | None = Field(default=None, max_length=2000)
    medications: str | None = Field(default=None, max_length=2000)
    conditions: str | None = Field(default=None, max_length=2000)

    @field_validator("*", mode="before")
    @classmethod
    def _blank_to_none(cls, value):
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("date_of_birth")
    @classmethod
    def _not_in_future(cls, value: date | None) -> date | None:
        if value and value > date.today():
            raise ValueError("date of birth can't be in the future")
        return value


class ProfileRead(ProfileUpdate):
    model_config = ConfigDict(from_attributes=True)

    updated_at: datetime


class AccommodationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    category: str
    description: str


class ClinicAccommodationRead(BaseModel):
    """An accommodation as shown on a clinic's badge, with the clinic's own note."""

    id: str
    label: str
    category: str
    note: str | None


class ClinicMatch(BaseModel):
    """How well a clinic meets a list of needs."""

    met: list[str] = Field(description="Accommodation ids the clinic offers.")
    missing: list[str] = Field(description="Accommodation ids the clinic doesn't offer.")
    missing_must_haves: list[str] = Field(
        description="The ids in `missing` that are must-haves. Empty if the clinic meets them all."
    )
    score: float = Field(description="Share of needs met (must-haves and nice-to-haves), 0 to 1.")


class ClinicRead(BaseModel):
    id: str
    name: str
    type: str
    street: str
    city: str
    state: str
    zip: str
    phone: str
    hours: str | None
    latitude: float
    longitude: float
    accommodations: list[ClinicAccommodationRead]
    distance_miles: float | None = Field(
        default=None, description="Only set when you search with `lat` and `lng`."
    )
    match: ClinicMatch | None = Field(
        default=None,
        description="Only set when ranking against needs (see `needs` and `nice_to_have`).",
    )


class PassportAccommodationUpdate(BaseModel):
    id: str = Field(description="e.g. 'asl-interpreter'")
    must_have: bool = Field(default=True, description="False if it's only nice to have.")


class PassportUpdate(BaseModel):
    accommodations: list[str | PassportAccommodationUpdate] = Field(
        default_factory=list,
        max_length=50,
        description=(
            "Accommodation ids, e.g. 'asl-interpreter', which are must-haves. For one that's only "
            "nice to have, send {'id': ..., 'must_have': false} instead of the id."
        ),
    )
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("notes", mode="before")
    @classmethod
    def _blank_to_none(cls, value):
        if isinstance(value, str):
            return value.strip() or None
        return value


class PassportAccommodationRead(AccommodationRead):
    must_have: bool = Field(description="False if it's only nice to have.")


class PassportRead(BaseModel):
    accommodations: list[PassportAccommodationRead]
    notes: str | None
    updated_at: datetime | None = Field(description="None until the passport is first saved.")
    share_token: str | None = Field(
        default=None, description="Set while a share link is on (see POST /passport/share)."
    )
    share_include_name: bool = Field(
        default=True, description="Whether the shared passport shows your name."
    )


class PassportShareCreate(BaseModel):
    include_name: bool = Field(
        default=True, description="Show the full name from your profile on the shared passport."
    )


class PassportShareRead(BaseModel):
    token: str = Field(description="Put this in a link; see GET /shared-passports/{token}.")
    include_name: bool


class SharedPassportRead(BaseModel):
    """The read-only passport anyone with the link can see."""

    name: str | None
    accommodations: list[PassportAccommodationRead]
    notes: str | None
    updated_at: datetime


class SimplifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)

    @field_validator("text")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text can't be blank")
        return value


class SimplifiedTerm(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    term: str = Field(description="The term as it first appeared in the text.")
    plain: str
    count: int


class SimplifyResponse(BaseModel):
    simplified: str
    terms: list[SimplifiedTerm]
