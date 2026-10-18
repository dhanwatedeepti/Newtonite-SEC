import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, func, or_, update, and_
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.task import Task
from app.models.user import User, TeamMembership
from app.models.team import Team
from app.models.audit import AuditEvent
from app.schemas.task import TaskCreate, TaskUpdate, VALID_TASK_TYPES, VALID_TASK_PRIORITIES, VALID_TASK_STATUSES
from app.services.workflow_service import WorkflowService


class TaskService:
    @staticmethod
    def get_user_team_roles(db: Session, user_id: str) -> Dict[str, str]:
        """Return a mapping of team_id -> role for the user."""
        memberships = db.query(TeamMembership).filter(TeamMembership.user_id == user_id).all()
        return {m.team_id: m.role for m in memberships}

    @staticmethod
    def generate_task_ref(db: Session, team_id: str) -> str:
        """Generate a human-readable task reference such as OPS-1001 or TASK-1001."""
        team = db.query(Team).filter(Team.id == team_id).first()
        prefix = "TASK"
        if team:
            prefix = "".join([c for c in team.name.upper() if c.isalnum()][:4])
            if not prefix:
                prefix = "TASK"
        
        # Count existing tasks for this team
        count = db.query(func.count(Task.id)).filter(Task.team_id == team_id).scalar() or 0
        return f"{prefix}-{1001 + count}"

    @staticmethod
    def check_user_can_view_task(user: User, task: Task, team_roles: Dict[str, str]) -> bool:
        if user.global_role == "admin":
            return True
        return task.team_id in team_roles

    @staticmethod
    def get_task_by_id_or_404(db: Session, task_id: str, user: User) -> Task:
        task = db.query(Task).options(
            joinedload(Task.team),
            joinedload(Task.creator),
            joinedload(Task.assignee)
        ).filter(Task.id == task_id).first()

        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        team_roles = TaskService.get_user_team_roles(db, user.id)
        if not TaskService.check_user_can_view_task(user, task, team_roles):
            # Safe 404 to avoid leaking existence of task outside user's teams
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        return task

    @staticmethod
    def create_task(db: Session, user: User, task_in: TaskCreate) -> Task:
        # Validate task type and priority
        if task_in.type not in VALID_TASK_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task type '{task_in.type}'. Allowed: {VALID_TASK_TYPES}"
            )
        if task_in.priority not in VALID_TASK_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task priority '{task_in.priority}'. Allowed: {VALID_TASK_PRIORITIES}"
            )

        # Authorization: Must be admin or a member of the team
        team_roles = TaskService.get_user_team_roles(db, user.id)
        if user.global_role != "admin" and task_in.team_id not in team_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create tasks for teams you belong to."
            )

        # Validate team exists
        team = db.query(Team).filter(Team.id == task_in.team_id).first()
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

        # Validate assignee eligibility if specified
        if task_in.assignee_id:
            assignee = db.query(User).filter(User.id == task_in.assignee_id).first()
            if not assignee:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee not found")
            assignee_teams = TaskService.get_user_team_roles(db, task_in.assignee_id)
            if assignee.global_role != "admin" and task_in.team_id not in assignee_teams:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee must be a member of the selected team."
                )

        task_ref = TaskService.generate_task_ref(db, task_in.team_id)
        now = datetime.now(timezone.utc)

        new_task = Task(
            id=str(uuid.uuid4()),
            task_ref=task_ref,
            title=task_in.title.strip(),
            description=task_in.description or "",
            type=task_in.type,
            status="open",
            priority=task_in.priority,
            team_id=task_in.team_id,
            created_by_id=user.id,
            assignee_id=task_in.assignee_id,
            due_date=task_in.due_date,
            version=1,
            created_at=now,
            updated_at=now
        )
        db.add(new_task)
        db.flush()  # populate ID and check constraints

        # Create audit event atomically
        audit_event = AuditEvent(
            id=str(uuid.uuid4()),
            task_id=new_task.id,
            user_id=user.id,
            action="task_created",
            details=json.dumps({
                "title": new_task.title,
                "type": new_task.type,
                "priority": new_task.priority,
                "team_id": new_task.team_id,
                "assignee_id": new_task.assignee_id
            }),
            created_at=now
        )
        db.add(audit_event)
        db.commit()
        db.refresh(new_task)
        return new_task

    @staticmethod
    def update_task(db: Session, user: User, task_id: str, update_in: TaskUpdate) -> Task:
        # 1. Fetch current task to verify existence and check permissions
        current_task = db.query(Task).filter(Task.id == task_id).first()
        if not current_task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        team_roles = TaskService.get_user_team_roles(db, user.id)
        user_team_role = team_roles.get(current_task.team_id)

        # Check view / base access
        if user.global_role != "admin" and current_task.team_id not in team_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this task.")

        # 2. Resource-Level Authorization Rules
        is_admin = user.global_role == "admin"
        is_team_lead = user_team_role == "team_lead"
        is_creator = current_task.created_by_id == user.id
        is_assignee = current_task.assignee_id == user.id

        if not (is_admin or is_team_lead or is_creator or is_assignee):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this task. Members can only update tasks they created or are assigned to."
            )

        # Members (not admin and not team lead) cannot reassign tasks
        if update_in.assignee_id is not None and update_in.assignee_id != current_task.assignee_id:
            if not (is_admin or is_team_lead):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only Team Leads or Administrators can reassign tasks."
                )

        # Validate assignee eligibility if changed
        if update_in.assignee_id is not None and update_in.assignee_id != current_task.assignee_id:
            if update_in.assignee_id != "":
                assignee = db.query(User).filter(User.id == update_in.assignee_id).first()
                if not assignee:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee not found")
                assignee_teams = TaskService.get_user_team_roles(db, update_in.assignee_id)
                if assignee.global_role != "admin" and current_task.team_id not in assignee_teams:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Assignee must be a member of the task's team."
                    )

        # 3. Workflow Rule Enforcement (Behaviour 3)
        if update_in.status is not None and update_in.status != current_task.status:
            if update_in.status not in VALID_TASK_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status '{update_in.status}'. Allowed: {VALID_TASK_STATUSES}"
                )
            WorkflowService.validate_transition(current_task.status, update_in.status, is_admin=is_admin)

        if update_in.type is not None and update_in.type not in VALID_TASK_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task type '{update_in.type}'. Allowed: {VALID_TASK_TYPES}"
            )
        if update_in.priority is not None and update_in.priority not in VALID_TASK_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid task priority '{update_in.priority}'. Allowed: {VALID_TASK_PRIORITIES}"
            )

        # 4. Prepare fields and calculate differences for Audit
        changes: Dict[str, Dict[str, Any]] = {}
        fields_to_update: Dict[str, Any] = {}

        if update_in.title is not None and update_in.title.strip() != current_task.title:
            changes["title"] = {"from": current_task.title, "to": update_in.title.strip()}
            fields_to_update["title"] = update_in.title.strip()

        if update_in.description is not None and update_in.description != current_task.description:
            changes["description"] = {"from": current_task.description, "to": update_in.description}
            fields_to_update["description"] = update_in.description

        if update_in.type is not None and update_in.type != current_task.type:
            changes["type"] = {"from": current_task.type, "to": update_in.type}
            fields_to_update["type"] = update_in.type

        if update_in.priority is not None and update_in.priority != current_task.priority:
            changes["priority"] = {"from": current_task.priority, "to": update_in.priority}
            fields_to_update["priority"] = update_in.priority

        if update_in.status is not None and update_in.status != current_task.status:
            changes["status"] = {"from": current_task.status, "to": update_in.status}
            fields_to_update["status"] = update_in.status

        if update_in.assignee_id is not None and update_in.assignee_id != current_task.assignee_id:
            new_assignee_val = update_in.assignee_id if update_in.assignee_id != "" else None
            if new_assignee_val != current_task.assignee_id:
                changes["assignee_id"] = {"from": current_task.assignee_id, "to": new_assignee_val}
                fields_to_update["assignee_id"] = new_assignee_val

        if update_in.due_date is not None and update_in.due_date != current_task.due_date:
            changes["due_date"] = {
                "from": current_task.due_date.isoformat() if current_task.due_date else None,
                "to": update_in.due_date.isoformat() if update_in.due_date else None
            }
            fields_to_update["due_date"] = update_in.due_date

        if not fields_to_update:
            # No changes requested, return current task
            return current_task

        now = datetime.now(timezone.utc)
        fields_to_update["updated_at"] = now

        # 5. Atomic Optimistic Concurrency Control (Behaviour 2)
        # Update only if version matches update_in.version
        expected_version = update_in.version
        stmt = (
            update(Task)
            .where(and_(Task.id == task_id, Task.version == expected_version))
            .values(**fields_to_update, version=Task.version + 1)
        )
        result = db.execute(stmt)

        if result.rowcount == 0:
            fresh_task = db.query(Task).filter(Task.id == task_id).first()
            current_ver = fresh_task.version if fresh_task else current_task.version
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "Conflict",
                    "message": f"Task has been modified by another user (current version is {current_ver}, your version was {expected_version}). Please refresh and try again.",
                    "current_version": current_ver,
                    "expected_version": expected_version
                }
            )

        # 6. Audit event creation in the same transaction
        action_name = "task_updated"
        if "status" in changes:
            if changes["status"]["to"] == "closed":
                action_name = "task_closed"
            elif changes["status"]["from"] == "closed":
                action_name = "task_reopened"
            else:
                action_name = "status_changed"
        elif "assignee_id" in changes:
            action_name = "reassigned" if changes["assignee_id"]["from"] else "assigned"
        elif "priority" in changes:
            action_name = "priority_changed"

        audit_event = AuditEvent(
            id=str(uuid.uuid4()),
            task_id=task_id,
            user_id=user.id,
            action=action_name,
            details=json.dumps({"changes": changes}),
            created_at=now
        )
        db.add(audit_event)

        # Commit both update and audit atomically
        db.commit()

        # Fetch and return the updated task
        updated_task = db.query(Task).options(
            joinedload(Task.team),
            joinedload(Task.creator),
            joinedload(Task.assignee)
        ).filter(Task.id == task_id).first()
        return updated_task

    @staticmethod
    def list_tasks(
        db: Session,
        user: User,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        team_id_filter: Optional[str] = None,
        assignee_id_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Task], int]:
        """
        List tasks with server-side filtering, searching, user-scoping and pagination.
        Avoids N+1 using joinedload.
        """
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        query = db.query(Task).options(
            joinedload(Task.team),
            joinedload(Task.creator),
            joinedload(Task.assignee)
        )

        # Scope queries to user's permitted teams if not admin
        if user.global_role != "admin":
            team_roles = TaskService.get_user_team_roles(db, user.id)
            user_team_ids = list(team_roles.keys())
            if not user_team_ids:
                return [], 0
            query = query.filter(Task.team_id.in_(user_team_ids))

        # Search filter (title or task_ref)
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(or_(Task.title.ilike(term), Task.task_ref.ilike(term)))

        # Specific filters
        if status_filter and status_filter.strip():
            query = query.filter(Task.status == status_filter.strip())

        if priority_filter and priority_filter.strip():
            query = query.filter(Task.priority == priority_filter.strip())

        if team_id_filter and team_id_filter.strip():
            query = query.filter(Task.team_id == team_id_filter.strip())

        if assignee_id_filter and assignee_id_filter.strip():
            if assignee_id_filter.strip() == "unassigned":
                query = query.filter(Task.assignee_id.is_(None))
            else:
                query = query.filter(Task.assignee_id == assignee_id_filter.strip())

        # Count total matching records
        total = query.order_by(None).count()

        # Order and paginate
        items = query.order_by(Task.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return items, total
