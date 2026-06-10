"""
PlaceMate Backend – Application Configuration

Loads environment variables and exposes them as a typed settings object.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


class Settings:
    """Centralized config loaded from environment variables."""

    # Firebase
    FIREBASE_SERVICE_ACCOUNT: str = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json"
    )

    # Gemini AI (core model: 1.5 Flash)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # YouTube Data API v3
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(
        ","
    )


settings = Settings()
