import json
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.schemas.audit import AuditEventResponse
from app.services.task_service import TaskService
from app.services.audit_service import AuditService
from app.services.idempotency_service import IdempotencyService
from app.api.deps import get_current_user, verify_csrf

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
def list_tasks(
    search: Optional[str] = Query(None, description="Search by title or reference"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    team_id: Optional[str] = Query(None, description="Filter by team"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee or 'unassigned'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items, total = TaskService.list_tasks(
        db=db,
        user=current_user,
        search=search,
        status_filter=status,
        priority_filter=priority,
        team_id_filter=team_id,
        assignee_id_filter=assignee_id,
        page=page,
        page_size=page_size
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return TaskListResponse(
        items=[TaskResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_task(
    task_in: TaskCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check duplicate submission idempotency
    if idempotency_key and idempotency_key.strip():
        key = idempotency_key.strip()
        existing_record = IdempotencyService.get_record(db, key, current_user.id)
        if existing_record:
            return Response(
                content=existing_record.response_body,
                status_code=existing_record.response_status,
                media_type="application/json"
            )

    new_task = TaskService.create_task(db=db, user=current_user, task_in=task_in)
    response_data = TaskResponse.model_validate(new_task)

    if idempotency_key and idempotency_key.strip():
        IdempotencyService.save_record(
            db=db,
            key=idempotency_key.strip(),
            user_id=current_user.id,
            request_path="/api/v1/tasks",
            status_code=status.HTTP_201_CREATED,
            response_body=response_data.model_dump_json()
        )

    return response_data


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = TaskService.get_task_by_id_or_404(db=db, task_id=task_id, user=current_user)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse, dependencies=[Depends(verify_csrf)])
def update_task(
    task_id: str,
    update_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_task = TaskService.update_task(
        db=db,
        user=current_user,
        task_id=task_id,
        update_in=update_in
    )
    return TaskResponse.model_validate(updated_task)


@router.get("/{task_id}/activity", response_model=List[AuditEventResponse])
def get_task_activity(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate access to task first
    TaskService.get_task_by_id_or_404(db=db, task_id=task_id, user=current_user)
    return AuditService.get_task_activity(db=db, task_id=task_id)
