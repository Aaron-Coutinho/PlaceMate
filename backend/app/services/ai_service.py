"""
PlaceMate Backend – AI Service (Gemini 2.0 Flash Lite)

Handles study plan generation and notes summarization using Google's
Gemini 2.0 Flash Lite model via the new `google-genai` SDK.

Model choice: gemini-2.0-flash-lite
  - Free-tier safe: 1500 RPD, 30 RPM, no billing required
  - Sufficient for plan/notes/MCQ generation tasks
  - gemini-2.0-flash and gemini-2.5-flash require billing enabled

For large plans (>15 days), the generation is split into batches of 15
to stay within the 8192 token output limit and avoid JSON truncation.
"""

import asyncio
import json
import logging
import re
from typing import Any

from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)


class RateLimitError(Exception):
    """Raised when Gemini returns a 429 quota-exhausted response."""

    def __init__(self, retry_after: int = 60) -> None:
        self.retry_after = retry_after  # seconds to wait before retrying
        super().__init__(f"Gemini rate limit hit — retry after {retry_after}s")

# ---------------------------------------------------------------------------
# Gemini client initialization
# ---------------------------------------------------------------------------

_client = None

MODEL_ID = "gemini-2.5-flash-lite"

# Max days per AI call to stay within the 8192 output token limit.
# Since notes are removed, each day object is ~100-150 tokens, so 50 days ≈ 5000-7500 tokens.
BATCH_SIZE = 50


def _get_client() -> genai.Client:
    """Lazy-initialize the Gemini client (new google-genai SDK)."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _generation_config() -> types.GenerateContentConfig:
    """Shared generation config for all AI calls."""
    return types.GenerateContentConfig(
        temperature=0.7,
        top_p=0.9,
        max_output_tokens=8192,
    )


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------


def _build_plan_prompt(
    weak_subjects: list[str],
    topics: list[str],
    total_days: int,
    hours_per_day: int,
    batch_start: int,
    batch_end: int,
) -> str:
    """Build the study plan generation prompt for a specific batch of days."""
    batch_count = batch_end - batch_start + 1

    return f"""You are an expert placement preparation coach.

Generate days {batch_start} to {batch_end} (total {batch_count} days) of a {total_days}-day study plan.

Context:
- Weak subjects: {', '.join(weak_subjects)}
- Topics to cover: {', '.join(topics)}
- Study time: {hours_per_day} hours per day

Return a valid JSON array of exactly {batch_count} day objects with this structure:
[
  {{
    "day": {batch_start},
    "subject": "DSA",
    "topics": ["Arrays", "Linked Lists"],
    "learning_objectives": ["Understand time complexity", "Solve 2-pointer problems"],
    "youtube_search_query": "DSA Arrays Linked Lists placement interview tutorial"
  }}
]

Rules:
1. Day numbers must range sequentially from {batch_start} to {batch_end}.
2. Distribute topics across the plan based on the total duration:
   - **Extreme Short Case (1-3 days)**: If total study time is very limited (e.g. 1 day with 1 hour) and the user has selected many subjects/topics, DO NOT try to cram everything. Choose ONLY the most critical, high-yield placement topics (e.g. important Arrays/Linked Lists for DSA, basic SQL for DBMS, process states for OS) that a student can realistically grasp in the given time.
   - **Short/Medium Case (4-30 days)**: Distribute all selected topics evenly, moving from basic to advanced.
   - **Long Case (31-390 days)**: Since there are more days than topics, spread them out. Dedicate specific days/weeks to deep dives, solving complex practice problems, revision of previous days, advanced topics, and mock interview questions. Ensure the schedule spans the entire {total_days} days.
