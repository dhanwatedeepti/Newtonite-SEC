import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User, TeamMembership
from app.models.team import Team
from app.schemas.team import TeamResponse, TeamCreate, TeamMemberResponse, TeamMemberAddRequest
from app.api.deps import get_current_user, get_current_admin, verify_csrf

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("", response_model=List[TeamResponse])
def get_teams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Team).options(
        joinedload(Team.memberships).joinedload(TeamMembership.user)
    )

    if current_user.global_role != "admin":
        user_team_ids = [m.team_id for m in current_user.team_memberships]
        query = query.filter(Team.id.in_(user_team_ids))

    teams = query.order_by(Team.name.asc()).all()
    results = []
    for t in teams:
        members_list = [
            TeamMemberResponse(
                user_id=m.user_id,
                email=m.user.email,
                full_name=m.user.full_name,
                role=m.role
            )
            for m in t.memberships if m.user
        ]
        results.append(TeamResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            created_at=t.created_at,
            updated_at=t.updated_at,
            members=members_list
        ))
    return results


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_team(
    team_in: TeamCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Team).filter(Team.name == team_in.name.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team '{team_in.name}' already exists."
        )

    now = datetime.now(timezone.utc)
    team = Team(
        id=str(uuid.uuid4()),
        name=team_in.name.strip(),
        description=team_in.description,
        created_at=now,
        updated_at=now
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        created_at=team.created_at,
        updated_at=team.updated_at,
        members=[]
    )


@router.post("/{team_id}/members", dependencies=[Depends(verify_csrf)])
def add_team_member(
    team_id: str,
    member_in: TeamMemberAddRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    user = db.query(User).filter(User.id == member_in.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    membership = db.query(TeamMembership).filter(
        TeamMembership.team_id == team_id,
        TeamMembership.user_id == member_in.user_id
    ).first()

    if membership:
        membership.role = member_in.role
    else:
        membership = TeamMembership(
            id=str(uuid.uuid4()),
            team_id=team_id,
            user_id=member_in.user_id,
            role=member_in.role,
            created_at=datetime.now(timezone.utc)
        )
        db.add(membership)

    db.commit()
    return {"message": "Team membership updated successfully"}
