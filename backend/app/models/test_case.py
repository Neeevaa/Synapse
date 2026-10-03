from uuid import uuid4
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref

from app.models.base import Base
from app.models.enums import (
    TestCaseCategory,
    TestCaseStatus,
    TestCasePriority,
    TestCaseSource,
)


class TestCase(Base):
    __tablename__ = "test_cases"
    __test__ = False

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("requirements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(
        Enum(TestCaseCategory, name="testcasecategory"),
        nullable=False,
        default=TestCaseCategory.FUNCTIONAL,
        index=True,
    )
    priority = Column(
        Enum(TestCasePriority, name="testcasepriority"),
        nullable=False,
        default=TestCasePriority.MEDIUM,
    )
    status = Column(
        Enum(TestCaseStatus, name="testcasestatus"),
        nullable=False,
        default=TestCaseStatus.DRAFT,
        index=True,
    )
    source = Column(
        Enum(TestCaseSource, name="testcasesource"),
        nullable=False,
        default=TestCaseSource.AI_GENERATED,
    )
    preconditions = Column(Text, nullable=True)
    test_steps = Column(JSON, nullable=False, default=list)
    expected_result = Column(Text, nullable=False)
    test_data = Column(Text, nullable=True)
    generation_metadata = Column(JSON, nullable=True)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    approved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company = relationship("Company", backref="test_cases")
    project = relationship(
        "Project",
        backref=backref("test_cases", cascade="all, delete-orphan", passive_deletes=True),
        passive_deletes=True,
    )
    requirement = relationship(
        "Requirement",
        backref=backref("test_cases", cascade="all, delete-orphan", passive_deletes=True),
        passive_deletes=True,
    )
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
