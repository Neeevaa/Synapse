from datetime import datetime, timezone
from uuid import UUID
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.notification import Notification
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.enums import NotificationType, ProjectRole, CompanyRole
from app.notifications.repository import NotificationRepository
from app.notifications.schemas import (
    NotificationResponse,
    ProjectNotificationGroup,
    NotificationListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    def _to_response(self, notif: Notification) -> NotificationResponse:
        project_name = notif.project.name if notif.project else None
        return NotificationResponse(
            id=notif.id,
            recipient_user_id=notif.recipient_user_id,
            company_id=notif.company_id,
            project_id=notif.project_id,
            project_name=project_name,
            type=notif.type,
            title=notif.title,
            message=notif.message,
            is_read=notif.is_read,
            source_type=notif.source_type,
            source_id=notif.source_id,
            deep_link=notif.deep_link,
            created_at=notif.created_at,
            read_at=notif.read_at,
        )

    def notify_users(
        self,
        recipient_ids: List[UUID],
        sender_id: Optional[UUID],
        company_id: UUID,
        type: NotificationType,
        title: str,
        message: str,
        project_id: Optional[UUID] = None,
        source_type: Optional[str] = None,
        source_id: Optional[UUID] = None,
        deep_link: Optional[str] = None,
    ) -> List[Notification]:
        """
        Transactional notification creation targeting multiple users.
        Strictly enforces:
        1. Self-notification prevention (excludes sender_id).
        2. Deduplication of recipients.
        3. Multi-tenant company boundary check.
        """
        # Exclude sender and deduplicate
        filtered_recipient_ids = set()
        for r_id in recipient_ids:
            if not r_id:
                continue
            if sender_id and str(r_id) == str(sender_id):
                continue
            filtered_recipient_ids.add(r_id)

        if not filtered_recipient_ids:
            return []

        # Validate that all recipients belong to the given company
        valid_users = list(
            self.db.scalars(
                select(User).filter(
                    User.id.in_(filtered_recipient_ids),
                    User.company_id == company_id,
                )
            ).all()
        )

        valid_user_ids = {u.id for u in valid_users}
        if not valid_user_ids:
            return []

        notifications = []
        for u_id in valid_user_ids:
            notif = Notification(
                recipient_user_id=u_id,
                company_id=company_id,
                project_id=project_id,
                type=type,
                title=title,
                message=message,
                source_type=source_type,
                source_id=source_id,
                deep_link=deep_link,
                is_read=False,
            )
            notifications.append(notif)

        created = self.repo.create_many(notifications)
        self.db.commit()
        return created

    def get_user_notifications(
        self,
        current_user: User,
        project_id: Optional[UUID] = None,
        is_read: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> NotificationListResponse:
        """
        Retrieves paginated notifications for the current user, grouped by project context.
        """
        offset = max(0, (page - 1) * limit)
        notifications, total = self.repo.get_user_notifications(
            recipient_user_id=current_user.id,
            company_id=current_user.company_id,
            project_id=project_id,
            is_read=is_read,
            limit=limit,
            offset=offset,
        )

        unread_count = self.repo.get_unread_count(
            recipient_user_id=current_user.id,
            company_id=current_user.company_id,
            project_id=project_id,
        )

        items = [self._to_response(n) for n in notifications]

        # Group notifications by Project Context
        groups_map: Dict[str, ProjectNotificationGroup] = {}
        for item in items:
            p_key = str(item.project_id) if item.project_id else "general"
            p_name = item.project_name or "General / Company"

            if p_key not in groups_map:
                groups_map[p_key] = ProjectNotificationGroup(
                    project_id=item.project_id,
                    project_name=p_name,
                    unread_count=0,
                    notifications=[],
                )

            groups_map[p_key].notifications.append(item)
            if not item.is_read:
                groups_map[p_key].unread_count += 1

        groups = list(groups_map.values())
        pages = max(1, (total + limit - 1) // limit) if total > 0 else 1

        return NotificationListResponse(
            items=items,
            groups=groups,
            unread_count=unread_count,
            total=total,
            page=page,
            pages=pages,
        )

    def get_unread_count(
        self,
        current_user: User,
        project_id: Optional[UUID] = None,
    ) -> int:
        return self.repo.get_unread_count(
            recipient_user_id=current_user.id,
            company_id=current_user.company_id,
            project_id=project_id,
        )

    def mark_notification_as_read(
        self,
        notification_id: UUID,
        current_user: User,
    ) -> NotificationResponse:
        notif = self.repo.get_notification_by_id(
            notification_id=notification_id,
            recipient_user_id=current_user.id,
        )
        if not notif:
            raise ResourceNotFound("Notification not found.")

        updated = self.repo.mark_as_read(notif)
        self.db.commit()
        self.db.refresh(updated)
        return self._to_response(updated)

    def mark_all_as_read(
        self,
        current_user: User,
        project_id: Optional[UUID] = None,
    ) -> int:
        count = self.repo.mark_all_as_read(
            recipient_user_id=current_user.id,
            company_id=current_user.company_id,
            project_id=project_id,
        )
        self.db.commit()
        return count

    # ─────────────────────────────────────────────────────────────
    # Membership Helpers for Targeted Event Generation
    # ─────────────────────────────────────────────────────────────
    def get_project_pm_and_lead_ids(self, project_id: UUID) -> List[UUID]:
        """Returns user IDs for PMs and Team Leads on a project."""
        members = list(
            self.db.scalars(
                select(ProjectMember.user_id).filter(
                    ProjectMember.project_id == project_id,
                    ProjectMember.role.in_([ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]),
                )
            ).all()
        )
        return members

    def get_project_all_member_ids(self, project_id: UUID) -> List[UUID]:
        """Returns all member user IDs for a project."""
        members = list(
            self.db.scalars(
                select(ProjectMember.user_id).filter(
                    ProjectMember.project_id == project_id
                )
            ).all()
        )
        return members
