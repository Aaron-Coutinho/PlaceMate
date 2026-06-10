"""
PlaceMate Backend – Firebase Initialization

Initializes Firebase Admin SDK for server-side Auth verification and Firestore access.
This module should be imported once at app startup.
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from app.config import settings

_initialized = False


def init_firebase() -> None:
    """Initialize Firebase Admin SDK with service account credentials."""
    global _initialized
    if _initialized:
        return

    cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT)
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
    """
    init_firebase()
    return firebase_auth.verify_id_token(token)


# Convenience: pre-initialized Firestore client
db = None


def get_db():
    """Lazy singleton for Firestore client."""
    global db
    if db is None:
        db = get_firestore_client()
    return db