3. Each day covers 1-2 closely related topics.
4. youtube_search_query: specific and concise for finding tutorial videos.
5. learning_objectives: 2-4 actionable learning targets for the day.
6. Return ONLY the JSON array. Do not wrap in ```json or any other text, just raw valid JSON."""


# ---------------------------------------------------------------------------
# Core generation functions
# ---------------------------------------------------------------------------


def _parse_json_response(raw_text: str) -> list[dict[str, Any]]:
    """Strip markdown fences and parse Gemini's response as a JSON array."""
    text = raw_text.strip()

    # Strip ```json ... ``` or ``` ... ``` fences
    if text.startswith("```"):
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()
    result = json.loads(text)

    if not isinstance(result, list):
        raise ValueError("Gemini response is not a JSON array")

    return result


async def generate_study_plan(
    weak_subjects: list[str],
    topics: list[str],
    days: int,
    hours_per_day: int,
) -> list[dict[str, Any]]:
    """
    Generate a complete N-day study plan using Gemini.

    Splits generation into batches of BATCH_SIZE days to prevent JSON truncation
    and handle long timelines (up to 390 days) smoothly.

    Returns a list of day plan dicts, each containing:
    - day, subject, topics, learning_objectives, youtube_search_query
    """
    client = _get_client()

    # Cap days at 390 to prevent absurd plans
    days = min(days, 390)

    logger.info(
        f"Generating {days}-day plan for subjects={weak_subjects}, topics={topics}"
    )

    all_days: list[dict[str, Any]] = []

    # Split into batches
    batch_start = 1
    while batch_start <= days:
        batch_end = min(batch_start + BATCH_SIZE - 1, days)

        prompt = _build_plan_prompt(
            weak_subjects, topics, days, hours_per_day, batch_start, batch_end
        )

        logger.info(f"  Requesting batch: days {batch_start}-{batch_end}")

        try:
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=prompt,
                config=_generation_config(),
            )
            batch_plan = _parse_json_response(response.text)

            # Validate structure
            for day_item in batch_plan:
                required_keys = {
                    "day", "subject", "topics", "learning_objectives",
                    "youtube_search_query",
                }
                missing = required_keys - set(day_item.keys())
                if missing:
                    raise ValueError(
                        f"Day {day_item.get('day', '?')} missing keys: {missing}"
                    )

            all_days.extend(batch_plan)

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini JSON (batch {batch_start}-{batch_end}): {e}"
            )
            raise ValueError(
                "AI returned invalid JSON. Please try generating the plan again."
            ) from e

        batch_start = batch_end + 1

    logger.info(f"Successfully generated {len(all_days)}-day study plan")
    return all_days


async def _generate_notes_with_groq(
    subject: str,
    topics: list[str],
    previous_topics: list[str],
) -> str:
    """
    Groq fallback for notes generation (llama-3.3-70b-versatile).
    Called automatically when Gemini is rate-limited or unavailable.
    """
    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)

    prev_context = (
        f"\n\nIMPORTANT: The student has already covered these topics in previous sessions: "
        f"{', '.join(previous_topics)}. Do NOT re-explain those. Focus exclusively on the current topics listed above."
        if previous_topics else ""
    )

    prompt = f"""You are an expert placement preparation tutor.

Generate comprehensive, extremely detailed, and well-structured study notes for the following:
- Subject: {subject}
- Topics: {', '.join(topics)}{prev_context}

The notes should be rich and fully cover the concepts. Ensure you include:
1. **Core Concepts & Definitions**: Thorough explanation of key concepts.
2. **Detailed Code Examples (if relevant to the topics)**: Show well-documented implementation in Python, Java, or C++.
3. **Complexity Analysis**: Clearly explain time and space complexity of algorithms/operations (if applicable).
4. **Common Interview Questions & Patterns**: Highlight what interviewers look for and the common mistakes students make.
5. **Key Formulas/Shortcuts (if relevant)**.

Format requirements:
- Return ONLY clean, professional markdown format
- Be around 500-1000 words in length for depth
- Use bullet points, subheaders, code blocks, and bold text for scanning readability

Return ONLY the markdown notes, no JSON wrappers, no extra conversational preamble."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a precise technical tutor. Return only well-formatted markdown."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=4096,
    )
    return (response.choices[0].message.content or "").strip()


async def generate_detailed_notes(
    subject: str,
    topics: list[str],
    previous_topics: list[str] | None = None,
    _retries: int = 2,
) -> str:
    """
    Generate detailed study notes for a specific day's topics.

    Args:
        subject:          Subject name (e.g. "DSA", "Aptitude")
        topics:           Topics for this day (e.g. ["Binary Search", "Sorting"])
        previous_topics:  Topics already covered for this subject on earlier days.
                          The AI will be told to skip these and focus only on today's topics.
        _retries:         Number of Gemini retries before switching to Groq fallback.

    Flow:
        1. Try Gemini (up to _retries times on 429/503).
        2. If Gemini is exhausted → auto-fallback to Groq.
        3. If Groq also fails → raise RateLimitError.
    """
    client = _get_client()

    prev_context = (
        f"\n\nIMPORTANT: The student has already studied these {subject} topics in previous sessions: "
        f"{', '.join(previous_topics)}. Do NOT re-explain or repeat those concepts. "
        f"Focus exclusively on the current topics listed above."
        if previous_topics else ""
    )

    prompt = f"""You are an expert placement preparation tutor.

