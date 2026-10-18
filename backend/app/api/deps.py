from typing import Optional
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models.user import User, TeamMembership
from app.models.team import Team
from app.services.auth_service import AuthService

security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticate user via:
    1. HttpOnly session cookie (Standard web flow)
    2. Authorization: Bearer <session_token> (API / test client flow)
    """
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    
    # Fallback to Authorization Bearer header if cookie is absent
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = AuthService.verify_session_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).options(
        joinedload(User.team_memberships).joinedload(TeamMembership.team)
    ).filter(User.id == user_id, User.is_active == True).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.global_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )
    return current_user


def verify_csrf(request: Request, current_user: User = Depends(get_current_user)) -> None:
    """
    Verify CSRF token for state-changing requests when session cookie is used.
    If authenticated via Bearer header directly, CSRF check is satisfied by explicit token presentation.
    """
    # If request has explicit Authorization Bearer header, CSRF is not applicable
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return

    # For cookie-based authentication on state-changing methods
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token or not AuthService.verify_csrf_token(current_user.id, csrf_token):
            # In development or if CSRF is omitted, verify whether we reject or warn
            # We strictly enforce CSRF verification
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Please refresh and try again."
            )
