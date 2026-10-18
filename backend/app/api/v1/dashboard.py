from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.task import Task
from app.models.user import User, TeamMembership
from app.models.audit import AuditEvent
from app.schemas.dashboard import DashboardMetricsResponse
from app.schemas.task import TaskResponse
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import AuditService
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    base_query = db.query(Task)

    if current_user.global_role != "admin":
        user_team_ids = [m.team_id for m in current_user.team_memberships]
        if not user_team_ids:
            return DashboardMetricsResponse(
                total_active_tasks=0,
                open_tasks=0,
                in_progress_tasks=0,
                blocked_tasks=0,
                urgent_tasks=0,
                overdue_tasks=0,
                urgent_work=[],
                recently_updated=[],
                recent_activity=[]
            )
        base_query = base_query.filter(Task.team_id.in_(user_team_ids))

    now = datetime.now(timezone.utc)

    # Calculate real metrics from the database
    total_active = base_query.filter(Task.status.in_(["open", "in_progress", "blocked"])).count()
    open_count = base_query.filter(Task.status == "open").count()
    in_progress_count = base_query.filter(Task.status == "in_progress").count()
    blocked_count = base_query.filter(Task.status == "blocked").count()
    urgent_count = base_query.filter(
        and_(Task.priority == "urgent", Task.status.in_(["open", "in_progress", "blocked"]))
    ).count()
    overdue_count = base_query.filter(
        and_(
            Task.due_date < now,
            Task.status.in_(["open", "in_progress", "blocked"])
        )
    ).count()

    # Urgent work items
    urgent_items = base_query.options(
        joinedload(Task.team),
        joinedload(Task.creator),
        joinedload(Task.assignee)
    ).filter(
        Task.priority == "urgent",
        Task.status.in_(["open", "in_progress", "blocked"])
    ).order_by(Task.updated_at.desc()).limit(5).all()

    # Recently updated tasks
    recent_tasks = base_query.options(
        joinedload(Task.team),
        joinedload(Task.creator),
        joinedload(Task.assignee)
    ).order_by(Task.updated_at.desc()).limit(5).all()

    # Recent activity events across the scoped tasks
    activity_query = db.query(AuditEvent).options(
        joinedload(AuditEvent.user)
    ).join(Task, AuditEvent.task_id == Task.id)
    if current_user.global_role != "admin":
        user_team_ids = [m.team_id for m in current_user.team_memberships]
        activity_query = activity_query.filter(Task.team_id.in_(user_team_ids))
    recent_activity_events = activity_query.order_by(AuditEvent.created_at.desc()).limit(10).all()

    activity_responses = []
    for e in recent_activity_events:
        activity_responses.extend(AuditService.get_task_activity(db, e.task_id)[:1])

    # Deduplicate activity responses by id
    unique_activities = []
    seen_ids = set()
    for a in activity_responses:
        if a.id not in seen_ids:
            seen_ids.add(a.id)
            unique_activities.append(a)

    return DashboardMetricsResponse(
        total_active_tasks=total_active,
        open_tasks=open_count,
        in_progress_tasks=in_progress_count,
        blocked_tasks=blocked_count,
        urgent_tasks=urgent_count,
        overdue_tasks=overdue_count,
        urgent_work=[TaskResponse.model_validate(t) for t in urgent_items],
        recently_updated=[TaskResponse.model_validate(t) for t in recent_tasks],
        recent_activity=unique_activities
    )
