import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User, TeamMembership
from app.schemas.user import UserResponse, UserCreate, TeamMembershipSimple
from app.services.auth_service import AuthService
from app.api.deps import get_current_user, get_current_admin, verify_csrf

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
def get_users(
    team_id: Optional[str] = Query(None, description="Filter users by team"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(User).options(
        joinedload(User.team_memberships).joinedload(TeamMembership.team)
    ).filter(User.is_active == True)

    if current_user.global_role != "admin":
        # Scoped to users who share teams with current user
        user_team_ids = [m.team_id for m in current_user.team_memberships]
        if not user_team_ids:
            return []
        
        if team_id:
            if team_id not in user_team_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to requested team users.")
            query = query.join(User.team_memberships).filter(TeamMembership.team_id == team_id)
        else:
            query = query.join(User.team_memberships).filter(TeamMembership.team_id.in_(user_team_ids))
    else:
        if team_id:
            query = query.join(User.team_memberships).filter(TeamMembership.team_id == team_id)

    users = query.distinct().order_by(User.full_name.asc()).all()

    results = []
    for u in users:
        teams_list = [
            TeamMembershipSimple(
                team_id=tm.team_id,
                team_name=tm.team.name if tm.team else "",
                role=tm.role
            )
            for tm in u.team_memberships if tm.team
        ]
        results.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            global_role=u.global_role,
            is_active=u.is_active,
            created_at=u.created_at,
            updated_at=u.updated_at,
            teams=teams_list
        ))
    return results


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_user(
    user_in: UserCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    now = datetime.now(timezone.utc)
    hashed_pwd = AuthService.hash_password(user_in.password)
    user = User(
        id=str(uuid.uuid4()),
        email=user_in.email.lower().strip(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name.strip(),
        global_role=user_in.global_role,
        is_active=True,
        created_at=now,
        updated_at=now
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        global_role=user.global_role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        teams=[]
    )
