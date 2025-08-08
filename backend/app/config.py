from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: Literal["local", "prod"] = "local"

    # Local Gemini (AI Studio) API
    google_api_key: str | None = None

    # GCP / Vertex AI
    gcp_project_id: str | None = None
    gcp_location: str = "us-central1"

    # Model choices
    gemini_model: str = "gemini-1.5-pro"

    # CORS / client
    client_origin: str = "http://localhost:5173"


@lru_cache()
def get_settings() -> Settings:
    return Settings()