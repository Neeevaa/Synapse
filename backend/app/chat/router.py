from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.permissions.dependencies import get_current_user
from app.models.user import User
from app.common.responses import success_response
from app.chat.schemas import (
    MessageCreateRequest,
    DirectConversationCreateRequest,
)
from app.chat import service

router = APIRouter(tags=["Project Messaging"])


@router.get("/projects/{project_id}/chat/conversations", status_code=status.HTTP_200_OK)
def list_conversations(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists conversations available to current user in this project."""
    conversations = service.list_user_conversations(db, project_id, current_user)
    return success_response(
        message="Conversations retrieved successfully.",
        data=conversations,
    )


@router.get("/projects/{project_id}/chat/unread-count", status_code=status.HTTP_200_OK)
def get_unread_chat_count(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns unread message count for current user in this project."""
    count = service.get_user_unread_messages_count(db, project_id, current_user)
    return success_response(
        message="Unread chat count retrieved successfully.",
        data={"unread_count": count},
    )



@router.get("/projects/{project_id}/chat/group", status_code=status.HTTP_200_OK)
def get_canonical_project_group(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves or safely creates canonical group conversation for the project."""
    group = service.get_or_create_project_group(db, project_id, current_user)
    return success_response(
        message="Project group conversation retrieved successfully.",
        data={
            "id": group.id,
            "project_id": group.project_id,
            "conversation_type": group.conversation_type,
            "name": group.name,
            "created_by": group.created_by,
            "created_at": group.created_at,
            "updated_at": group.updated_at,
            "members": [
                {
                    "id": m.id,
                    "user_id": m.user_id,
                    "user": {
                        "id": m.user.id,
                        "first_name": m.user.first_name,
                        "last_name": m.user.last_name,
                        "email": m.user.email,
                        "avatar_url": m.user.avatar_url,
                        "role": m.user.role.value if m.user.role else None,
                        "designation": m.user.designation,
                    },
                    "joined_at": m.joined_at,
                    "last_read_at": m.last_read_at,
                }
                for m in group.members if m.user is not None
            ],
        },
    )


@router.post("/projects/{project_id}/chat/direct", status_code=status.HTTP_200_OK)
def get_or_create_direct_conversation(
    project_id: UUID,
    payload: DirectConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Finds or creates an individual conversation with an authorized recipient."""
    conv = service.get_or_create_direct_conversation(
        db,
        project_id,
        current_user,
        payload.recipient_id,
    )
    return success_response(
        message="Direct conversation retrieved successfully.",
        data={
            "id": conv.id,
            "project_id": conv.project_id,
            "conversation_type": conv.conversation_type,
            "name": conv.name,
            "created_by": conv.created_by,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "members": [
                {
                    "id": m.id,
                    "user_id": m.user_id,
                    "user": {
                        "id": m.user.id,
                        "first_name": m.user.first_name,
                        "last_name": m.user.last_name,
                        "email": m.user.email,
                        "avatar_url": m.user.avatar_url,
                        "role": m.user.role.value if m.user.role else None,
                        "designation": m.user.designation,
                    },
                    "joined_at": m.joined_at,
                    "last_read_at": m.last_read_at,
                }
                for m in conv.members if m.user is not None
            ],
        },
    )


@router.get("/projects/{project_id}/chat/participants", status_code=status.HTTP_200_OK)
def get_eligible_participants(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists eligible contacts the current user may direct message in this project."""
    participants = service.get_eligible_participants(db, project_id, current_user)
    return success_response(
        message="Eligible participants retrieved successfully.",
        data=participants,
    )


@router.get(
    "/projects/{project_id}/chat/conversations/{conversation_id}/messages",
    status_code=status.HTTP_200_OK,
)
def get_conversation_messages(
    project_id: UUID,
    conversation_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves paginated message history for a conversation."""
    messages, total = service.get_conversation_messages(
        db,
        project_id,
        conversation_id,
        current_user,
        limit=limit,
        offset=offset,
    )
    return success_response(
        message="Messages retrieved successfully.",
        data={
            "messages": [
                {
                    "id": msg.id,
                    "conversation_id": msg.conversation_id,
                    "sender_id": msg.sender_id,
                    "sender": {
                        "id": msg.sender.id,
                        "first_name": msg.sender.first_name,
                        "last_name": msg.sender.last_name,
                        "email": msg.sender.email,
                        "avatar_url": msg.sender.avatar_url,
                        "role": msg.sender.role.value if msg.sender.role else None,
                        "designation": msg.sender.designation,
                    },
                    "content": msg.content,
                    "created_at": msg.created_at,
                    "updated_at": msg.updated_at,
                }
                for msg in messages
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        },
    )


@router.post(
    "/projects/{project_id}/chat/conversations/{conversation_id}/messages",
    status_code=status.HTTP_201_CREATED,
)
def post_message(
    project_id: UUID,
    conversation_id: UUID,
    payload: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persists a new message to PostgreSQL and returns the saved message."""
    msg = service.send_message(
        db,
        project_id,
        conversation_id,
        current_user,
        payload.content,
    )
    return success_response(
        message="Message sent successfully.",
        data={
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "sender": {
                "id": msg.sender.id,
                "first_name": msg.sender.first_name,
                "last_name": msg.sender.last_name,
                "email": msg.sender.email,
                "avatar_url": msg.sender.avatar_url,
                "role": msg.sender.role.value if msg.sender.role else None,
                "designation": msg.sender.designation,
            },
            "content": msg.content,
            "created_at": msg.created_at,
            "updated_at": msg.updated_at,
        },
    )
