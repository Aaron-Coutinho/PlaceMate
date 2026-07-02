"""
PlaceMate Backend – Firebase Initialization

Initializes Firebase Admin SDK for server-side Auth verification and Firestore access.
This module should be imported once at app startup.

In production (Railway / Cloud Run), FIREBASE_SERVICE_ACCOUNT should be set to the
entire service account JSON content as a string. Locally it can remain a file path.
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from app.config import settings

_initialized = False


def init_firebase() -> None:
    """Initialize Firebase Admin SDK with service account credentials.
    
    Accepts either:
    - A file path (local dev): FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
    - An inline JSON string (production): FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
    """
    global _initialized
    if _initialized:
        return

    sa = settings.FIREBASE_SERVICE_ACCOUNT
    if sa.strip().startswith("{"):
        # Inline JSON string — used in production (Railway, Cloud Run, etc.)
        cred = credentials.Certificate(json.loads(sa))
    else:
        # File path — used locally
        cred = credentials.Certificate(sa)

    firebase_admin.initialize_app(cred)
    _initialized = True



def get_firestore_client():
    """Return the Firestore client. Ensures Firebase is initialized first."""
    init_firebase()
    return firestore.client()


def verify_id_token(token: str) -> dict:
    """
    Verify a Firebase ID token from the frontend.

    Returns the decoded token dict containing 'uid', 'email', etc.
    Raises firebase_admin.auth.InvalidIdTokenError on failure.

    clock_skew_seconds=10 tolerates minor clock drift between the browser
    (which mints the token) and this server — fixes "Token used too early" errors
    that occur when the client clock is a few seconds ahead of the server clock.
    """
    init_firebase()
    return firebase_auth.verify_id_token(token, clock_skew_seconds=10)


# Convenience: pre-initialized Firestore client
db = None


def get_db():
    """Lazy singleton for Firestore client."""
    global db
    if db is None:
        db = get_firestore_client()
    return db
