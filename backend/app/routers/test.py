"""
PlaceMate Backend – Test Router

Serves assessment test questions and processes submissions.
Calculates per-subject scores and identifies weak subjects.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db
from app.models.schemas import (
    AnswerSubmission,
    Question,
    SubjectScore,
    TestResult,
)

router = APIRouter(prefix="/test", tags=["Assessment Test"])

# Number of questions to serve per subject
QUESTIONS_PER_SUBJECT = 4

# Threshold below which a subject is flagged as weak
WEAK_THRESHOLD_PERCENT = 60.0


@router.get("/questions", response_model=list[Question])
async def get_test_questions(uid: str = Depends(get_current_uid)):
    """
    Fetch a mixed set of assessment questions from the question bank.

    Returns QUESTIONS_PER_SUBJECT questions per subject, shuffled.
    The correct_answer field is NOT included in the response.
    """
    import random

    db = get_db()
    questions_ref = db.collection("questions")
    all_docs = questions_ref.stream()

    # Group by subject
    by_subject: dict[str, list[dict]] = {}
    for doc in all_docs:
        data = doc.to_dict()
        data["id"] = doc.id
        subject = data.get("subject", "")
        by_subject.setdefault(subject, []).append(data)

    selected: list[dict] = []
    for subject, questions in by_subject.items():
        random.shuffle(questions)
        selected.extend(questions[:QUESTIONS_PER_SUBJECT])

    random.shuffle(selected)

    # Strip correct_answer before sending to client
    return [
        Question(
            id=q["id"],
            subject=q["subject"],
            topic=q.get("topic", ""),
            question=q["question"],
            options=q["options"],
            difficulty=q.get("difficulty", "medium"),
        )
        for q in selected
    ]


@router.post("/submit", response_model=TestResult)
async def submit_test(
    submission: AnswerSubmission,
    uid: str = Depends(get_current_uid),
):
    """
    Submit test answers and receive per-subject scores + weak subject analysis.

    Skipped questions (not in submission) count the subject as weak automatically
    if ALL of that subject's questions were left unanswered.
    """
    db = get_db()

    question_ids = list(submission.answers.keys())
    if not question_ids and not submission.answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No answers submitted",
        )

    # Fetch correct answers for submitted question IDs
    subject_tally: dict[str, dict[str, int]] = {}  # {subject: {correct, total}}

    for qid, user_answer in submission.answers.items():
        doc = db.collection("questions").document(qid).get()
        if not doc.exists:
            continue

        data = doc.to_dict()
        subject = data.get("subject", "Unknown")
        correct_answer = data.get("correct_answer", "")

        if subject not in subject_tally:
            subject_tally[subject] = {"correct": 0, "total": 0}

        subject_tally[subject]["total"] += 1
        if user_answer.strip().upper() == correct_answer.strip().upper():
            subject_tally[subject]["correct"] += 1

    # Identify subjects where ALL questions were skipped (not in submission).
    # We know which subjects exist from the tally; compare against the full
    # set of known subjects in the question bank.
    all_subjects = {"DSA", "OS", "DBMS", "CN", "Aptitude"}
    attempted_subjects = set(subject_tally.keys())
    fully_skipped_subjects = all_subjects - attempted_subjects

    # Calculate percentages for attempted subjects
    subject_scores: list[SubjectScore] = []
    total_correct = 0
    total_questions = 0

    for subject, counts in subject_tally.items():
        pct = (counts["correct"] / counts["total"] * 100) if counts["total"] > 0 else 0
        subject_scores.append(
            SubjectScore(
                subject=subject,
                correct=counts["correct"],
                total=counts["total"],
                percentage=round(pct, 1),
            )
        )
        total_correct += counts["correct"]
        total_questions += counts["total"]

    overall = (total_correct / total_questions * 100) if total_questions > 0 else 0

    # Identify weak subjects:
    # 1. Score-based: attempted subjects below threshold or average
    # 2. Skipped: entire subject was left unanswered
    weak_subjects = _identify_weak_subjects(
        {s.subject: s.percentage for s in subject_scores},
        fully_skipped=list(fully_skipped_subjects),
    )

    # Store result in Firestore
    test_id = str(uuid.uuid4())
    result_data = {
        "test_id": test_id,
        "subject_scores": [s.model_dump() for s in subject_scores],
        "overall_percentage": round(overall, 1),
        "weak_subjects": weak_subjects,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    db.collection("users").document(uid).collection("testResults").document(
        test_id
    ).set(result_data)

    return TestResult(
        test_id=test_id,
        subject_scores=subject_scores,
        overall_percentage=round(overall, 1),
        weak_subjects=weak_subjects,
    )


def _identify_weak_subjects(
    subject_scores: dict[str, float],
    fully_skipped: list[str] | None = None,
) -> list[str]:
    """
    Flag subjects as weak using two rules:

    1. Score-based (attempted subjects):
       Weak if score < average across all attempted subjects
       OR score < absolute WEAK_THRESHOLD_PERCENT (60%).

    2. Skip-based:
       If ALL questions for a subject were left unanswered, the subject
       is automatically weak (unattempted = unfamiliar with the topic).
    """
    weak: list[str] = list(fully_skipped or [])

    if not subject_scores:
        return weak

    avg = sum(subject_scores.values()) / len(subject_scores)
    weak += [
        subject
        for subject, score in subject_scores.items()
        if score < avg or score < WEAK_THRESHOLD_PERCENT
    ]

    # Deduplicate while preserving order
    seen: set[str] = set()
    result: list[str] = []
    for s in weak:
        if s not in seen:
            seen.add(s)
            result.append(s)
    return result
