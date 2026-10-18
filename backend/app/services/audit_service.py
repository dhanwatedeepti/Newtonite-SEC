import json
from typing import Any, Dict, List
from sqlalchemy.orm import Session, joinedload
from app.models.audit import AuditEvent
from app.schemas.audit import AuditEventResponse
from app.schemas.user import UserSimpleResponse


class AuditService:
    @staticmethod
    def get_task_activity(db: Session, task_id: str) -> List[AuditEventResponse]:
        events = db.query(AuditEvent).options(
            joinedload(AuditEvent.user)
        ).filter(AuditEvent.task_id == task_id).order_by(AuditEvent.created_at.desc()).all()

        results = []
        for e in events:
            details_dict = {}
            if e.details:
                try:
                    details_dict = json.loads(e.details)
                except Exception:
                    details_dict = {"raw": e.details}
            
            user_simple = None
            if e.user:
                user_simple = UserSimpleResponse(
                    id=e.user.id,
                    email=e.user.email,
                    full_name=e.user.full_name,
                    global_role=e.user.global_role
                )

            results.append(AuditEventResponse(
                id=e.id,
                task_id=e.task_id,
                user_id=e.user_id,
                action=e.action,
                details=details_dict,
                created_at=e.created_at,
                user=user_simple
            ))
        return results
