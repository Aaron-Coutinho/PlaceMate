"""
PlaceMate Backend – AI Service (Gemini 1.5 Flash)

Handles study plan generation and notes summarization using Google's
Gemini 1.5 Flash model. This is the core intelligence layer of PlaceMate.
"""

import json
import os
import logging
from typing import Any

import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini initialization
# ---------------------------------------------------------------------------

_model = None


def _get_model():
    """Lazy-initialize the Gemini 1.5 Flash model."""
    global _model
    if _model is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Gemini 1.5 Flash — core model for plan/notes/MCQ generation
        _model = genai.GenerativeModel(
            "gemini-1.5-flash",
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                top_p=0.9,
                max_output_tokens=8192,
            ),
        )
    return _model


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------


def _build_plan_prompt(
    weak_subjects: list[str],
    topics: list[str],
    days: int,
    hours_per_day: int,
) -> str:
    """Build the study plan generation prompt."""
    return f"""You are an expert placement preparation coach.

Generate a {days}-day personalized study plan for the following:
- Weak subjects: {', '.join(weak_subjects)}
- Topics to cover: {', '.join(topics)}
- Study time: {hours_per_day} hours per day

Return a valid JSON array of {days} day objects with this exact structure:
[
  {{
    "day": 1,
    "subject": "DSA",
    "topics": ["Arrays", "Linked Lists"],
    "learning_objectives": ["Understand time complexity", "Solve 2-pointer problems"],
    "notes_summary": "A comprehensive 8-15 line summary of today's topics. Include key definitions, important formulas or rules, common patterns, and practical tips. This should be self-contained — a student should be able to review just this summary and understand the core concepts.",
    "youtube_search_query": "DSA Arrays Linked Lists for placement interviews"
  }},
  ...
]

Rules:
- Distribute topics evenly across days
- Progress from fundamentals to advanced concepts
- Each day covers 1-2 closely related topics only
- Notes summary must be self-contained, detailed, and clear (8-15 lines minimum)
- youtube_search_query must be specific and concise for finding relevant tutorial videos
- learning_objectives should be 2-4 actionable items per day
- Ensure every selected topic appears at least once across all days
- Return ONLY the JSON array, no markdown fences or extra text"""


# ---------------------------------------------------------------------------
# Core generation functions
# ---------------------------------------------------------------------------


async def generate_study_plan(
    weak_subjects: list[str],
    topics: list[str],
    days: int,
    hours_per_day: int,
) -> list[dict[str, Any]]:
    """
    Generate a complete N-day study plan using Gemini 1.5 Flash.

    Returns a list of day plan dicts, each containing:
    - day, subject, topics, learning_objectives, notes_summary, youtube_search_query
    """
    model = _get_model()
    prompt = _build_plan_prompt(weak_subjects, topics, days, hours_per_day)

    logger.info(
        f"Generating {days}-day plan for subjects={weak_subjects}, topics={topics}"
    )

    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            # Remove opening fence (```json or ```)
            first_newline = raw_text.index("\n")
            raw_text = raw_text[first_newline + 1 :]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        raw_text = raw_text.strip()
        plan = json.loads(raw_text)

        if not isinstance(plan, list):
            raise ValueError("Gemini response is not a JSON array")

        if len(plan) != days:
            logger.warning(
                f"Expected {days} days but got {len(plan)}. Adjusting..."
            )

        # Validate structure
        for day_item in plan:
            required_keys = {
                "day", "subject", "topics", "learning_objectives",
                "notes_summary", "youtube_search_query",
            }
            missing = required_keys - set(day_item.keys())
            if missing:
                raise ValueError(
                    f"Day {day_item.get('day', '?')} missing keys: {missing}"
                )

        logger.info(f"Successfully generated {len(plan)}-day study plan")
        return plan

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        raise ValueError(
            "AI returned invalid JSON. Please try generating the plan again."
        ) from e
    except Exception as e:
        logger.error(f"Plan generation failed: {e}")
        raise


async def generate_detailed_notes(
    subject: str, topics: list[str]
) -> str:
    """
    Generate detailed study notes for a specific day's topics.

    Returns markdown-formatted notes string.
    """
    model = _get_model()
    prompt = f"""You are an expert placement preparation tutor.

Generate comprehensive, well-structured study notes for the following:
- Subject: {subject}
- Topics: {', '.join(topics)}

The notes should:
1. Be written in clear, student-friendly markdown format
2. Include key definitions and concepts
3. Provide examples where helpful
4. Highlight common interview questions and patterns
5. Include complexity analysis for algorithms (if applicable)
6. Be 300-500 words in length
7. Use bullet points, headers, and code snippets where appropriate

Return ONLY the markdown notes, no JSON wrapping."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Notes generation failed: {e}")
        raise
