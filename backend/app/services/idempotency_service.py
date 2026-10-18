import json
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.idempotency import IdempotencyRecord


class IdempotencyService:
    @staticmethod
    def get_record(db: Session, key: str, user_id: str) -> Optional[IdempotencyRecord]:
        return db.query(IdempotencyRecord).filter(
            IdempotencyRecord.key == key,
            IdempotencyRecord.user_id == user_id
        ).first()

    @staticmethod
    def save_record(
        db: Session,
        key: str,
        user_id: str,
        request_path: str,
        status_code: int,
        response_body: str
    ) -> IdempotencyRecord:
        record = IdempotencyRecord(
            key=key,
            user_id=user_id,
            request_path=request_path,
            response_status=status_code,
            response_body=response_body,
            created_at=datetime.now(timezone.utc)
        )
        db.add(record)
        db.commit()
        return record
