from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, desc, update

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.flush()
        return notification

    def create_many(self, notifications: list[Notification]) -> list[Notification]:
        if not notifications:
            return []
        self.db.add_all(notifications)
        self.db.flush()
        return notifications

    def get_user_notifications(
        self,
        recipient_user_id: UUID,
        company_id: UUID,
        project_id: Optional[UUID] = None,
        is_read: Optional[bool] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Notification], int]:
        query = (
            select(Notification)
            .options(joinedload(Notification.project))
            .filter(
                Notification.recipient_user_id == recipient_user_id,
                Notification.company_id == company_id,
            )
        )

        if project_id is not None:
            query = query.filter(Notification.project_id == project_id)

        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0

        notifications = list(
            self.db.scalars(
                query.order_by(desc(Notification.created_at), desc(Notification.id))
                .offset(offset)
                .limit(limit)
            ).all()
        )

        return notifications, total

    def get_unread_count(
        self,
        recipient_user_id: UUID,
        company_id: UUID,
        project_id: Optional[UUID] = None,
    ) -> int:
        query = select(func.count(Notification.id)).filter(
            Notification.recipient_user_id == recipient_user_id,
            Notification.company_id == company_id,
            Notification.is_read == False,
        )
        if project_id is not None:
            query = query.filter(Notification.project_id == project_id)

        return self.db.scalar(query) or 0

    def get_notification_by_id(
        self,
        notification_id: UUID,
        recipient_user_id: UUID,
    ) -> Optional[Notification]:
        return self.db.execute(
            select(Notification)
            .options(joinedload(Notification.project))
            .filter(
                Notification.id == notification_id,
                Notification.recipient_user_id == recipient_user_id,
            )
        ).scalar_one_or_none()

    def mark_as_read(self, notification: Notification) -> Notification:
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            self.db.flush()
        return notification

    def mark_all_as_read(
        self,
        recipient_user_id: UUID,
        company_id: UUID,
        project_id: Optional[UUID] = None,
    ) -> int:
        now = datetime.now(timezone.utc)
        stmt = (
            update(Notification)
            .where(
                Notification.recipient_user_id == recipient_user_id,
                Notification.company_id == company_id,
                Notification.is_read == False,
            )
            .values(is_read=True, read_at=now)
        )
        if project_id is not None:
            stmt = stmt.where(Notification.project_id == project_id)

        result = self.db.execute(stmt)
        self.db.flush()
        return result.rowcount or 0
