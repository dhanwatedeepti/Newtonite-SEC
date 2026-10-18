from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models.user import User, TeamMembership
from app.schemas.auth import LoginRequest, AuthStateResponse
from app.schemas.user import UserResponse, TeamMembershipSimple
from app.services.auth_service import AuthService
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def build_user_response(user: User) -> UserResponse:
    teams_list = []
    for tm in user.team_memberships:
        if tm.team:
            teams_list.append(TeamMembershipSimple(
                team_id=tm.team_id,
                team_name=tm.team.name,
                role=tm.role
            ))
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        global_role=user.global_role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        teams=teams_list
    )


@router.post("/login", response_model=AuthStateResponse)
def login(login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).options(
        joinedload(User.team_memberships).joinedload(TeamMembership.team)
    ).filter(User.email == login_data.email.lower().strip()).first()

    if not user or not AuthService.verify_password(user.hashed_password, login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )

    session_token = AuthService.create_session_token(user.id)
    csrf_token = AuthService.generate_csrf_token(user.id)

    # Set secure HttpOnly session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        max_age=86400 * 7,
        path="/"
    )

    return AuthStateResponse(
        user=build_user_response(user),
        csrf_token=csrf_token
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/"
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=AuthStateResponse)
def get_me(current_user: User = Depends(get_current_user)):
    csrf_token = AuthService.generate_csrf_token(current_user.id)
    return AuthStateResponse(
        user=build_user_response(current_user),
        csrf_token=csrf_token
    )
