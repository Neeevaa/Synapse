from uuid import UUID
from typing import Optional
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.meeting import (
    Meeting,
    MeetingParticipant,
    MeetingAgendaItem,
    MeetingActionItem,
)
from app.models.enums import MeetingType, MeetingStatus


class MeetingRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_meeting(self, meeting: Meeting) -> Meeting:
        self.db.add(meeting)
        self.db.commit()
        self.db.refresh(meeting)
        return meeting

    def get_meeting(self, meeting_id: UUID, project_id: UUID) -> Optional[Meeting]:
        return (
            self.db.execute(
                select(Meeting)
                .options(
                    joinedload(Meeting.organizer),
                    joinedload(Meeting.participants).joinedload(MeetingParticipant.user),
                    joinedload(Meeting.agenda_items),
                    joinedload(Meeting.action_items).joinedload(MeetingActionItem.assignee),
                    joinedload(Meeting.action_items).joinedload(MeetingActionItem.requirement),
                    joinedload(Meeting.action_items).joinedload(MeetingActionItem.task),
                )
                .filter(
                    Meeting.id == meeting_id,
                    Meeting.project_id == project_id,
                )
            )
            .unique()
            .scalar_one_or_none()
        )

    def list_meetings(
        self,
        project_id: UUID,
        status: Optional[MeetingStatus] = None,
        meeting_type: Optional[MeetingType] = None,
        organizer_id: Optional[UUID] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Meeting], int]:
        stmt = (
            select(Meeting)
            .options(
                joinedload(Meeting.organizer),
                joinedload(Meeting.participants).joinedload(MeetingParticipant.user),
                joinedload(Meeting.agenda_items),
                joinedload(Meeting.action_items).joinedload(MeetingActionItem.assignee),
            )
            .filter(Meeting.project_id == project_id)
        )

        if status:
            stmt = stmt.filter(Meeting.status == status)
        if meeting_type:
            stmt = stmt.filter(Meeting.meeting_type == meeting_type)
        if organizer_id:
            stmt = stmt.filter(Meeting.organizer_id == organizer_id)
        if keyword:
            pattern = f"%{keyword.strip()}%"
            stmt = stmt.filter(
                or_(
                    Meeting.title.ilike(pattern),
                    Meeting.description.ilike(pattern),
                    Meeting.summary.ilike(pattern),
                )
            )

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.db.scalar(count_stmt) or 0

        stmt = stmt.order_by(desc(Meeting.scheduled_at))
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        results = self.db.execute(stmt).scalars().unique().all()
        return list(results), total

    def add_participant(self, participant: MeetingParticipant) -> MeetingParticipant:
        self.db.add(participant)
        self.db.commit()
        self.db.refresh(participant)
        return participant

    def get_participant(self, meeting_id: UUID, user_id: UUID) -> Optional[MeetingParticipant]:
        return self.db.execute(
            select(MeetingParticipant).filter(
                MeetingParticipant.meeting_id == meeting_id,
                MeetingParticipant.user_id == user_id,
            )
        ).scalar_one_or_none()

    def remove_participant(self, meeting_id: UUID, user_id: UUID) -> bool:
        part = self.get_participant(meeting_id, user_id)
        if part:
            self.db.delete(part)
            self.db.commit()
            return True
        return False

    def create_agenda_item(self, item: MeetingAgendaItem) -> MeetingAgendaItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_agenda_item(self, item_id: UUID, meeting_id: UUID) -> Optional[MeetingAgendaItem]:
        return self.db.execute(
            select(MeetingAgendaItem).filter(
                MeetingAgendaItem.id == item_id,
                MeetingAgendaItem.meeting_id == meeting_id,
            )
        ).scalar_one_or_none()

    def delete_agenda_item(self, item_id: UUID, meeting_id: UUID) -> bool:
        item = self.get_agenda_item(item_id, meeting_id)
        if item:
            self.db.delete(item)
            self.db.commit()
            return True
        return False

    def create_action_item(self, item: MeetingActionItem) -> MeetingActionItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_action_item(self, item_id: UUID, meeting_id: UUID) -> Optional[MeetingActionItem]:
        return (
            self.db.execute(
                select(MeetingActionItem)
                .options(
                    joinedload(MeetingActionItem.assignee),
                    joinedload(MeetingActionItem.requirement),
                    joinedload(MeetingActionItem.task),
                )
                .filter(
                    MeetingActionItem.id == item_id,
                    MeetingActionItem.meeting_id == meeting_id,
                )
            )
            .unique()
            .scalar_one_or_none()
        )

    def delete_action_item(self, item_id: UUID, meeting_id: UUID) -> bool:
        item = self.get_agenda_item(item_id, meeting_id)  # Note: verify delete_action_item fetches action_item
        act_item = self.db.execute(
            select(MeetingActionItem).filter(
                MeetingActionItem.id == item_id,
                MeetingActionItem.meeting_id == meeting_id,
            )
        ).scalar_one_or_none()
        if act_item:
            self.db.delete(act_item)
            self.db.commit()
            return True
        return False
