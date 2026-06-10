"""
PlaceMate Backend – Auth Router

Handles user registration/profile creation after Firebase Auth login.
The frontend authenticates via Firebase client SDK (Google sign-in),
then calls these endpoints with the Firebase ID token to create/fetch
the user profile in Firestore.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_uid
from app.firebase_init import get_db, verify_id_token
from app.models.schemas import UserProfile
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserProfile)
async def register_or_login(uid: str = Depends(get_current_uid)):
    """
    Register a new user or return existing profile.

    Called immediately after Firebase Auth login on the frontend.
    Creates the user document in Firestore if it doesn't exist.
    """
    db = get_db()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if user_doc.exists:
        return UserProfile(**user_doc.to_dict())

    # Fetch user info from Firebase Auth
    from firebase_admin import auth as fb_auth

    try:
        firebase_user = fb_auth.get_user(uid)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in Firebase Auth",
        )

    profile_data = {
        "uid": uid,
        "email": firebase_user.email or "",
        "display_name": firebase_user.display_name or "",
        "photo_url": firebase_user.photo_url or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "current_plan_id": None,
    }

    user_ref.set(profile_data)
    return UserProfile(**profile_data)


@router.get("/profile", response_model=UserProfile)
async def get_profile(uid: str = Depends(get_current_uid)):
    """Fetch the authenticated user's profile from Firestore."""
    db = get_db()
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Call /auth/register first.",
        )

    return UserProfile(**user_doc.to_dict())
