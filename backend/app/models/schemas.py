"""
PlaceMate Backend – Pydantic Models

All request/response schemas for the API. These models enforce validation
and provide clear API documentation via FastAPI's auto-generated OpenAPI spec.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Subject(str, Enum):
    DSA = "DSA"
    OS = "OS"
    DBMS = "DBMS"
    CN = "CN"
    APTITUDE = "Aptitude"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ---------------------------------------------------------------------------
# Assessment Test Models
# ---------------------------------------------------------------------------

class Question(BaseModel):
    """A single MCQ question from the question bank."""
    id: str
    subject: Subject
    topic: str
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    difficulty: Difficulty


class QuestionWithAnswer(Question):
    """Question with the correct answer (backend only, never sent to client)."""
    correct_answer: str


class AnswerSubmission(BaseModel):
    """User's submitted test answers."""
    answers: dict[str, str] = Field(
        ...,
        description="Mapping of question_id -> selected option (e.g., 'A', 'B', 'C', 'D')",
    )


class SubjectScore(BaseModel):
    """Score for a single subject."""
    subject: str
    correct: int
    total: int
    percentage: float


class TestResult(BaseModel):
    """Complete test result returned after submission."""
    test_id: str
    subject_scores: list[SubjectScore]
    overall_percentage: float
    weak_subjects: list[str]


# ---------------------------------------------------------------------------
# Plan Configuration & Generation Models
# ---------------------------------------------------------------------------

class PlanConfig(BaseModel):
    """User's study plan configuration input."""
    weak_subjects: list[str] = Field(..., min_length=1)
    topics: list[str] = Field(..., min_length=1)
    days: int = Field(..., ge=1, le=390)
    hours_per_day: int = Field(..., ge=1, le=8)


class DayPlan(BaseModel):
    """A single day's plan as returned by the AI."""
    day: int
    subject: str
    topics: list[str]
    learning_objectives: list[str]
    notes_summary: str
    youtube_search_query: str


class PlanResponse(BaseModel):
    """Response after plan generation."""
    plan_id: str
    days: int
    message: str = "Study plan generated successfully"


# ---------------------------------------------------------------------------
# Day Content Models
# ---------------------------------------------------------------------------

class VideoResource(BaseModel):
    """A curated YouTube video."""
    title: str
    video_id: str
    thumbnail: str
    channel: str


class MCQQuestion(BaseModel):
    """A Gemini-generated MCQ for daily practice."""
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct: str
    explanation: str


class DayContent(BaseModel):
    """Full content for a single study day."""
    day_number: int
    subject: str
    topics: list[str]
    notes: str
    videos: list[VideoResource] = []
    mcqs: list[MCQQuestion] = []
    is_unlocked: bool = False
    is_completed: bool = False


# ---------------------------------------------------------------------------
# Progress Models
# ---------------------------------------------------------------------------

class UserProgress(BaseModel):
    """Aggregated user progress data."""
    current_plan_id: Optional[str] = None
    total_days: int = 0
    days_completed: int = 0
    completion_percentage: float = 0.0
    mcq_scores: dict[str, str] = {}
    last_active: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth Models
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    """User profile stored in Firestore."""
    uid: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[str] = None
    current_plan_id: Optional[str] = None
