"""
PlaceMate Backend – Plan Router (Stub)

Will be fully implemented in Phase 2. Endpoints for AI study plan generation.
"""

from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_uid

router = APIRouter(prefix="/plan", tags=["Study Plan"])


@router.post("/generate")
async def generate_plan(uid: str = Depends(get_current_uid)):
    """Generate an AI-powered study plan. [Phase 2 implementation]"""
    return {"message": "Plan generation endpoint — coming in Phase 2", "uid": uid}


@router.get("/{plan_id}")
async def get_plan(plan_id: str, uid: str = Depends(get_current_uid)):
    """Fetch a complete study plan. [Phase 2 implementation]"""
    return {"message": "Plan fetch endpoint — coming in Phase 2", "plan_id": plan_id}
