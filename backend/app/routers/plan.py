"""
PlaceMate Backend – Plan Router

Handles AI study plan generation, storage, and retrieval.
Uses Gemini 1.5 Flash via ai_service for plan creation.
"""

import asyncio
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db
from app.models.schemas import PlanConfig, PlanResponse, PlanMetadata
from app.services.ai_service import generate_study_plan, generate_detailed_notes, RateLimitError
from app.services.youtube_service import fetch_videos_for_topic, fetch_videos_for_day
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


@router.get("", response_model=list[PlanMetadata])
async def list_plans(uid: str = Depends(get_current_uid)):
    """
    List all study plans created by the user, ordered by creation time (newest first).
    """
    db = get_db()
    plans_ref = db.collection("users").document(uid).collection("plans")
    docs = plans_ref.stream()

    plans = []
    for doc in docs:
        data = doc.to_dict()
        if "plan_id" not in data:
            data["plan_id"] = doc.id
        if "created_at" not in data:
            data["created_at"] = datetime.now(timezone.utc).isoformat()
        if "days" not in data:
            data["days"] = 0
        if "hours_per_day" not in data:
            data["hours_per_day"] = 0
        if "weak_subjects" not in data:
            data["weak_subjects"] = []
        if "selected_topics" not in data:
            data["selected_topics"] = []
        if "status" not in data:
            data["status"] = "active"
        plans.append(data)

    plans.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return [PlanMetadata(**p) for p in plans]


@router.delete("/{plan_id}")
async def delete_plan(plan_id: str, uid: str = Depends(get_current_uid)):
    """
    Delete a study plan and all of its daily contents from Firestore.
    """
    db = get_db()
    user_ref = db.collection("users").document(uid)
    plan_ref = user_ref.collection("plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    # Delete all documents under days_content subcollection
    days_ref = plan_ref.collection("days_content")
    days_docs = days_ref.stream()

    batch = db.batch()
    count = 0
    for doc in days_docs:
        batch.delete(doc.reference)
        count += 1
        if count >= 450:  # Firestore batch limit is 500; keep headroom
            batch.commit()
            batch = db.batch()
            count = 0
    if count > 0:
        batch.commit()

    logger.info(f"Deleted {count} days_content docs for plan {plan_id}")

    # Delete the plan document itself
    plan_ref.delete()
    logger.info(f"Deleted plan document {plan_id} for uid={uid}")

    # If this was the active plan, promote the next most recent plan (or clear)
    user_doc = user_ref.get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    if user_data and user_data.get("current_plan_id") == plan_id:
        # Query remaining plans — deleted plan is already gone from Firestore
        remaining_docs = user_ref.collection("plans").stream()
        remaining: list[dict] = []
        for doc in remaining_docs:
            p_data = doc.to_dict() or {}
            if "plan_id" not in p_data:
                p_data["plan_id"] = doc.id
            if "created_at" in p_data:
                remaining.append(p_data)

        if remaining:
            remaining.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            new_active_id = remaining[0]["plan_id"]
            user_ref.update({"current_plan_id": new_active_id})
            logger.info(f"Active plan auto-switched to {new_active_id} for uid={uid}")
        else:
            user_ref.update({"current_plan_id": None})
            logger.info(f"No remaining plans — current_plan_id cleared for uid={uid}")

    return {"message": "Plan deleted successfully"}


@router.post("/{plan_id}/activate")
async def activate_plan(plan_id: str, uid: str = Depends(get_current_uid)):
    """
    Set a study plan as the user's active plan.
    """
    db = get_db()
    user_ref = db.collection("users").document(uid)
    plan_ref = user_ref.collection("plans").document(plan_id)
    plan_doc = plan_ref.get()

    if not plan_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )

    user_ref.update({"current_plan_id": plan_id})
    return {"message": "Plan activated successfully", "current_plan_id": plan_id}


@router.get("/study-fact")
async def get_study_fact():
    """
    Get a cool, funny, or interesting study fact or quote generated by Groq.
    """
    from app.services.ai_service import generate_study_fact
    fact = await generate_study_fact()
    return {"fact": fact}


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

    # Ensure user_answers and mcq_score fields are present
    if "user_answers" not in day_data:
        day_data["user_answers"] = []
    if "mcq_score" not in day_data:
        day_data["mcq_score"] = None

    # ── Nothing to generate — return immediately —————————————————————
    if not (needs_notes or needs_mcqs or needs_videos):
        return day_data

    # ── Gather previous topics from same subject for context ————————
    previous_topics: list[str] = []
    if needs_notes:
        try:
            plan_ref = (
                db.collection("users")
                .document(uid)
                .collection("plans")
                .document(plan_id)
            )
            prev_docs = (
                plan_ref.collection("days_content")
                .where("subject", "==", subject)
                .where("day_number", "<", day_number)
                .order_by("day_number")
                .stream()
            )
            for doc in prev_docs:
                d = doc.to_dict()
                previous_topics.extend(d.get("topics", []))
            if previous_topics:
                logger.info(
                    f"[Context] Found {len(previous_topics)} previous {subject} topics "
                    f"for day {day_number}: {previous_topics}"
                )
        except Exception as ctx_err:
            logger.warning(f"[Context] Could not fetch previous topics: {ctx_err}")

    # ── Build coroutines for parallel execution ──────────────────────
    async def _get_notes():
        if not needs_notes:
            return day_data.get("notes", "")
        logger.info(f"[Gemini] Generating notes: plan={plan_id}, day={day_number}")
        return await generate_detailed_notes(
            subject=subject,
            topics=topics,
            previous_topics=previous_topics if previous_topics else None,
        )

    async def _get_mcqs():
        if not needs_mcqs:
            return day_data.get("mcqs", [])
        logger.info(f"[Groq]   Generating MCQs:  plan={plan_id}, day={day_number}")
        return await generate_mcqs_for_day(subject=subject, topics=topics)

    async def _get_videos():
        if not needs_videos:
            return day_data.get("videos", [])
        logger.info(f"[YouTube] Fetching smart curation: plan={plan_id}, day={day_number}")
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, fetch_videos_for_day, subject, topics, 3
        )

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
            # Initialize user_answers with None for each question
            user_ans = [None] * len(mcqs_result)
            updates["user_answers"] = user_ans
            day_data["user_answers"] = user_ans

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


