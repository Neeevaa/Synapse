import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import Session, joinedload

from app.models.conversation import Conversation, ConversationMember, Message
from app.models.enums import ConversationType, CompanyRole, ProjectRole
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.common.exceptions import (
    BaseBusinessException,
    Forbidden,
    ResourceNotFound,
    ValidationException,
)

logger = logging.getLogger(__name__)

AUTHORIZED_PROJECT_ROLES = {
    ProjectRole.PROJECT_MANAGER,
    ProjectRole.TEAM_LEAD,
    ProjectRole.DEVELOPER,
}


def is_cto(user: User) -> bool:
    """Returns True if the user is the company Owner/CTO."""
    if user.role == CompanyRole.OWNER:
        return True
    if user.designation and "cto" in user.designation.lower():
        return True
    return False


def get_project_or_404(db: Session, project_id: UUID, user: User) -> Project:
    """Verifies that project exists and user belongs to the same tenant company."""
    project = db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
    if not project:
        raise ResourceNotFound("Project not found.")

    if str(project.company_id) != str(user.company_id):
        raise Forbidden("You do not have access to this project.")

    return project


def get_project_member(db: Session, project_id: UUID, user_id: UUID) -> ProjectMember | None:
    return db.execute(
        select(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    ).scalar_one_or_none()


def is_project_manager(db: Session, project_id: UUID, user_id: UUID) -> bool:
    pm = get_project_member(db, project_id, user_id)
    return pm is not None and pm.role == ProjectRole.PROJECT_MANAGER


def is_authorized_project_member(db: Session, project_id: UUID, user_id: UUID) -> bool:
    pm = get_project_member(db, project_id, user_id)
    return pm is not None and pm.role in AUTHORIZED_PROJECT_ROLES


def validate_conversation_access(
    db: Session,
    conversation: Conversation,
    user: User,
) -> None:
    """
    Validates whether the given user has permission to view or post to this conversation.
    Strictly enforces CTO restrictions and project membership boundaries.
    """
    if conversation.conversation_type == ConversationType.PROJECT_GROUP:
        if is_cto(user):
            raise Forbidden("CTOs are not permitted to access or participate in project group chats.")
        if not is_authorized_project_member(db, conversation.project_id, user.id):
            raise Forbidden("You must be an authorized member of this project to access the group chat.")
        return

    if conversation.conversation_type == ConversationType.DIRECT:
        # Check if user is a member of this direct conversation
        member = db.execute(
            select(ConversationMember).filter(
                ConversationMember.conversation_id == conversation.id,
                ConversationMember.user_id == user.id,
            )
        ).scalar_one_or_none()
        if not member:
            raise Forbidden("You are not an authorized participant in this conversation.")
        return

    raise Forbidden("Unsupported conversation type.")


def get_or_create_project_group(
    db: Session,
    project_id: UUID,
    current_user: User,
) -> Conversation:
    """
    Idempotently retrieves or creates the canonical project-wide group conversation.
    Strictly forbids CTOs.
    """
    project = get_project_or_404(db, project_id, current_user)

    if is_cto(current_user):
        raise Forbidden("CTOs are not permitted to access or participate in project group chats.")

    if not is_authorized_project_member(db, project_id, current_user.id):
        raise Forbidden("You must be an authorized member of this project to access the group chat.")

    group = db.execute(
        select(Conversation)
        .options(
            joinedload(Conversation.members).joinedload(ConversationMember.user),
        )
        .filter(
            Conversation.project_id == project_id,
            Conversation.conversation_type == ConversationType.PROJECT_GROUP,
        )
    ).unique().scalar_one_or_none()

    if not group:
        group = Conversation(
            project_id=project_id,
            conversation_type=ConversationType.PROJECT_GROUP,
            name=f"{project.name} Group",
            created_by=current_user.id,
        )
        db.add(group)
        db.flush()

        # Add all active authorized members in the project
        project_members = db.execute(
            select(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role.in_(AUTHORIZED_PROJECT_ROLES),
            )
        ).scalars().all()

        for pm in project_members:
            # CTOs must NEVER be added to project group
            member_user = db.execute(select(User).filter(User.id == pm.user_id)).scalar_one_or_none()
            if member_user and not is_cto(member_user):
                db.add(ConversationMember(conversation_id=group.id, user_id=pm.user_id))

        db.commit()
        db.refresh(group)
    else:
        # Ensure current user is in members list if missing
        existing_mem = db.execute(
            select(ConversationMember).filter(
                ConversationMember.conversation_id == group.id,
                ConversationMember.user_id == current_user.id,
            )
        ).scalar_one_or_none()
        if not existing_mem:
            db.add(ConversationMember(conversation_id=group.id, user_id=current_user.id))
            db.commit()
            db.refresh(group)

    return group


def list_user_conversations(
    db: Session,
    project_id: UUID,
    current_user: User,
) -> list[dict]:
    """
    Returns all conversations within the project accessible to current_user.
    For CTO: only direct chats with PM.
    For Dev/PM: project group chat + direct chats they belong to.
    """
    get_project_or_404(db, project_id, current_user)

    conversations = []

    # 1. Group conversation (CTO is strictly excluded)
    if not is_cto(current_user) and is_authorized_project_member(db, project_id, current_user.id):
        group_conv = get_or_create_project_group(db, project_id, current_user)
        conversations.append(group_conv)

    # 2. Direct conversations where current_user is a participant
    direct_convs = db.execute(
        select(Conversation)
        .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
        .options(
            joinedload(Conversation.members).joinedload(ConversationMember.user),
        )
        .filter(
            Conversation.project_id == project_id,
            Conversation.conversation_type == ConversationType.DIRECT,
            ConversationMember.user_id == current_user.id,
        )
        .order_by(desc(Conversation.updated_at))
    ).unique().scalars().all()

    conversations.extend(direct_convs)

    # 3. Format response with last message and unread count
    result = []
    for conv in conversations:
        # Fetch last message
        last_msg = db.execute(
            select(Message)
            .options(joinedload(Message.sender))
            .filter(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        ).scalar_one_or_none()

        # Find user's last_read_at
        user_mem = next((m for m in conv.members if m.user_id == current_user.id), None)
        unread_count = 0
        if user_mem:
            unread_query = select(func.count(Message.id)).filter(
                Message.conversation_id == conv.id,
                Message.sender_id != current_user.id,
            )
            if user_mem.last_read_at:
                unread_query = unread_query.filter(Message.created_at > user_mem.last_read_at)
            unread_count = db.execute(unread_query).scalar_one()

        result.append({
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
            "last_message": {
                "id": last_msg.id,
                "conversation_id": last_msg.conversation_id,
                "sender_id": last_msg.sender_id,
                "sender": {
                    "id": last_msg.sender.id,
                    "first_name": last_msg.sender.first_name,
                    "last_name": last_msg.sender.last_name,
                    "email": last_msg.sender.email,
                    "avatar_url": last_msg.sender.avatar_url,
                    "role": last_msg.sender.role.value if last_msg.sender.role else None,
                    "designation": last_msg.sender.designation,
                },
                "content": last_msg.content,
                "created_at": last_msg.created_at,
                "updated_at": last_msg.updated_at,
            } if last_msg and last_msg.sender else None,
            "unread_count": unread_count,
        })

    return result


def get_eligible_participants(
    db: Session,
    project_id: UUID,
    current_user: User,
) -> list[dict]:
    """
    Returns the list of contacts the current user is permitted to direct-message in this project.
    - CTO can ONLY message the Project Manager.
    - Developer can message other Developers, Team Leads, and Project Manager (NEVER CTO).
    - Project Manager can message Developers, Team Leads, and the CTO.
    """
    get_project_or_404(db, project_id, current_user)
    current_is_cto = is_cto(current_user)
    current_is_pm = is_project_manager(db, project_id, current_user.id)
    current_is_member = is_authorized_project_member(db, project_id, current_user.id)

    if not current_is_cto and not current_is_member:
        raise Forbidden("You are not authorized to participate in project messaging.")

    results = []

    if current_is_cto:
        # CTO sees ONLY the Project Manager(s) of this project
        pms = db.execute(
            select(User, ProjectMember.role)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role == ProjectRole.PROJECT_MANAGER,
                User.is_active == True,
            )
        ).all()

        for u, role in pms:
            results.append({
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "avatar_url": u.avatar_url,
                "project_role": role.value if role else None,
                "company_role": u.role.value if u.role else None,
                "designation": u.designation,
                "is_cto": False,
            })
        return results

    if current_is_pm:
        # Project Manager can chat with authorized project members
        members = db.execute(
            select(User, ProjectMember.role)
            .join(ProjectMember, ProjectMember.user_id == User.id)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role.in_(AUTHORIZED_PROJECT_ROLES),
                User.id != current_user.id,
                User.is_active == True,
            )
        ).all()

        for u, role in members:
            # If a member happens to be CTO, skip here as CTO will be added under CTO list
            if not is_cto(u):
                results.append({
                    "id": u.id,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "email": u.email,
                    "avatar_url": u.avatar_url,
                    "project_role": role.value if role else None,
                    "company_role": u.role.value if u.role else None,
                    "designation": u.designation,
                    "is_cto": False,
                })

        # PM can also message company CTO(s)
        ctos = db.execute(
            select(User).filter(
                User.company_id == current_user.company_id,
                User.is_active == True,
                User.id != current_user.id,
                or_(
                    User.role == CompanyRole.OWNER,
                    User.designation.ilike("%cto%"),
                ),
            )
        ).scalars().all()

        for cto_user in ctos:
            # Avoid duplicate if already in list
            if not any(r["id"] == cto_user.id for r in results):
                results.append({
                    "id": cto_user.id,
                    "first_name": cto_user.first_name,
                    "last_name": cto_user.last_name,
                    "email": cto_user.email,
                    "avatar_url": cto_user.avatar_url,
                    "project_role": None,
                    "company_role": cto_user.role.value if cto_user.role else None,
                    "designation": cto_user.designation or "Chief Technology Officer",
                    "is_cto": True,
                })

        return results

    # Standard Developer / Team Lead:
    # Can message PM and other authorized project members (NEVER CTO)
    members = db.execute(
        select(User, ProjectMember.role)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.role.in_(AUTHORIZED_PROJECT_ROLES),
            User.id != current_user.id,
            User.is_active == True,
        )
    ).all()

    for u, role in members:
        if not is_cto(u):
            results.append({
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "avatar_url": u.avatar_url,
                "project_role": role.value if role else None,
                "company_role": u.role.value if u.role else None,
                "designation": u.designation,
                "is_cto": False,
            })

    return results


