"""
PlaceMate Backend – MCQ Generation Service (Groq)

Generates 5 placement-level MCQs per study day using the Groq API
(llama-3.3-70b-versatile). Groq's free tier gives 14,400 RPD vs
Gemini's 20 RPD — effectively unlimited for MCQ generation.

This offloads all MCQ calls from Gemini, preserving the daily Gemini
quota entirely for study notes (which benefit most from Gemini's quality).

Lazy-load + Firestore cache pattern: generated once on first day open,
then served directly from Firestore on subsequent visits.
"""

import json
import logging
from typing import Any

from groq import Groq, RateLimitError as GroqRateLimitError

from app.config import settings
from app.services.ai_service import RateLimitError

logger = logging.getLogger(__name__)

# Groq model — llama-3.3-70b is excellent at structured JSON output
GROQ_MODEL = "llama-3.3-70b-versatile"
MCQ_COUNT = 5

_groq_client: Groq | None = None


def _get_client() -> Groq:
    """Lazy-initialize the Groq client."""
    global _groq_client
    if _groq_client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to your .env file."
            )
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def _parse_json_response(raw_text: str) -> list[dict[str, Any]]:
    """Strip markdown fences and parse as a JSON array."""
    text = raw_text.strip()
    if text.startswith("```"):
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    result = json.loads(text)
    if not isinstance(result, list):
        raise ValueError("MCQ response is not a JSON array")
    return result


async def generate_mcqs_for_day(
    subject: str,
    topics: list[str],
    count: int = MCQ_COUNT,
    difficulty: str = "medium",
) -> list[dict[str, Any]]:
    """
    Generate placement-level MCQs using Groq (llama-3.3-70b-versatile).

    Args:
        subject:    Subject name.
        topics:     Topics for this day.
        count:      Number of MCQs to generate (default 5).
        difficulty: "easy" | "medium" | "hard" (default "medium").

    Returns a list of MCQ dicts with: question, options (4), correct (A-D), explanation.
    Raises:
        RateLimitError  — if Groq rate limit is hit
        ValueError      — if response JSON is malformed
    """
    client = _get_client()

    difficulty_guidance = {
        "easy": "Focus on basic definitions, simple recall, and foundational concepts. Suitable for beginners.",
        "medium": "Focus on application and understanding. Mix conceptual and practical questions at placement exam level.",
        "hard": "Focus on tricky edge cases, complex analysis, and advanced scenarios. Suitable for FAANG-level preparation.",
    }.get(difficulty.lower(), "Focus on application and understanding at placement exam level.")

    prompt = f"""You are an expert placement exam question writer.

Generate exactly {count} multiple choice questions on:
- Subject: {subject}
- Topics: {', '.join(topics)}
- Difficulty: {difficulty.upper()} — {difficulty_guidance}

Return a valid JSON array of exactly {count} objects with this structure:
[
  {{
    "question": "What is the time complexity of binary search?",
    "options": ["A. O(n)", "B. O(log n)", "C. O(n log n)", "D. O(1)"],
    "correct": "B",
    "explanation": "Binary search halves the search space at each step, giving O(log n) complexity."
  }}
]

Rules:
1. Each question has exactly 4 options labeled A, B, C, D.
2. "correct" is a single letter: A, B, C, or D.
3. "explanation" is 1-2 sentences explaining why that answer is correct.
4. Cover different aspects across all {count} questions — no repeated concepts.
5. Return ONLY the raw JSON array. No markdown fences, no preamble, no extra text."""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise JSON-generating assistant. Always return only valid JSON with no extra text.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            max_tokens=4096,
        )

        raw_text = response.choices[0].message.content or ""
        mcqs = _parse_json_response(raw_text)

        # Validate structure
        for mcq in mcqs:
            required = {"question", "options", "correct", "explanation"}
            missing = required - set(mcq.keys())
            if missing:
                raise ValueError(f"MCQ missing keys: {missing}")
            if len(mcq.get("options", [])) != 4:
                raise ValueError("MCQ must have exactly 4 options")
            if mcq.get("correct") not in ("A", "B", "C", "D"):
                raise ValueError(f"Invalid correct value: {mcq.get('correct')}")

        logger.info(
            f"[Groq] Generated {len(mcqs)} MCQs for {subject} – {topics}"
        )
        return mcqs

    except GroqRateLimitError as e:
        logger.warning(f"[Groq] Rate limit hit for MCQs: {e}")
        raise RateLimitError(retry_after=60) from e

    except json.JSONDecodeError as e:
        logger.error(f"[Groq] Failed to parse MCQ JSON: {e}")
        raise ValueError("Groq returned invalid JSON for MCQs.") from e

    except Exception as e:
        logger.error(f"[Groq] MCQ generation failed: {e}")
        raise
