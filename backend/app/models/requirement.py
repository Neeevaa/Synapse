from uuid import uuid4
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref

from app.models.base import Base
from app.models.enums import (
    RequirementType,
    RequirementStatus,
    RequirementPriority,
    RequirementSource,
)


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_key = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirement_type = Column(
        Enum(RequirementType),
        nullable=False,
        default=RequirementType.FUNCTIONAL,
    )
    priority = Column(
        Enum(RequirementPriority),
        nullable=False,
        default=RequirementPriority.MEDIUM,
    )
    status = Column(
        Enum(RequirementStatus),
        nullable=False,
        default=RequirementStatus.DRAFT,
    )
    source = Column(
        Enum(RequirementSource),
        nullable=False,
        default=RequirementSource.MANUAL_ENTRY,
    )
    acceptance_criteria = Column(Text, nullable=True)
    current_version = Column(Integer, nullable=False, default=1)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    project = relationship(
        "Project",
        backref=backref("requirements", cascade="all, delete-orphan", passive_deletes=True),
        passive_deletes=True,
    )
    company = relationship("Company", backref="requirements")
    creator = relationship("User", foreign_keys=[created_by])
    versions = relationship(
        "RequirementVersion",
        back_populates="requirement",
        cascade="all, delete-orphan",
        order_by="RequirementVersion.version_number.desc()",
    )


class RequirementVersion(Base):
    __tablename__ = "requirement_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    requirement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    acceptance_criteria = Column(Text, nullable=True)
    requirement_type = Column(Enum(RequirementType), nullable=False)
    priority = Column(Enum(RequirementPriority), nullable=False)
    status = Column(Enum(RequirementStatus), nullable=False)
    source = Column(Enum(RequirementSource), nullable=False)
    change_summary = Column(Text, nullable=True)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    requirement = relationship("Requirement", back_populates="versions")
    author = relationship("User", foreign_keys=[created_by])
