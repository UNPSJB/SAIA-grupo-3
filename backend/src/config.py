import logging
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DB_URL: str
    DB_URL_TEST: str
    ENV: str = "DEV"
    ROOT_PATH_DEVELOPMENT: str = ""
    ROOT_PATH_PRODUCTION: str = ""
    LOG_LEVEL: str = "INFO"
    SCHEDULER_ACTIVO: bool = True

    SECRET_KEY: str = "tu-clave-secreta-para-access-token"
    REFRESH_SECRET_KEY: str = "tu-clave-secreta-para-refresh-token"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    TOKEN_URL: str = "auth/token"
    SECURE_COOKIES: bool = False
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    ACCESS_TOKEN_COOKIE_NAME: str = "access_token"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"

ARCHIVOS_DIR = Path(__file__).resolve().parent.parent / "archivos"