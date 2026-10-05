import jwt
import datetime
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Optional
from src.config import settings
from src.auth import exceptions
from src.personal import models as personal_models
from src.personal import schemas as personal_schemas

password_hash = PasswordHash.recommended()

def check_passwords_match(password: str, hashed_password: str) -> None:
    if not password_hash.verify(password, hashed_password):
        raise exceptions.IncorrectUserOrPassword()

def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

def encode_token(data: dict, expires_delta_minutes: int = 15, key: str = settings.SECRET_KEY) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=expires_delta_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, key, algorithm=settings.ALGORITHM)

def create_access_token(personal: personal_models.Personal) -> str:
    serialized = personal_schemas.Personal.model_validate(personal).model_dump_json()
    return encode_token(
        data={"sub": serialized},
        expires_delta_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

async def create_refresh_token(db: Session, personal_id: int) -> str:
    personal = db.scalar(select(personal_models.Personal).where(personal_models.Personal.id == personal_id))
    serialized = personal_schemas.Personal.model_validate(personal).model_dump_json()
    expiration_minutes = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60
    return encode_token(
        data={"sub": serialized},
        expires_delta_minutes=expiration_minutes,
        key=settings.REFRESH_SECRET_KEY,
    )

def get_token_settings(key: str, token: str, max_age: int) -> dict:
    return {
        "key": key,
        "value": token,
        "httponly": True,
        "samesite": "lax",
        "secure": settings.SECURE_COOKIES,
        "path": "/",
        "max_age": max_age,
    }

def get_refresh_token_settings(refresh_token: str) -> dict:
    return get_token_settings(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        refresh_token,
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

def get_delete_token_settings() -> dict:
    return {
        "key": settings.REFRESH_TOKEN_COOKIE_NAME,
        "httponly": True,
        "samesite": "lax",
        "secure": settings.SECURE_COOKIES,
        "path": "/"
    }