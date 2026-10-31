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


class PassportUpdate(BaseModel):
    accommodations: list[str] = Field(
        default_factory=list, max_length=50, description="Accommodation ids, e.g. 'asl-interpreter'"
    )
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("notes", mode="before")
    @classmethod
    def _blank_to_none(cls, value):
        if isinstance(value, str):
            return value.strip() or None
        return value


class PassportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    accommodations: list[AccommodationRead]
    notes: str | None
    updated_at: datetime | None = Field(description="None until the passport is first saved.")


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
