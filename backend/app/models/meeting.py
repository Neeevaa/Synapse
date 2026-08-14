from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base
from app.models.enums import (
    MeetingType,
    MeetingStatus,
    AttendanceStatus,
    ActionItemStatus,
    ActionItemPriority,
)


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meeting_type = Column(
        Enum(MeetingType),
        nullable=False,
        default=MeetingType.PLANNING,
    )
    organizer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(
        Enum(MeetingStatus),
        nullable=False,
        default=MeetingStatus.SCHEDULED,
    )
    # Structured Notes
    summary = Column(Text, nullable=True)
    decisions = Column(Text, nullable=True)
    discussion_notes = Column(Text, nullable=True)
    risks_concerns = Column(Text, nullable=True)

    # Transcript & Recording
    transcript = Column(Text, nullable=True)
    transcript_updated_at = Column(DateTime(timezone=True), nullable=True)
    recording_url_or_reference = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    project = relationship("Project", backref="meetings")
    company = relationship("Company", backref="meetings")
    organizer = relationship("User", foreign_keys=[organizer_id])

    participants = relationship(
        "MeetingParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    agenda_items = relationship(
        "MeetingAgendaItem",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="MeetingAgendaItem.order_index.asc()",
    )
    action_items = relationship(
        "MeetingActionItem",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="MeetingActionItem.created_at.desc()",
    )


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_status = Column(
        Enum(AttendanceStatus),
        nullable=False,
        default=AttendanceStatus.INVITED,
    )
    joined_at = Column(DateTime(timezone=True), nullable=True)
    left_at = Column(DateTime(timezone=True), nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])


class MeetingAgendaItem(Base):
    __tablename__ = "meeting_agenda_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="PLANNED")

    meeting = relationship("Meeting", back_populates="agenda_items")


class MeetingActionItem(Base):
    __tablename__ = "meeting_action_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        Enum(ActionItemStatus),
        nullable=False,
        default=ActionItemStatus.OPEN,
    )
    priority = Column(
        Enum(ActionItemPriority),
        nullable=False,
        default=ActionItemPriority.MEDIUM,
    )
    requirement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirements.id", ondelete="SET NULL"),
        nullable=True,
    )
    task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    meeting = relationship("Meeting", back_populates="action_items")
    assignee = relationship("User", foreign_keys=[assigned_to])
    requirement = relationship("Requirement", foreign_keys=[requirement_id])
    task = relationship("Task", foreign_keys=[task_id])
