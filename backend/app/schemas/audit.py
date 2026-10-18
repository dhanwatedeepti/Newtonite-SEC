from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserSimpleResponse


class AuditEventResponse(BaseModel):
    id: str
    task_id: str
    user_id: Optional[str] = None
    action: str
    details: Dict[str, Any] = {}
    created_at: datetime
    user: Optional[UserSimpleResponse] = None

    model_config = ConfigDict(from_attributes=True)
