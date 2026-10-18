from typing import List
from pydantic import BaseModel
from app.schemas.task import TaskResponse
from app.schemas.audit import AuditEventResponse


class DashboardMetricsResponse(BaseModel):
    total_active_tasks: int
    open_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    urgent_tasks: int
    overdue_tasks: int
    urgent_work: List[TaskResponse]
    recently_updated: List[TaskResponse]
    recent_activity: List[AuditEventResponse]
