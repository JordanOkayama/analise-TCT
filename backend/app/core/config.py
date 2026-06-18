from functools import lru_cache
import os
from pydantic import BaseModel


DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return DEFAULT_CORS_ORIGINS
    return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]


class Settings(BaseModel):
    app_name: str = "PsicoEdu Analytics API"
    api_prefix: str = "/api"
    cors_origins: list[str] = _parse_origins(os.getenv("FRONTEND_ORIGINS"))
    max_upload_mb: int = 25


@lru_cache
def get_settings() -> Settings:
    return Settings()
