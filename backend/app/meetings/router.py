from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.enums import MeetingType, MeetingStatus
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
)
from app.meetings.service import MeetingService
from app.permissions.dependencies import get_current_user
from app.common.responses import APIResponse, success_response

router = APIRouter(tags=["Meetings"])


@router.post(
    "/projects/{project_id}/meetings",
    response_model=APIResponse[MeetingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new project meeting",
)
def create_meeting(
    project_id: UUID,
    data: MeetingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.create_meeting(project_id, data, current_user)
    return success_response(message="Meeting scheduled successfully.", data=result)


@router.get(
    "/projects/{project_id}/meetings",
    response_model=APIResponse[MeetingListResponse],
    status_code=status.HTTP_200_OK,
    summary="List project meetings with filters and pagination",
)
def list_meetings(
    project_id: UUID,
    status_val: Optional[MeetingStatus] = Query(None, alias="status", description="Filter by meeting status"),
    meeting_type: Optional[MeetingType] = Query(None, description="Filter by meeting type"),
    organizer_id: Optional[UUID] = Query(None, description="Filter by organizer user ID"),
    keyword: Optional[str] = Query(None, description="Search keyword in title, description, or summary"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.list_meetings(
        project_id=project_id,
        current_user=current_user,
        status=status_val,
        meeting_type=meeting_type,
        organizer_id=organizer_id,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return success_response(message="Meetings retrieved successfully.", data=result)


@router.get(
    "/projects/{project_id}/meetings/{meeting_id}",
    response_model=APIResponse[MeetingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get full meeting details",
)
def get_meeting(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.get_meeting(project_id, meeting_id, current_user)
    return success_response(message="Meeting details retrieved successfully.", data=result)


@router.patch(
    "/projects/{project_id}/meetings/{meeting_id}",
    response_model=APIResponse[MeetingResponse],
    status_code=status.HTTP_200_OK,
    summary="Update meeting details, notes, or status",
)
def update_meeting(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.update_meeting(project_id, meeting_id, data, current_user)
    return success_response(message="Meeting updated successfully.", data=result)


@router.delete(
    "/projects/{project_id}/meetings/{meeting_id}",
    response_model=APIResponse[MeetingResponse],
    status_code=status.HTTP_200_OK,
    summary="Cancel a meeting",
)
def cancel_meeting(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.cancel_meeting(project_id, meeting_id, current_user)
    return success_response(message="Meeting cancelled successfully.", data=result)


# --- Participants Router Endpoints ---
@router.post(
    "/projects/{project_id}/meetings/{meeting_id}/participants",
    response_model=APIResponse[MeetingParticipantResponse],
    status_code=status.HTTP_200_OK,
)
def add_participant(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingParticipantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.add_participant(project_id, meeting_id, data, current_user)
    return success_response(message="Participant added/updated.", data=result)


@router.delete(
    "/projects/{project_id}/meetings/{meeting_id}/participants/{user_id}",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
)
def remove_participant(
    project_id: UUID,
    meeting_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    service.remove_participant(project_id, meeting_id, user_id, current_user)
    return success_response(message="Participant removed successfully.")


# --- Agenda Router Endpoints ---
@router.post(
    "/projects/{project_id}/meetings/{meeting_id}/agenda",
    response_model=APIResponse[MeetingAgendaItemResponse],
    status_code=status.HTTP_201_CREATED,
)
def add_agenda_item(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingAgendaItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.add_agenda_item(project_id, meeting_id, data, current_user)
    return success_response(message="Agenda item added.", data=result)


@router.patch(
    "/projects/{project_id}/meetings/{meeting_id}/agenda/{item_id}",
    response_model=APIResponse[MeetingAgendaItemResponse],
    status_code=status.HTTP_200_OK,
)
def update_agenda_item(
    project_id: UUID,
    meeting_id: UUID,
    item_id: UUID,
    data: MeetingAgendaItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.update_agenda_item(project_id, meeting_id, item_id, data, current_user)
    return success_response(message="Agenda item updated.", data=result)


@router.delete(
    "/projects/{project_id}/meetings/{meeting_id}/agenda/{item_id}",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
)
def delete_agenda_item(
    project_id: UUID,
    meeting_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    service.delete_agenda_item(project_id, meeting_id, item_id, current_user)
    return success_response(message="Agenda item deleted.")


# --- Transcript Router Endpoints ---
@router.get(
    "/projects/{project_id}/meetings/{meeting_id}/transcript",
    response_model=APIResponse[dict],
    status_code=status.HTTP_200_OK,
)
def get_transcript(
    project_id: UUID,
    meeting_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    m = service.get_meeting(project_id, meeting_id, current_user)
    return success_response(
        message="Transcript retrieved.",
        data={
            "meeting_id": m.id,
            "transcript": m.transcript,
            "transcript_updated_at": m.transcript_updated_at,
            "recording_url_or_reference": m.recording_url_or_reference,
        },
    )


@router.put(
    "/projects/{project_id}/meetings/{meeting_id}/transcript",
    response_model=APIResponse[MeetingResponse],
    status_code=status.HTTP_200_OK,
)
def update_transcript(
    project_id: UUID,
    meeting_id: UUID,
    data: TranscriptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.update_transcript(project_id, meeting_id, data, current_user)
    return success_response(message="Transcript updated.", data=result)


# --- Action Items Router Endpoints ---
@router.post(
    "/projects/{project_id}/meetings/{meeting_id}/action-items",
    response_model=APIResponse[MeetingActionItemResponse],
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(
    project_id: UUID,
    meeting_id: UUID,
    data: MeetingActionItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.create_action_item(project_id, meeting_id, data, current_user)
    return success_response(message="Action item created.", data=result)


@router.patch(
    "/projects/{project_id}/meetings/{meeting_id}/action-items/{item_id}",
    response_model=APIResponse[MeetingActionItemResponse],
    status_code=status.HTTP_200_OK,
)
def update_action_item(
    project_id: UUID,
    meeting_id: UUID,
    item_id: UUID,
    data: MeetingActionItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    result = service.update_action_item(project_id, meeting_id, item_id, data, current_user)
    return success_response(message="Action item updated.", data=result)


@router.delete(
    "/projects/{project_id}/meetings/{meeting_id}/action-items/{item_id}",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
)
def delete_action_item(
    project_id: UUID,
    meeting_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MeetingService(db)
    service.delete_action_item(project_id, meeting_id, item_id, current_user)
    return success_response(message="Action item deleted.")
