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

    # Gemini AI (core model: gemini-2.5-flash-lite)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Groq AI (MCQ generation — 14,400 RPD free tier)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # YouTube Data API v3
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    @property
    def CORS_ORIGINS(self) -> list[str]:
        raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://place-mate-rho.vercel.app")
        origins = []
        for item in raw.split(","):
            cleaned = item.strip().strip('"').strip("'").rstrip("/")
            if cleaned:
                origins.append(cleaned)
        # Always include the active Vercel domain as fallback
        if "https://place-mate-rho.vercel.app" not in origins and "*" not in origins:
            origins.append("https://place-mate-rho.vercel.app")
        return origins



settings = Settings()
