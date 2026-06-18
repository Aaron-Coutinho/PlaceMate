"""
PlaceMate Backend – Plan Router

Handles AI study plan generation, storage, and retrieval.
Uses Gemini 1.5 Flash via ai_service for plan creation.
"""

import asyncio
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db
from app.models.schemas import PlanConfig, PlanResponse
from app.services.ai_service import generate_study_plan, generate_detailed_notes, RateLimitError
from app.services.youtube_service import fetch_videos_for_topic
from app.services.mcq_service import generate_mcqs_for_day

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
            "notes": "",         # Generated on-demand when day is opened
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

    subject = day_data.get("subject", "")
    topics = day_data.get("topics", [])
    youtube_query = day_data.get("youtube_query", "")

    needs_notes  = not day_data.get("notes")
    needs_mcqs   = not day_data.get("mcqs")
    needs_videos = not day_data.get("videos") and bool(youtube_query)

    # ── Nothing to generate — return immediately ─────────────────────
    if not (needs_notes or needs_mcqs or needs_videos):
        return day_data

    # ── Build coroutines for parallel execution ──────────────────────
    async def _get_notes():
        if not needs_notes:
            return day_data.get("notes", "")
        logger.info(f"[Gemini] Generating notes: plan={plan_id}, day={day_number}")
        return await generate_detailed_notes(subject=subject, topics=topics)

    async def _get_mcqs():
        if not needs_mcqs:
            return day_data.get("mcqs", [])
        logger.info(f"[Groq]   Generating MCQs:  plan={plan_id}, day={day_number}")
        return await generate_mcqs_for_day(subject=subject, topics=topics)

    async def _get_videos():
        if not needs_videos:
            return day_data.get("videos", [])
        logger.info(f"[YouTube] Fetching videos: plan={plan_id}, day={day_number}")
        # fetch_videos_for_topic is sync — run in thread pool to avoid blocking event loop
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, fetch_videos_for_topic, youtube_query)

    # ── Fire all three in parallel ──────────────────────────────────
    results = await asyncio.gather(
        _get_notes(),
        _get_mcqs(),
        _get_videos(),
        return_exceptions=True,   # don't let one failure cancel the others
    )

    notes_result, mcqs_result, videos_result = results
    updates: dict = {}

    # ── Process notes result ───────────────────────────────────────
    if needs_notes:
        if isinstance(notes_result, RateLimitError):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "message": f"AI is busy. Please wait {notes_result.retry_after} seconds and try again.",
                    "retry_after": notes_result.retry_after,
                    "reason": "rate_limit",
                },
            )
        elif isinstance(notes_result, Exception):
            # Already logged in ai_service
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate study notes for Day {day_number}. Please try again.",
            )
        else:
            updates["notes"] = notes_result
            day_data["notes"] = notes_result

    # ── Process MCQs result (non-fatal) ────────────────────────────
    if needs_mcqs:
        if isinstance(mcqs_result, RateLimitError):
            logger.warning(f"[Groq] MCQs skipped — rate limit: plan={plan_id}, day={day_number}")
            day_data["mcqs"] = []
        elif isinstance(mcqs_result, Exception):
            logger.error(f"[Groq] MCQ generation error: {mcqs_result}")
            day_data["mcqs"] = []
        else:
            updates["mcqs"] = mcqs_result
            day_data["mcqs"] = mcqs_result

    # ── Process videos result (non-fatal) ──────────────────────────
    if needs_videos:
        if isinstance(videos_result, Exception):
            logger.error(f"[YouTube] Video fetch error: {videos_result}")
            day_data["videos"] = []
        else:
            updates["videos"] = videos_result
            day_data["videos"] = videos_result

    # ── Persist all new fields in one Firestore write ────────────────
    if updates:
        day_ref.update(updates)

    return day_data
