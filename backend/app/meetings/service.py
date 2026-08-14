from datetime import datetime
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.meeting import (
    Meeting,
    MeetingParticipant,
    MeetingAgendaItem,
    MeetingActionItem,
)
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.models.task import Task
from app.models.enums import (
    MeetingType,
    MeetingStatus,
    AttendanceStatus,
    ActionItemStatus,
    ActionItemPriority,
    ProjectRole,
)
from app.meetings.schemas import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
    MeetingParticipantCreate,
    MeetingParticipantResponse,
    MeetingAgendaItemCreate,
    MeetingAgendaItemUpdate,
    MeetingAgendaItemResponse,
    MeetingActionItemCreate,
    MeetingActionItemUpdate,
    MeetingActionItemResponse,
    TranscriptUpdate,
    MeetingNotesUpdate,
)
from app.meetings.repository import MeetingRepository
from app.permissions.dependencies import check_project_role_or_company_admin
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException


class MeetingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MeetingRepository(db)

    def _to_participant_response(self, p: MeetingParticipant) -> MeetingParticipantResponse:
        user_name = f"{p.user.first_name} {p.user.last_name}" if p.user else None
        user_email = p.user.email if p.user else None
        return MeetingParticipantResponse(
            id=p.id,
            meeting_id=p.meeting_id,
            user_id=p.user_id,
            user_name=user_name,
            user_email=user_email,
            attendance_status=p.attendance_status,
            joined_at=p.joined_at,
            left_at=p.left_at,
        )

    def _to_agenda_response(self, a: MeetingAgendaItem) -> MeetingAgendaItemResponse:
        return MeetingAgendaItemResponse(
            id=a.id,
            meeting_id=a.meeting_id,
            title=a.title,
            description=a.description,
            order_index=a.order_index,
            status=a.status,
        )

    def _to_action_item_response(self, ai: MeetingActionItem) -> MeetingActionItemResponse:
        assignee_name = f"{ai.assignee.first_name} {ai.assignee.last_name}" if ai.assignee else None
        requirement_key = ai.requirement.requirement_key if ai.requirement else None
        task_title = ai.task.title if ai.task else None

        return MeetingActionItemResponse(
            id=ai.id,
            meeting_id=ai.meeting_id,
            title=ai.title,
            description=ai.description,
            assigned_to=ai.assigned_to,
            assignee_name=assignee_name,
            due_date=ai.due_date,
            status=ai.status,
            priority=ai.priority,
            requirement_id=ai.requirement_id,
            requirement_key=requirement_key,
            task_id=ai.task_id,
            task_title=task_title,
            created_at=ai.created_at,
            updated_at=ai.updated_at,
        )

    def _to_meeting_response(self, m: Meeting) -> MeetingResponse:
        organizer_name = f"{m.organizer.first_name} {m.organizer.last_name}" if m.organizer else None
        participants = [self._to_participant_response(p) for p in m.participants]
        agenda_items = [self._to_agenda_response(a) for a in m.agenda_items]
        action_items = [self._to_action_item_response(ai) for ai in m.action_items]

        return MeetingResponse(
            id=m.id,
            project_id=m.project_id,
            company_id=m.company_id,
            title=m.title,
            description=m.description,
            meeting_type=m.meeting_type,
            organizer_id=m.organizer_id,
            organizer_name=organizer_name,
            scheduled_at=m.scheduled_at,
            duration_minutes=m.duration_minutes,
            status=m.status,
            summary=m.summary,
            decisions=m.decisions,
            discussion_notes=m.discussion_notes,
            risks_concerns=m.risks_concerns,
            transcript=m.transcript,
            transcript_updated_at=m.transcript_updated_at,
            recording_url_or_reference=m.recording_url_or_reference,
            created_at=m.created_at,
            updated_at=m.updated_at,
            participants=participants,
            agenda_items=agenda_items,
            action_items=action_items,
        )

    def _verify_user_in_project(self, project_id: UUID, user_id: UUID, company_id: UUID):
        """Verifies target user belongs to the project or company."""
        member = self.db.execute(
            select(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
        ).scalar_one_or_none()

        if not member:
            # Check if user is company admin/owner
            user = self.db.execute(select(User).filter(User.id == user_id)).scalar_one_or_none()
            if not user or str(user.company_id) != str(company_id):
                raise BaseBusinessException(f"User {user_id} does not belong to this project or company.", status_code=400)

    def create_meeting(
        self,
        project_id: UUID,
        data: MeetingCreate,
        current_user: User,
    ) -> MeetingResponse:
        """
        Creates a new meeting with agenda items and participants.
        Allowed roles: PM, Team Lead, Developer, or Company Admin/Owner.
        """
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )

        organizer_id = data.organizer_id or current_user.id
        self._verify_user_in_project(project_id, organizer_id, project.company_id)

        meeting = Meeting(
            project_id=project_id,
            company_id=project.company_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            meeting_type=data.meeting_type,
            organizer_id=organizer_id,
            scheduled_at=data.scheduled_at,
            duration_minutes=data.duration_minutes,
            status=MeetingStatus.SCHEDULED,
        )
        self.repo.create_meeting(meeting)

        # Add organizer as an ATTENDED/INVITED participant automatically
        participant_set = set(data.participant_ids)
        participant_set.add(organizer_id)

        for uid in participant_set:
            self._verify_user_in_project(project_id, uid, project.company_id)
            part = MeetingParticipant(
                meeting_id=meeting.id,
                user_id=uid,
                attendance_status=AttendanceStatus.INVITED,
            )
            self.db.add(part)

        # Add Agenda Items
        for idx, ag_data in enumerate(data.agenda_items):
            ag_item = MeetingAgendaItem(
                meeting_id=meeting.id,
                title=ag_data.title.strip(),
                description=ag_data.description.strip() if ag_data.description else None,
                order_index=ag_data.order_index or idx,
                status=ag_data.status or "PLANNED",
            )
            self.db.add(ag_item)

        self.db.commit()

        full_meeting = self.repo.get_meeting(meeting.id, project_id)
        return self._to_meeting_response(full_meeting)

    def list_meetings(
        self,
        project_id: UUID,
        current_user: User,
        status: Optional[MeetingStatus] = None,
        meeting_type: Optional[MeetingType] = None,
        organizer_id: Optional[UUID] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> MeetingListResponse:
        check_project_role_or_company_admin(self.db, current_user, project_id)

        items, total = self.repo.list_meetings(
            project_id=project_id,
            status=status,
            meeting_type=meeting_type,
            organizer_id=organizer_id,
            keyword=keyword,
            page=page,
            page_size=page_size,
        )

        responses = [self._to_meeting_response(m) for m in items]
        return MeetingListResponse(
            meetings=responses,
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_meeting(
        self,
        project_id: UUID,
        meeting_id: UUID,
        current_user: User,
    ) -> MeetingResponse:
        check_project_role_or_company_admin(self.db, current_user, project_id)
        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")
        return self._to_meeting_response(m)

    def update_meeting(
        self,
        project_id: UUID,
        meeting_id: UUID,
        data: MeetingUpdate,
        current_user: User,
    ) -> MeetingResponse:
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )

        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")

        if str(m.company_id) != str(project.company_id):
            raise Forbidden("Cross-company meeting access denied.")

        if data.title is not None:
            m.title = data.title.strip()
        if data.description is not None:
            m.description = data.description.strip()
        if data.meeting_type is not None:
            m.meeting_type = data.meeting_type
        if data.organizer_id is not None:
            self._verify_user_in_project(project_id, data.organizer_id, project.company_id)
            m.organizer_id = data.organizer_id
        if data.scheduled_at is not None:
            m.scheduled_at = data.scheduled_at
        if data.duration_minutes is not None:
            m.duration_minutes = data.duration_minutes
        if data.status is not None:
            m.status = data.status
        if data.summary is not None:
            m.summary = data.summary.strip()
        if data.decisions is not None:
            m.decisions = data.decisions.strip()
        if data.discussion_notes is not None:
            m.discussion_notes = data.discussion_notes.strip()
        if data.risks_concerns is not None:
            m.risks_concerns = data.risks_concerns.strip()

        self.db.commit()
        full_m = self.repo.get_meeting(m.id, project_id)
        return self._to_meeting_response(full_m)

    def cancel_meeting(
        self,
        project_id: UUID,
        meeting_id: UUID,
        current_user: User,
    ) -> MeetingResponse:
        return self.update_meeting(
            project_id,
            meeting_id,
            MeetingUpdate(status=MeetingStatus.CANCELLED),
            current_user,
        )

    # --- Participants Management ---
    def add_participant(
        self,
        project_id: UUID,
        meeting_id: UUID,
        data: MeetingParticipantCreate,
        current_user: User,
    ) -> MeetingParticipantResponse:
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )

        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")

        self._verify_user_in_project(project_id, data.user_id, project.company_id)

        existing = self.repo.get_participant(meeting_id, data.user_id)
        if existing:
            existing.attendance_status = data.attendance_status
            self.db.commit()
            self.db.refresh(existing)
            return self._to_participant_response(existing)

        part = MeetingParticipant(
            meeting_id=meeting_id,
            user_id=data.user_id,
            attendance_status=data.attendance_status,
        )
        self.repo.add_participant(part)

        # Fetch with user relation
        full_part = self.repo.get_participant(meeting_id, data.user_id)
        return self._to_participant_response(full_part)

    def remove_participant(
        self,
        project_id: UUID,
        meeting_id: UUID,
        user_id: UUID,
        current_user: User,
    ):
        check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")

        success = self.repo.remove_participant(meeting_id, user_id)
        if not success:
            raise ResourceNotFound("Participant not found.")

    # --- Agenda Management ---
    def add_agenda_item(
        self,
        project_id: UUID,
        meeting_id: UUID,
        data: MeetingAgendaItemCreate,
        current_user: User,
    ) -> MeetingAgendaItemResponse:
        check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")

        item = MeetingAgendaItem(
            meeting_id=meeting_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            order_index=data.order_index,
            status=data.status or "PLANNED",
        )
        created = self.repo.create_agenda_item(item)
        return self._to_agenda_response(created)

    def update_agenda_item(
        self,
        project_id: UUID,
        meeting_id: UUID,
        item_id: UUID,
        data: MeetingAgendaItemUpdate,
        current_user: User,
    ) -> MeetingAgendaItemResponse:
        check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        item = self.repo.get_agenda_item(item_id, meeting_id)
        if not item:
            raise ResourceNotFound("Agenda item not found.")

        if data.title is not None:
            item.title = data.title.strip()
        if data.description is not None:
            item.description = data.description.strip()
        if data.order_index is not None:
            item.order_index = data.order_index
        if data.status is not None:
            item.status = data.status

        self.db.commit()
        return self._to_agenda_response(item)

    def delete_agenda_item(
        self,
        project_id: UUID,
        meeting_id: UUID,
        item_id: UUID,
        current_user: User,
    ):
        check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        success = self.repo.delete_agenda_item(item_id, meeting_id)
        if not success:
            raise ResourceNotFound("Agenda item not found.")

    # --- Transcript Management ---
    def update_transcript(
        self,
        project_id: UUID,
        meeting_id: UUID,
        data: TranscriptUpdate,
        current_user: User,
    ) -> MeetingResponse:
        check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")

        m.transcript = data.transcript.strip()
        m.transcript_updated_at = datetime.utcnow()
        if data.recording_url_or_reference is not None:
            m.recording_url_or_reference = data.recording_url_or_reference.strip()

        self.db.commit()
        full_m = self.repo.get_meeting(m.id, project_id)
        return self._to_meeting_response(full_m)

    # --- Action Items Management & Traceability ---
    def create_action_item(
        self,
        project_id: UUID,
        meeting_id: UUID,
        data: MeetingActionItemCreate,
        current_user: User,
    ) -> MeetingActionItemResponse:
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        m = self.repo.get_meeting(meeting_id, project_id)
        if not m:
            raise ResourceNotFound("Meeting not found.")

        # Verify assigned user belongs to project
        if data.assigned_to:
            self._verify_user_in_project(project_id, data.assigned_to, project.company_id)

        # Requirement traceability check
        if data.requirement_id:
            req = self.db.execute(
                select(Requirement).filter(
                    Requirement.id == data.requirement_id,
                    Requirement.project_id == project_id,
                )
            ).scalar_one_or_none()
            if not req:
                raise BaseBusinessException("Linked requirement not found in this project.", status_code=400)

        # Task traceability check
        if data.task_id:
            task = self.db.execute(
                select(Task).filter(
                    Task.id == data.task_id,
                    Task.project_id == project_id,
                )
            ).scalar_one_or_none()
            if not task:
                raise BaseBusinessException("Linked task not found in this project.", status_code=400)

        action_item = MeetingActionItem(
            meeting_id=meeting_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            assigned_to=data.assigned_to,
            due_date=data.due_date,
            status=ActionItemStatus.OPEN,
            priority=data.priority,
            requirement_id=data.requirement_id,
            task_id=data.task_id,
        )
        created = self.repo.create_action_item(action_item)
        full_item = self.repo.get_action_item(created.id, meeting_id)
        return self._to_action_item_response(full_item)

    def update_action_item(
        self,
        project_id: UUID,
        meeting_id: UUID,
        item_id: UUID,
        data: MeetingActionItemUpdate,
        current_user: User,
    ) -> MeetingActionItemResponse:
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        item = self.repo.get_action_item(item_id, meeting_id)
        if not item:
            raise ResourceNotFound("Action item not found.")

        if data.title is not None:
            item.title = data.title.strip()
        if data.description is not None:
            item.description = data.description.strip()
        if data.assigned_to is not None:
            self._verify_user_in_project(project_id, data.assigned_to, project.company_id)
            item.assigned_to = data.assigned_to
        if data.due_date is not None:
            item.due_date = data.due_date
        if data.status is not None:
            item.status = data.status
        if data.priority is not None:
            item.priority = data.priority

        if data.requirement_id is not None:
            req = self.db.execute(
                select(Requirement).filter(
                    Requirement.id == data.requirement_id,
                    Requirement.project_id == project_id,
                )
            ).scalar_one_or_none()
            if not req:
                raise BaseBusinessException("Linked requirement not found in this project.", status_code=400)
            item.requirement_id = data.requirement_id

        if data.task_id is not None:
            task = self.db.execute(
                select(Task).filter(
                    Task.id == data.task_id,
                    Task.project_id == project_id,
                )
            ).scalar_one_or_none()
            if not task:
                raise BaseBusinessException("Linked task not found in this project.", status_code=400)
            item.task_id = data.task_id

        self.db.commit()
        full_item = self.repo.get_action_item(item.id, meeting_id)
        return self._to_action_item_response(full_item)

    def delete_action_item(
        self,
        project_id: UUID,
        meeting_id: UUID,
        item_id: UUID,
        current_user: User,
    ):
        check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )
        success = self.repo.delete_action_item(item_id, meeting_id)
        if not success:
            raise ResourceNotFound("Action item not found.")
