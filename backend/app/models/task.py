import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_ref: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open", index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="medium", index=True, nullable=False)
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assignee_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    team = relationship("Team", back_populates="tasks")
    creator = relationship("User", back_populates="created_tasks", foreign_keys=[created_by_id])
    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assignee_id])
    activities = relationship("AuditEvent", back_populates="task", cascade="all, delete-orphan", order_by="AuditEvent.created_at.desc()")
