from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task_comment import TaskComment
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.task_comments.repository import TaskCommentRepository
from app.task_comments.schemas import (
    CreateTaskCommentRequest,
    TaskCommentResponse,
    TaskCommentListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden


class TaskCommentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TaskCommentRepository(db)

    def _build_comment_response(self, comment: TaskComment) -> TaskCommentResponse:
        author_name = "Unknown"
        author_email = ""
        if comment.author:
            author_name = f"{comment.author.first_name} {comment.author.last_name}"
            author_email = comment.author.email

        return TaskCommentResponse(
            id=comment.id,
            task_id=comment.task_id,
            user_id=comment.user_id,
            author_name=author_name,
            author_email=author_email,
            content=comment.content,
            created_at=comment.created_at,
        )

    def list_comments(self, task_id: UUID, current_user: User) -> TaskCommentListResponse:
        task = self.db.execute(select(Task).filter(Task.id == task_id)).scalar_one_or_none()
        if not task:
            raise ResourceNotFound("Task not found.")

        project = self.db.execute(select(Project).filter(Project.id == task.project_id)).scalar_one_or_none()
        if not project or str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this task.")

        comments = self.repo.get_comments_by_task(task_id)
        responses = [self._build_comment_response(c) for c in comments]
        return TaskCommentListResponse(comments=responses, total=len(responses))

    def create_comment(self, task_id: UUID, data: CreateTaskCommentRequest, current_user: User) -> TaskCommentResponse:
        task = self.db.execute(select(Task).filter(Task.id == task_id)).scalar_one_or_none()
        if not task:
            raise ResourceNotFound("Task not found.")

        project = self.db.execute(select(Project).filter(Project.id == task.project_id)).scalar_one_or_none()
        if not project or str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this task.")

        try:
            comment = TaskComment(
                task_id=task_id,
                user_id=current_user.id,
                content=data.content.strip(),
            )
            self.repo.create_comment(comment)
            self.db.commit()
            self.db.refresh(comment)

            return self._build_comment_response(comment)
        except Exception as e:
            self.db.rollback()
            raise e
