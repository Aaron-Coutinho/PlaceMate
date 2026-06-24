"""
PlaceMate Backend – Content Router

Handles day completion and content enrichment.
Video and MCQ endpoints will be expanded in Phase 3.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["Day Content"])

class CompleteDayRequest(BaseModel):
    mcq_score: Optional[str] = None


@router.post("/plan/{plan_id}/day/{day_number}/complete")
async def complete_day(
    plan_id: str, 
    day_number: int, 
    body: CompleteDayRequest = None,
    uid: str = Depends(get_current_uid)
):
    """
    Mark a day as completed and unlock the next day.

    The frontend should call this after the user has:
    1. Watched all videos
    2. Read the notes
    3. Attempted all MCQs
    """
    db = get_db()
    plan_ref = (
        db.collection("users")
        .document(uid)
        .collection("plans")
        .document(plan_id)
    )

    # Verify plan exists
    plan_doc = plan_ref.get()
    if not plan_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    # Mark current day as completed
    current_day_ref = plan_ref.collection("days_content").document(
        f"day_{day_number}"
    )
    current_day_doc = current_day_ref.get()

    if not current_day_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day {day_number} not found",
        )

    current_day_data = current_day_doc.to_dict()
    if not current_day_data.get("is_unlocked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Day {day_number} is locked",
        )

    if current_day_data.get("is_completed", False):
        return {"message": f"Day {day_number} was already completed"}

    # Complete current day
    update_data = {"is_completed": True}
    if body and body.mcq_score:
        update_data["mcq_score"] = body.mcq_score
    
    current_day_ref.update(update_data)

    # Unlock next day
    next_day_number = day_number + 1
    total_days = plan_doc.to_dict().get("days", 0)

    if next_day_number <= total_days:
        next_day_ref = plan_ref.collection("days_content").document(
            f"day_{next_day_number}"
        )
        next_day_doc = next_day_ref.get()
        if next_day_doc.exists:
            next_day_ref.update({"is_unlocked": True})
            logger.info(f"Day {next_day_number} unlocked for plan {plan_id}")

    logger.info(
        f"Day {day_number} completed for plan {plan_id}, user {uid}"
    )

    return {
        "message": f"Day {day_number} completed!",
        "next_day_unlocked": next_day_number <= total_days,
        "next_day": next_day_number if next_day_number <= total_days else None,
    }
