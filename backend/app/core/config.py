from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "PsicoEdu Analytics API"
    api_prefix: str = "/api"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    max_upload_mb: int = 25


@lru_cache
def get_settings() -> Settings:
    return Settings()

