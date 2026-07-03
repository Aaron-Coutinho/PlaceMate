"""
PlaceMate Backend – YouTube Service

Fetches curated YouTube videos for a given search query using the
YouTube Data API v3. Called on-demand the first time a user opens
a day's content — results are cached in Firestore to avoid repeated
API calls and to stay within the daily quota.
"""

import logging
import re
from typing import Any

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings

logger = logging.getLogger(__name__)

# Number of videos to fetch per day topic
MAX_RESULTS = 3


def _clean_title(title: str) -> str:
    """
    Clean up common symbol clutter seen in YouTube video titles:
    - Remove hashtag phrases like #DSA, #Placement, #Shorts
    - Remove $ and other noise characters
    - Collapse multiple whitespace / trailing pipes into a clean string
    """
    # Remove hashtag words (e.g. #DSA, #placement2024)
    title = re.sub(r'#\w+', '', title)
    # Remove dollar signs
    title = title.replace('$', '')
    # Remove leading/trailing pipes and slashes
    title = re.sub(r'^[|/\\\s]+|[|/\\\s]+$', '', title)
    # Collapse multiple spaces
    title = re.sub(r'\s{2,}', ' ', title)
    return title.strip()


def fetch_videos_for_topic(query: str, max_results: int = MAX_RESULTS) -> list[dict[str, Any]]:
    """
    Search YouTube for placement-prep videos matching the given query.

    Returns up to max_results video dicts, each with:
      - title, video_id, thumbnail, channel

    Falls back to an empty list on any API error so the rest of the
    day content is still shown to the user.
    """
    if not settings.YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY is not set – skipping video fetch")
        return []

    try:
        youtube = build(
            "youtube",
            "v3",
            developerKey=settings.YOUTUBE_API_KEY,
            cache_discovery=False,  # avoids file-system cache warnings in containers
        )

        response = (
            youtube.search()
            .list(
                part="snippet",
                q=query,
                type="video",
                maxResults=max_results,
                relevanceLanguage="en",
                videoEmbeddable="true",
                safeSearch="strict",
            )
            .execute()
        )

        videos = []
        for item in response.get("items", []):
            snippet = item.get("snippet", {})
            video_id = item.get("id", {}).get("videoId")
            if not video_id:
                continue

            videos.append(
                {
                    "title": _clean_title(snippet.get("title", "")),
                    "video_id": video_id,
                    "thumbnail": snippet.get("thumbnails", {})
                    .get("medium", {})
                    .get("url", ""),
                    "channel": snippet.get("channelTitle", ""),
                }
            )

        logger.info(
            f"Fetched {len(videos)} video(s) for query: '{query}'"
        )
        return videos

    except HttpError as e:
        logger.error(f"YouTube API error for query '{query}': {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching YouTube videos: {e}")
        return []


# ---------------------------------------------------------------------------
# Smart Subject/Topic mappings for curated YouTube queries
# ---------------------------------------------------------------------------

TOPIC_EXPANSIONS = {
    "DP": "Dynamic Programming",
    "ER Models": "Entity Relationship ER Model",
}

TOPIC_SUBJECT_MAP = {
    # DSA
    "Arrays": "DSA", "Linked Lists": "DSA", "Trees": "DSA", "Graphs": "DSA", "DP": "DSA", "Sorting": "DSA", "Hashing": "DSA",
    # OS
    "Processes": "OS", "Threads": "OS", "Memory Management": "OS", "Deadlocks": "OS", "Scheduling": "OS",
    # DBMS
    "SQL": "DBMS", "Normalization": "DBMS", "Transactions": "DBMS", "Indexing": "DBMS", "ER Models": "DBMS",
    # CN
    "OSI Model": "CN", "TCP/IP": "CN", "DNS": "CN", "HTTP": "CN", "Routing": "CN", "Subnetting": "CN",
    # Aptitude
    "Number Systems": "Aptitude", "Probability": "Aptitude", "Time & Work": "Aptitude", "Permutations": "Aptitude"
}

SUBJECT_NAMES = {
    "DSA": "Data Structures Algorithms",
    "OS": "Operating System",
    "DBMS": "DBMS Database",
    "CN": "Computer Network",
    "Aptitude": "Quantitative Aptitude"
}


def _build_topic_query(subject: str, topic: str) -> str:
    """Build a highly relevant placement tutorial query for a specific topic."""
    # Expand abbreviations
    topic_expanded = TOPIC_EXPANSIONS.get(topic, topic)
    
    # Determine subject parent
    parent_sub = TOPIC_SUBJECT_MAP.get(topic)
    if not parent_sub:
        # Fallback: check if any known subject abbreviation is inside the day's subject
        for sub_key in SUBJECT_NAMES.keys():
            if sub_key in subject:
                parent_sub = sub_key
                break
                
    if parent_sub and parent_sub in SUBJECT_NAMES:
        sub_name = SUBJECT_NAMES[parent_sub]
    else:
        # Fallback: clean the day's subject of special characters
        sub_name = subject.replace("&", "and").replace("/", " ")
        
    return f"{sub_name} {topic_expanded} tutorial placement preparation"


def fetch_videos_for_day(subject: str, topics: list[str], max_results: int = 3) -> list[dict[str, Any]]:
    """
    Fetch curated videos for a specific day by performing topic-level searches.
    Interleaves search results for balanced topic coverage.
    """
    if not topics:
        # Fallback to subject-only search query
        query = f"{subject} placement preparation tutorial"
        return fetch_videos_for_topic(query, max_results)

    # 1. Generate specific queries for each topic
    queries = [_build_topic_query(subject, topic) for topic in topics]
    
    # 2. Fetch videos in parallel or sequence. Since it's run in an executor,
    # we can fetch them sequentially. We only fetch for up to 3 topics to conserve quota.
    results_by_topic = []
    
    # Ask for enough videos per topic to interleave and meet max_results
    # If 1 topic, we need max_results
    # If 2 topics, we need at least ceil(max_results/2) per topic
    items_per_topic = max(3, max_results // len(queries) + 1)
    
    for q in queries[:3]:  # cap at top 3 topics
        topic_videos = fetch_videos_for_topic(q, items_per_topic)
        if topic_videos:
            results_by_topic.append(topic_videos)

    if not results_by_topic:
        # Fallback: try subject-wide query if topic searches returned nothing
        fallback_query = f"{subject} {' '.join(topics)} tutorial"
        return fetch_videos_for_topic(fallback_query, max_results)

    # 3. Interleave results
    merged_videos = []
    seen_ids = set()
    
    # Simple round-robin merge
    max_len = max(len(lst) for lst in results_by_topic)
    for i in range(max_len):
        for lst in results_by_topic:
            if i < len(lst):
                video = lst[i]
                if video["video_id"] not in seen_ids:
                    seen_ids.add(video["video_id"])
                    merged_videos.append(video)

    return merged_videos[:max_results]

