"""
PlaceMate Backend – Auth Middleware

Extracts and validates Firebase ID tokens from the Authorization header.
Provides a FastAPI dependency `get_current_uid` that injects the authenticated
user's UID into any route handler.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.firebase_init import verify_id_token

# Extracts Bearer token from Authorization header
_bearer_scheme = HTTPBearer()


async def get_current_uid(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    FastAPI dependency: validates the Firebase ID token and returns the user's UID.

    Usage in routes:
        @router.get("/protected")
        async def protected_route(uid: str = Depends(get_current_uid)):
            ...
    """
    token = credentials.credentials
    try:
        decoded = verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