def get_or_create_direct_conversation(
    db: Session,
    project_id: UUID,
    current_user: User,
    recipient_id: UUID,
) -> Conversation:
    """
    Finds or creates a direct conversation between current_user and recipient_id.
    Strictly enforces:
    - CTO can only chat with PM.
    - Developer cannot chat with CTO.
    - Non-project members cannot be messaged.
    - Prevents duplicates idempotently.
    """
    get_project_or_404(db, project_id, current_user)

    if current_user.id == recipient_id:
        raise BaseBusinessException("You cannot start a direct conversation with yourself.", status_code=400)

    recipient = db.execute(select(User).filter(User.id == recipient_id)).scalar_one_or_none()
    if not recipient or not recipient.is_active:
        raise ResourceNotFound("Recipient user not found or inactive.")

    if str(recipient.company_id) != str(current_user.company_id):
        raise Forbidden("You cannot message users outside of your company.")

    sender_is_cto = is_cto(current_user)
    recipient_is_cto = is_cto(recipient)
    recipient_is_pm = is_project_manager(db, project_id, recipient_id)
    recipient_is_member = is_authorized_project_member(db, project_id, recipient_id)
    sender_is_pm = is_project_manager(db, project_id, current_user.id)
    sender_is_member = is_authorized_project_member(db, project_id, current_user.id)

    # 1. CTO check
    if sender_is_cto:
        if not recipient_is_pm:
            raise Forbidden("CTOs are only authorized to message the Project Manager.")

    # 2. Developer/Team Lead check
    elif not sender_is_pm:
        if not sender_is_member:
            raise Forbidden("You are not an authorized member of this project.")
        if recipient_is_cto:
            raise Forbidden("Developers cannot directly message the CTO.")
        if not recipient_is_member:
            raise Forbidden("Recipient is not an authorized member of this project.")

    # 3. Project Manager check
    else:
        # PM can message authorized members OR company CTO
        if not (recipient_is_member or recipient_is_cto):
            raise Forbidden("Recipient is not authorized for messaging in this project.")

    # Find existing direct conversation containing exactly both users
    subq1 = select(ConversationMember.conversation_id).filter(ConversationMember.user_id == current_user.id)
    subq2 = select(ConversationMember.conversation_id).filter(ConversationMember.user_id == recipient_id)

    existing = db.execute(
        select(Conversation)
        .options(joinedload(Conversation.members).joinedload(ConversationMember.user))
        .filter(
            Conversation.project_id == project_id,
            Conversation.conversation_type == ConversationType.DIRECT,
            Conversation.id.in_(subq1),
            Conversation.id.in_(subq2),
        )
    ).unique().scalars().first()

    if existing:
        return existing

    # Create new direct conversation
    conv = Conversation(
        project_id=project_id,
        conversation_type=ConversationType.DIRECT,
        name=None,
        created_by=current_user.id,
    )
    db.add(conv)
    db.flush()

    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
    db.add(ConversationMember(conversation_id=conv.id, user_id=recipient_id))
    db.commit()

    db.refresh(conv)
    return conv


