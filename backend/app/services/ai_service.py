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
2. Subject and Topic Distribution Guidelines:
   - **Mandatory Subject Coverage**: The plan MUST cover all selected subjects ({', '.join(weak_subjects)}) and distribute the selected topics ({', '.join(topics)}) across the N days. You must NOT completely ignore or omit any selected subject or its primary topics.
   - **Daily Topic Capacity based on Hours per Day**:
     - If study time is 1-2 hours/day: cover 1-2 topics per day.
     - If study time is 3-5 hours/day: cover 2-3 topics per day.
     - If study time is 6-8 hours/day: cover 3-4 topics per day.
   - **Extreme Short Case (1-3 days)**: When the timeline is extremely short but the user has selected multiple subjects and topics:
     - Group topics/subjects onto the same day (e.g., Day 1: "DSA & OS" covering "Arrays, Linked Lists, Processes"; Day 2: "DBMS & CN" covering "SQL, OSI Model").
     - Ensure that *all* selected subjects have at least one day or part of a day dedicated to them.
     - Cover the most critical, high-yield placement topics for each selected subject (e.g. important Arrays/Linked Lists for DSA, basic SQL/transactions for DBMS, process states/threads for OS, OSI/TCP for CN, basic quantitative topics for Aptitude). Do NOT omit any of the selected subjects.
   - **Medium Case (4-30 days)**: Distribute all selected topics logically, moving from basic to advanced. Ensure topics are spread evenly.
   - **Long Case (31-390 days)**: Since there are more days than topics, spread them out. Dedicate specific days/weeks to deep dives, solving complex practice problems, revision, advanced topics, and mock interviews. Ensure the schedule spans the entire {total_days} days.
3. Day Subject Naming: If a day covers topics from multiple subjects (e.g. DSA and OS), set the "subject" field to a combined string (e.g., "DSA & OS").
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


async def _generate_study_plan_batch_with_groq(
    weak_subjects: list[str],
    topics: list[str],
    total_days: int,
    hours_per_day: int,
    batch_start: int,
    batch_end: int,
) -> list[dict[str, Any]]:
    """Groq fallback for study plan batch generation (llama-3.3-70b-versatile)."""
    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)

    prompt = _build_plan_prompt(
        weak_subjects, topics, total_days, hours_per_day, batch_start, batch_end
    )

    logger.info(f"[Groq Fallback] Generating study plan batch {batch_start}-{batch_end}")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a precise technical tutor. Return only valid JSON array. Do not wrap in ```json or any other text, just raw valid JSON array."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=4096,
    )

    raw_text = (response.choices[0].message.content or "").strip()
    return _parse_json_response(raw_text)


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

    If Gemini fails, instantly switches to Groq to generate the study plan.

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
            logger.info(f"[Gemini] Plan batch {batch_start}-{batch_end} generated successfully")

        except Exception as gemini_err:
            logger.warning(
                f"[Gemini] Plan generation failed for batch {batch_start}-{batch_end}: {gemini_err}. "
                f"Switching to Groq fallback immediately."
            )
            try:
                batch_plan = await _generate_study_plan_batch_with_groq(
                    weak_subjects, topics, days, hours_per_day, batch_start, batch_end
                )
                logger.info(f"[Groq Fallback] Plan batch {batch_start}-{batch_end} generated successfully")
            except Exception as groq_err:
                logger.error(f"[Groq Fallback] Plan generation also failed: {groq_err}")
                raise ValueError("Both Gemini and Groq plan generation failed. Please try again.") from groq_err

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

    Flow:
        1. Try Gemini.
        2. If Gemini fails even once → instantly switch to Groq fallback.
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

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=_generation_config(),
        )
        logger.info(f"[Gemini] Notes generated successfully for {subject} — {topics}")
        return response.text.strip()

    except Exception as e:
        logger.warning(
            f"Notes: Gemini API failed with error: {e}. "
            f"Switching to Groq fallback immediately for {subject} — {topics}."
        )
        try:
            notes = await _generate_notes_with_groq(
                subject=subject,
                topics=topics,
                previous_topics=previous_topics or [],
            )
            logger.info(f"[Groq Fallback] Notes generated successfully for {subject} — {topics}")
            return notes
        except Exception as groq_err:
            logger.error(f"[Groq Fallback] Notes generation also failed: {groq_err}")
            raise RateLimitError(retry_after=60) from groq_err


async def generate_study_fact() -> str:
    """Generate a cool, funny, or interesting study fact or quote using Groq."""
    from groq import Groq
    import random
    client = Groq(api_key=settings.GROQ_API_KEY)

    prompt = """You are a witty, supportive placement prep coach.
Generate a short (1-2 sentences), cool, funny, or mind-blowing study tip, fact, or tech trivia related to coding, computer science, or learning.
Keep it extremely brief and engaging (under 30 words) so it's quick to read on a loading screen.
Examples:
- "Did you know the first computer bug was a real moth found trapped in a relay by Grace Hopper in 1947?"
- "Taking a 10-minute break for every 50 minutes of study is scientifically proven to boost long-term recall by 20%!"
- "The average software engineer spends more time reading code than writing it. Clean code is a love letter to your future self."
Return ONLY the fact or quote, with no conversational preamble or quotes around it."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a concise tech coach. Return only the fact text. No quotes around it."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=100,
        )
        return (response.choices[0].message.content or "").strip().strip('"')
    except Exception as e:
        logger.error(f"Failed to generate study fact using Groq: {e}")
        # Return a premium fallback fact
        fallbacks = [
            "Taking a 10-minute break for every 50 minutes of study boosts long-term recall by 20%!",
            "The first computer bug was an actual moth found trapped in a computer relay by Grace Hopper in 1947.",
            "Studies show that explaining a concept to an imaginary rubber duck helps you debug faster!",
            "Clean code is not just readable; it's a love letter to your future self.",
            "Did you know? The first computer programmer was Ada Lovelace, who wrote an algorithm for Charles Babbage's Analytical Engine in 1843!"
        ]
        return random.choice(fallbacks)
