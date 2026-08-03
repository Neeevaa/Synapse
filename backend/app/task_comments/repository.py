from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task_comment import TaskComment


class TaskCommentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_comments_by_task(self, task_id: UUID) -> list[TaskComment]:
        """
        Retrieves all comments for a task, ordered by creation date ascending.
        """
        result = self.db.execute(
            select(TaskComment)
            .filter(TaskComment.task_id == task_id)
            .order_by(TaskComment.created_at.asc())
        )
        return list(result.scalars().all())

    def create_comment(self, comment: TaskComment) -> TaskComment:
        self.db.add(comment)
        return comment
