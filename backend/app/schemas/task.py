from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.user import UserSimpleResponse
from app.schemas.team import TeamSimpleResponse


VALID_TASK_TYPES = [
    "customer_issue",
    "engineering_problem",
    "payment_investigation",
    "production_incident",
    "compliance_request",
    "operational_task",
]

VALID_TASK_PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent",
]

VALID_TASK_STATUSES = [
    "open",
    "in_progress",
    "blocked",
    "resolved",
    "closed",
]


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(default="")
    type: str
    priority: str = Field(default="medium")
    team_id: str
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    version: int = Field(..., description="Expected current version for optimistic concurrency control")
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: str
    task_ref: str
    title: str
    description: str
    type: str
    status: str
    priority: str
    team_id: str
    created_by_id: str
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    version: int
    created_at: datetime
    updated_at: datetime

    team: Optional[TeamSimpleResponse] = None
    creator: Optional[UserSimpleResponse] = None
    assignee: Optional[UserSimpleResponse] = None

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
