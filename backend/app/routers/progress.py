"""
PlaceMate Backend – Progress Router

Endpoints for fetching user's overall progress across their active study plan.
Calculates completion percentage, streaks, and aggregated MCQ scores.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db
from app.models.schemas import UserProgress
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["Progress Tracking"])


@router.get("", response_model=UserProgress)
async def get_progress(uid: str = Depends(get_current_uid)):
    """
    Fetch the user's aggregated progress for their active study plan.
    Dynamically computes percentage and gathers all MCQ scores from the days.
    """
    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        return UserProgress()

    user_data = user_doc.to_dict()
    current_plan_id = user_data.get("current_plan_id")

    if not current_plan_id:
        return UserProgress()

    # Fetch active plan
    plan_ref = user_ref.collection("plans").document(current_plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        # Failsafe if current_plan_id points to a deleted plan
        return UserProgress()

    plan_data = plan_doc.to_dict()
    total_days = plan_data.get("days", 0)
    
    # Fetch all days
    days_ref = plan_ref.collection("days_content").stream()
    
    days_completed = 0
    mcq_scores = {}
    
    for doc in days_ref:
        day_data = doc.to_dict()
        if day_data.get("is_completed"):
            days_completed += 1
        day_num = day_data.get("day_number")
        score = day_data.get("mcq_score")
        if score and day_num is not None:
            mcq_scores[f"day_{day_num}"] = score
                
    completion_percentage = (days_completed / total_days * 100) if total_days > 0 else 0.0

    return UserProgress(
        current_plan_id=current_plan_id,
        total_days=total_days,
        days_completed=days_completed,
        completion_percentage=round(completion_percentage, 1),
        mcq_scores=mcq_scores,
        last_active=None  # Can be derived from a last_login or last_completed timestamp in the future
    )
