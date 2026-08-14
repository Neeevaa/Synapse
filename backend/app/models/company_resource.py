import json
from uuid import UUID
from sqlalchemy import String, Text, Integer, BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CompanyResourceAllocation(BaseModel):
    __tablename__ = "company_resource_allocations"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    custom_max_users: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    custom_max_projects: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    custom_max_storage_bytes: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    custom_max_ai_executions: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    custom_max_automation_workflows: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    custom_features_json: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    company = relationship("Company", foreign_keys=[company_id])

    @property
    def custom_features(self) -> list[str] | None:
        if self.custom_features_json:
            try:
                return json.loads(self.custom_features_json)
            except Exception:
                return None
        return None

    @custom_features.setter
    def custom_features(self, features: list[str] | None) -> None:
        if features is not None:
            self.custom_features_json = json.dumps(features)
        else:
            self.custom_features_json = None
