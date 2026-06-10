"""
PlaceMate Backend – Progress Router (Stub)

Will be fully implemented in Phase 4. Endpoints for progress tracking.
"""

from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_uid

router = APIRouter(prefix="/progress", tags=["Progress Tracking"])


@router.get("/")
async def get_progress(uid: str = Depends(get_current_uid)):
    """Fetch user's overall progress. [Phase 4 implementation]"""
    return {"message": "Progress endpoint — coming in Phase 4", "uid": uid}
