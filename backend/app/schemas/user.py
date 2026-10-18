from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class UserSimpleResponse(BaseModel):
    id: str
    email: str
    full_name: str
    global_role: str

    model_config = ConfigDict(from_attributes=True)


class TeamMembershipSimple(BaseModel):
    team_id: str
    team_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    global_role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    teams: List[TeamMembershipSimple] = []

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    global_role: str = "user"
