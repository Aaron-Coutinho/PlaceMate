"""
PlaceMate Backend – YouTube Service

Fetches curated YouTube videos for a given search query using the
YouTube Data API v3. Called on-demand the first time a user opens
a day's content — results are cached in Firestore to avoid repeated
API calls and to stay within the daily quota.
"""

import logging
from typing import Any

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings

logger = logging.getLogger(__name__)

# Number of videos to fetch per day topic
MAX_RESULTS = 3


def fetch_videos_for_topic(query: str) -> list[dict[str, Any]]:
    """
    Search YouTube for placement-prep videos matching the given query.

    Returns up to MAX_RESULTS video dicts, each with:
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
                maxResults=MAX_RESULTS,
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
                    "title": snippet.get("title", ""),
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