def get_conversation_messages(
    db: Session,
    project_id: UUID,
    conversation_id: UUID,
    current_user: User,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Message], int]:
    """Retrieves paginated message history for an authorized conversation."""
    get_project_or_404(db, project_id, current_user)

    conv = db.execute(
        select(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    ).scalar_one_or_none()

    if not conv:
        raise ResourceNotFound("Conversation not found in this project.")

    validate_conversation_access(db, conv, current_user)

    # Count total messages
    total = db.execute(
        select(func.count(Message.id)).filter(Message.conversation_id == conversation_id)
    ).scalar_one()

    # Query paginated messages
    limit = max(1, min(limit, 100))
    messages = db.execute(
        select(Message)
        .options(joinedload(Message.sender))
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc(), Message.id.asc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()

    # Update last_read_at for current_user
    member = db.execute(
        select(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
        )
    ).scalar_one_or_none()

    if member:
        member.last_read_at = datetime.now(timezone.utc)
        db.commit()

    return messages, total


def send_message(
    db: Session,
    project_id: UUID,
    conversation_id: UUID,
    current_user: User,
    content: str,
) -> Message:
    """Validates authorization, validates message content, and persists the message to PostgreSQL."""
    get_project_or_404(db, project_id, current_user)

    clean_content = content.strip()
    if not clean_content:
        raise ValidationException("Message content cannot be empty.")
    if len(clean_content) > 5000:
        raise ValidationException("Message content cannot exceed 5000 characters.")

    conv = db.execute(
        select(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    ).scalar_one_or_none()

    if not conv:
        raise ResourceNotFound("Conversation not found in this project.")

    validate_conversation_access(db, conv, current_user)

    message = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=clean_content,
    )
    db.add(message)

    # Touch conversation updated_at
    conv.updated_at = datetime.now(timezone.utc)

    # Update sender's last_read_at
    sender_mem = db.execute(
        select(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if sender_mem:
        sender_mem.last_read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(message)

    # Ensure sender relationship is loaded
    message.sender = current_user

    return message


def get_user_unread_messages_count(
    db: Session,
    project_id: UUID,
    current_user: User,
) -> int:
    """Calculates total unread chat messages for current user in this project."""
    get_project_or_404(db, project_id, current_user)

    # 1. Canonical group conversation if user is authorized member
    total_unread = 0
    if not is_cto(current_user) and is_authorized_project_member(db, project_id, current_user.id):
        group = db.execute(
            select(Conversation).filter(
                Conversation.project_id == project_id,
                Conversation.conversation_type == ConversationType.PROJECT_GROUP,
            )
        ).scalar_one_or_none()
        if group:
            mem = db.execute(
                select(ConversationMember).filter(
                    ConversationMember.conversation_id == group.id,
                    ConversationMember.user_id == current_user.id,
                )
            ).scalar_one_or_none()
            q = select(func.count(Message.id)).filter(
                Message.conversation_id == group.id,
                Message.sender_id != current_user.id,
            )
            if mem and mem.last_read_at:
                q = q.filter(Message.created_at > mem.last_read_at)
            total_unread += db.execute(q).scalar_one()

    # 2. Direct conversations where user is a participant
    direct_convs = db.execute(
        select(Conversation)
        .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
        .filter(
            Conversation.project_id == project_id,
            Conversation.conversation_type == ConversationType.DIRECT,
            ConversationMember.user_id == current_user.id,
        )
    ).scalars().all()

    for conv in direct_convs:
        mem = db.execute(
            select(ConversationMember).filter(
                ConversationMember.conversation_id == conv.id,
                ConversationMember.user_id == current_user.id,
            )
        ).scalar_one_or_none()
        q = select(func.count(Message.id)).filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,
        )
        if mem and mem.last_read_at:
            q = q.filter(Message.created_at > mem.last_read_at)
        total_unread += db.execute(q).scalar_one()

    return total_unread

