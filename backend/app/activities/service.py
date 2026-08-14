from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.models.user_activity import UserActivity
from app.models.user import User
from app.models.enums import CompanyRole
from app.common.exceptions import Forbidden, ResourceNotFound
from app.activities.schemas import ActivityResponse, PaginatedActivityResponse


class ActivityService:
    def __init__(self, db: Session):
        self.db = db

    def log_activity(
        self,
        user_id: UUID,
        action: str,
        description: str,
        company_id: UUID | None = None,
        details: str | None = None,
    ) -> UserActivity:
        """
        Creates and persists a UserActivity record in the database.
        """
        activity = UserActivity(
            user_id=user_id,
            company_id=company_id,
            action=action,
            description=description,
            details=details,
        )
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def get_activities_for_user(
        self,
        current_user: User,
        target_user_id: UUID | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> PaginatedActivityResponse:
        """
        Retrieves paginated activity logs for a user (newest first).
        Scoping rules:
        - Regular users can only view their own activity logs.
        - OWNER / ADMIN can view activity logs for any member in their company.
        - Cross-tenant requests or unauthorized inspections return 403 Forbidden.
        """
        target_id = target_user_id if target_user_id else current_user.id

        if str(target_id) != str(current_user.id):
            # Check permissions
            is_admin = current_user.role in (CompanyRole.OWNER, CompanyRole.ADMIN)
            if not is_admin:
                raise Forbidden("You do not have permission to view other users' activity logs.")

            # Check target user belongs to same company
            target_user = self.db.query(User).filter(User.id == target_id).first()
            if not target_user:
                raise ResourceNotFound("User not found.")
            if str(target_user.company_id) != str(current_user.company_id):
                raise Forbidden("You do not have access to activities for this user.")

        # Query paginated activities
        query = select(UserActivity).filter(UserActivity.user_id == target_id)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0

        pages = max(1, (total + limit - 1) // limit) if total > 0 else 1
        offset = (page - 1) * limit

        activities = (
            self.db.scalars(
                query.order_by(desc(UserActivity.created_at), desc(UserActivity.id)).offset(offset).limit(limit)
            ).all()
        )

        items = [ActivityResponse.model_validate(act) for act in activities]

        return PaginatedActivityResponse(
            items=items,
            total=total,
            page=page,
            pages=pages,
        )
