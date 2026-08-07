"""
PlaceMate Backend – Main Application Entry Point

FastAPI application with CORS, Firebase initialization, and router registration.
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.firebase_init import init_firebase
from app.routers import auth, test, plan, content, progress


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Firebase on startup."""
    init_firebase()
    print("✅ Firebase Admin SDK initialized")
    print(f"🚀 PlaceMate API running on {settings.HOST}:{settings.PORT}")
    yield
    print("👋 Shutting down PlaceMate API")


app = FastAPI(
    title="PlaceMate API",
    description="AI-powered placement preparation platform — personalized study plans, "
    "assessment tests, curated videos, and MCQ practice.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend to call the API
cors_origins = settings.CORS_ORIGINS

if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Register routers
app.include_router(auth.router)
app.include_router(test.router)
app.include_router(plan.router)
app.include_router(content.router)
app.include_router(progress.router)


@app.get("/", tags=["Health"])
async def health_check():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "app": "PlaceMate API",
        "version": "0.1.0",
    }