# ---------------------------------------------------------------------------
# On-demand MCQ generation (with difficulty)
# ---------------------------------------------------------------------------

class MCQRequest(BaseModel):
    difficulty: str = "medium"  # "easy" | "medium" | "hard"


@router.post("/{plan_id}/day/{day_number}/mcqs")
async def generate_new_mcqs(
    plan_id: str,
    day_number: int,
    body: MCQRequest,
    uid: str = Depends(get_current_uid),
):
    """
    Generate a fresh set of MCQs for the given day at the requested difficulty.
    Appends them to the existing MCQs in Firestore.
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
            detail=f"Day {day_number} not found",
        )

    day_data = day_doc.to_dict()
    subject = day_data.get("subject", "")
    topics = day_data.get("topics", [])
    difficulty = body.difficulty.lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    existing_mcqs = day_data.get("mcqs", [])
    existing_answers = day_data.get("user_answers", [])
    if existing_answers is None:
        existing_answers = []

    try:
        logger.info(f"[Groq] On-demand MCQs [{difficulty}]: plan={plan_id}, day={day_number}")
        new_mcqs = await generate_mcqs_for_day(
            subject=subject, topics=topics, difficulty=difficulty
        )
        
        # Append new ones to existing list in Firestore
        updated_mcqs = existing_mcqs + new_mcqs
        
        # Match user_answers length by appending None
        updated_answers = list(existing_answers)
        while len(updated_answers) < len(updated_mcqs):
            updated_answers.append(None)
            
        day_ref.update({
            "mcqs": updated_mcqs,
            "user_answers": updated_answers
        })
        
        return {"mcqs": updated_mcqs, "difficulty": difficulty}
    except RateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "message": f"AI is busy. Please wait {e.retry_after} seconds and try again.",
                "retry_after": e.retry_after,
                "reason": "rate_limit",
            },
        )
    except Exception as e:
        logger.error(f"On-demand MCQ generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate MCQs. Please try again.",
        )


class SaveQuizProgressRequest(BaseModel):
    answers: list[Optional[str]]
    score: Optional[str] = None


@router.post("/{plan_id}/day/{day_number}/quiz-progress")
async def save_quiz_progress(
    plan_id: str,
    day_number: int,
    body: SaveQuizProgressRequest,
    uid: str = Depends(get_current_uid),
):
    """
    Save the user's answers and score for the day's MCQs.
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
            detail="Day not found",
        )
        
    update_data = {
        "user_answers": body.answers
    }
    if body.score:
        update_data["mcq_score"] = body.score
        
    day_ref.update(update_data)
    return {"message": "Quiz progress saved successfully"}


# ---------------------------------------------------------------------------
# On-demand extra video fetching
# ---------------------------------------------------------------------------

@router.post("/{plan_id}/day/{day_number}/videos")
async def fetch_more_videos(
    plan_id: str,
    day_number: int,
    uid: str = Depends(get_current_uid),
):
    """
    Fetch 3 more relevant YouTube videos for the given day and append them
    (deduplicated by video_id) to the existing videos in Firestore.
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
            detail=f"Day {day_number} not found",
        )

    day_data = day_doc.to_dict()
    subject = day_data.get("subject", "")
    topics = day_data.get("topics", [])
    existing_videos: list[dict] = day_data.get("videos", []) or []
    existing_ids = {v.get("video_id") for v in existing_videos}

    try:
        loop = asyncio.get_running_loop()
        requested_count = min(len(existing_videos) + 3, 50)
        new_videos = await loop.run_in_executor(
            None, fetch_videos_for_day, subject, topics, requested_count
        )

        # Deduplicate by video_id
        added = [v for v in new_videos if v.get("video_id") not in existing_ids]
        updated_videos = existing_videos + added

        day_ref.update({"videos": updated_videos})
        logger.info(
            f"[YouTube] Added {len(added)} new video(s) for plan={plan_id}, day={day_number}"
        )
        return {"videos": updated_videos, "added": len(added)}

    except Exception as e:
        logger.error(f"[YouTube] Extra video fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch more videos. Please try again.",
        )

