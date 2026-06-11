"""
PlaceMate Backend – Plan Router

Handles AI study plan generation, storage, and retrieval.
Uses Gemini 1.5 Flash via ai_service for plan creation.
"""

import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db
from app.models.schemas import PlanConfig, PlanResponse
from app.services.ai_service import generate_study_plan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plan", tags=["Study Plan"])


@router.post("/generate", response_model=PlanResponse)
async def generate_plan(
    config: PlanConfig,
    background_tasks: BackgroundTasks,
    uid: str = Depends(get_current_uid),
):
    """
    Generate an AI-powered study plan using Gemini 1.5 Flash.

    Accepts weak subjects, selected topics, number of days, and hours per day.
    Creates the plan in Firestore and returns the plan_id.
    YouTube video fetching and MCQ generation are deferred to background tasks (Phase 3).
    """
    db = get_db()

    try:
        # Generate plan using Gemini
        plan_data = await generate_study_plan(
            weak_subjects=config.weak_subjects,
            topics=config.topics,
            days=config.days,
            hours_per_day=config.hours_per_day,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Plan generation failed for uid={uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate study plan. Please try again.",
        )

    # Store plan metadata in Firestore
    plan_id = str(uuid.uuid4())
    plan_ref = db.collection("users").document(uid).collection("plans").document(plan_id)

    plan_metadata = {
        "plan_id": plan_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "days": config.days,
        "hours_per_day": config.hours_per_day,
        "weak_subjects": config.weak_subjects,
        "selected_topics": config.topics,
        "status": "active",
    }
    plan_ref.set(plan_metadata)

    # Store each day's content as a subcollection document
    for day_item in plan_data:
        day_number = day_item.get("day", 0)
        day_doc_id = f"day_{day_number}"

        day_content = {
            "day_number": day_number,
            "subject": day_item.get("subject", ""),
            "topics": day_item.get("topics", []),
            "learning_objectives": day_item.get("learning_objectives", []),
            "notes": day_item.get("notes_summary", ""),
            "youtube_query": day_item.get("youtube_search_query", ""),
            "videos": [],        # Populated in Phase 3 (YouTube API)
            "mcqs": [],          # Populated in Phase 3 (MCQ generation)
            "is_unlocked": day_number == 1,  # Only Day 1 is unlocked initially
            "is_completed": False,
        }
        plan_ref.collection("days_content").document(day_doc_id).set(day_content)

    # Update user's current plan reference
    db.collection("users").document(uid).update({"current_plan_id": plan_id})

    logger.info(f"Plan {plan_id} created for user {uid} with {config.days} days")

    return PlanResponse(
        plan_id=plan_id,
        days=config.days,
        message=f"Study plan generated successfully! {config.days} days of content ready.",
    )


@router.get("/{plan_id}")
async def get_plan(plan_id: str, uid: str = Depends(get_current_uid)):
    """
    Fetch a complete study plan with all day summaries and statuses.
    """
    db = get_db()
    plan_ref = db.collection("users").document(uid).collection("plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    plan_data = plan_doc.to_dict()

    # Fetch all days
    days_docs = plan_ref.collection("days_content").order_by("day_number").stream()
    days = []
    for doc in days_docs:
        day_data = doc.to_dict()
        days.append({
            "day_number": day_data.get("day_number"),
            "subject": day_data.get("subject"),
            "topics": day_data.get("topics", []),
            "learning_objectives": day_data.get("learning_objectives", []),
            "is_unlocked": day_data.get("is_unlocked", False),
            "is_completed": day_data.get("is_completed", False),
        })

    return {
        **plan_data,
        "days": days,
    }


@router.get("/{plan_id}/day/{day_number}")
async def get_day_detail(
    plan_id: str, day_number: int, uid: str = Depends(get_current_uid)
):
    """
    Fetch full content for a specific day (notes, videos, MCQs, status).
    """
    db = get_db()
    day_ref = (
        db.collection("users")
        .document(uid)
        .collection("plans")
        .document(plan_id)
        .collection("days_content")
        .document(f"day_{day_number}")
    )
    day_doc = day_ref.get()

    if not day_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day {day_number} not found in this plan",
        )

    day_data = day_doc.to_dict()

    if not day_data.get("is_unlocked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Day {day_number} is locked. Complete the previous day first.",
        )

    return day_data