Generate comprehensive, extremely detailed, and well-structured study notes for the following:
- Subject: {subject}
- Topics: {', '.join(topics)}{prev_context}

The notes should be rich and fully cover the concepts. Ensure you include:
1. **Core Concepts & Definitions**: Thorough explanation of key concepts.
2. **Detailed Code Examples (if relevant to the topics)**: Show well-documented implementation in Python, Java, or C++.
3. **Complexity Analysis**: Clearly explain time and space complexity of algorithms/operations (if applicable).
4. **Common Interview Questions & Patterns**: Highlight what interviewers look for and the common mistakes students make.
5. **Key Formulas/Shortcuts (if relevant)**.

Format requirements:
- Return ONLY clean, professional markdown format
- Be around 500-1000 words in length for depth
- Use bullet points, subheaders, code blocks, and bold text for scanning readability

Return ONLY the markdown notes, no JSON wrappers, no extra conversational preamble."""

    last_error: Exception | None = None

    for attempt in range(_retries + 1):  # attempt 0, 1, 2
        try:
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=prompt,
                config=_generation_config(),
            )
            logger.info(f"[Gemini] Notes generated successfully for {subject} — {topics}")
            return response.text.strip()

        except Exception as e:
            err_str = str(e)

            # Detect quota-exhausted (429) or high-demand (503)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "503" in err_str or "UNAVAILABLE" in err_str:
                # Parse retryDelay from the error message (e.g. 'retryDelay': '44s')
                match = re.search(r'retryDelay[\'"]?:\s*[\'"]?(\d+)', err_str)
                retry_after = int(match.group(1)) + 2 if match else 60

                if attempt < _retries:
                    logger.warning(
                        f"Notes: Gemini API busy on attempt {attempt + 1}/{_retries + 1}. "
                        f"Waiting {retry_after}s before retry…"
                    )
                    await asyncio.sleep(retry_after)
                    last_error = e
                    continue
                else:
                    # All Gemini retries exhausted — try Groq as fallback
                    logger.warning(
                        f"Notes: Gemini exhausted after {_retries + 1} attempts. "
                        f"Switching to Groq fallback for {subject} — {topics}."
                    )
                    try:
                        notes = await _generate_notes_with_groq(
                            subject=subject,
                            topics=topics,
                            previous_topics=previous_topics or [],
                        )
                        logger.info(f"[Groq Fallback] Notes generated for {subject} — {topics}")
                        return notes
                    except Exception as groq_err:
                        logger.error(f"[Groq Fallback] Notes generation also failed: {groq_err}")
                        raise RateLimitError(retry_after=retry_after) from groq_err
            else:
                # Non-rate-limit error — don't retry, propagate immediately
                logger.error(f"Notes generation failed (non-quota error): {e}")
                raise

    # Should never reach here, but satisfies type checker
    raise last_error or RuntimeError("Notes generation failed unexpectedly")
