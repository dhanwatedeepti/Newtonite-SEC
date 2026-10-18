from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserSimpleResponse


class TeamMemberResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str  # "team_lead" or "member"

    model_config = ConfigDict(from_attributes=True)


class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    members: List[TeamMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TeamSimpleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TeamMemberAddRequest(BaseModel):
    user_id: str
    role: str = "member"  # "team_lead" or "member"
