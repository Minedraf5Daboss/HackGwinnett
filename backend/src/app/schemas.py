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
