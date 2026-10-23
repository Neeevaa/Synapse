from datetime import datetime
from uuid import UUID
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import GitReferenceType


class ProjectGitRepository(BaseModel):
    """
    Primary registered GitHub repository associated with a Synapse project.
    Strictly enforces one registered repository per project.
    """
    __tablename__ = "project_git_repositories"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    repository_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    repository_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project", foreign_keys=[project_id])
    creator = relationship("User", foreign_keys=[created_by])


class TaskGitReference(BaseModel):
    """
    Manually managed Git reference (Commit or Pull Request) linked to a Synapse task.
    """
    __tablename__ = "task_git_references"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reference_type: Mapped[GitReferenceType] = mapped_column(
        Enum(GitReferenceType, name="gitreferencetype", create_type=False),
        nullable=False,
    )
    commit_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    commit_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    pull_request_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project", foreign_keys=[project_id])
    task = relationship("Task", foreign_keys=[task_id])
    creator = relationship("User", foreign_keys=[created_by])


class ProjectGitConnection(BaseModel):
    """
    Secure GitHub connection credentials associated with a project.
    Stores only the encrypted PAT, GitHub user account identity, and validation state.
    """
    __tablename__ = "project_git_connections"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    encrypted_pat: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    github_username: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    github_user_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    github_avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    token_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pat",
    )
    is_valid: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    last_tested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    connected_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project", foreign_keys=[project_id])
    connector = relationship("User", foreign_keys=[connected_by])
