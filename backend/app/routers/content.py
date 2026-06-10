"""
PlaceMate Backend – Content Router (Stub)

Will be fully implemented in Phase 3. Endpoints for day content retrieval.
"""

from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_uid

router = APIRouter(prefix="/plan", tags=["Day Content"])


@router.get("/{plan_id}/day/{day_number}")
async def get_day_content(
    plan_id: str, day_number: int, uid: str = Depends(get_current_uid)
):
    """Get full day content (videos, notes, MCQs). [Phase 3 implementation]"""
    return {
        "message": "Day content endpoint — coming in Phase 3",
        "plan_id": plan_id,
        "day": day_number,
    }


@router.post("/{plan_id}/day/{day_number}/complete")
async def complete_day(
    plan_id: str, day_number: int, uid: str = Depends(get_current_uid)
):
    """Mark a day as completed and unlock the next. [Phase 3 implementation]"""
    return {
        "message": "Day completion endpoint — coming in Phase 3",
        "plan_id": plan_id,
        "day": day_number,
    }
