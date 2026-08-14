from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, joinedload

from app.models.requirement_review import RequirementReview, RequirementReviewFinding
from app.models.enums import RequirementReviewStatus, FindingHumanDecision, FindingEvidenceStatus


class RequirementReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_review(
        self,
        company_id: UUID,
        project_id: UUID,
        review: RequirementReview,
    ) -> RequirementReview:
        review.company_id = company_id
        review.project_id = project_id
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def get_review_by_id(
        self,
        company_id: UUID,
        project_id: UUID,
        review_id: UUID,
    ) -> Optional[RequirementReview]:
        stmt = (
            select(RequirementReview)
            .options(joinedload(RequirementReview.findings))
            .filter(
                RequirementReview.company_id == company_id,
                RequirementReview.project_id == project_id,
                RequirementReview.id == review_id,
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_reviews_for_requirement(
        self,
        company_id: UUID,
        project_id: UUID,
        requirement_id: UUID,
    ) -> list[RequirementReview]:
        stmt = (
            select(RequirementReview)
            .options(joinedload(RequirementReview.findings))
            .filter(
                RequirementReview.company_id == company_id,
                RequirementReview.project_id == project_id,
                RequirementReview.requirement_id == requirement_id,
            )
            .order_by(desc(RequirementReview.created_at))
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def update_review(
        self,
        company_id: UUID,
        project_id: UUID,
        review: RequirementReview,
    ) -> RequirementReview:
        review.company_id = company_id
        review.project_id = project_id
        self.db.commit()
        self.db.refresh(review)
        return review

    def create_findings(
        self,
        company_id: UUID,
        project_id: UUID,
        findings: list[RequirementReviewFinding],
    ) -> list[RequirementReviewFinding]:
        for f in findings:
            self.db.add(f)
        self.db.commit()
        return findings

    def get_finding_by_id(
        self,
        company_id: UUID,
        project_id: UUID,
        finding_id: UUID,
    ) -> Optional[RequirementReviewFinding]:
        stmt = (
            select(RequirementReviewFinding)
            .join(RequirementReview, RequirementReviewFinding.review_id == RequirementReview.id)
            .filter(
                RequirementReview.company_id == company_id,
                RequirementReview.project_id == project_id,
                RequirementReviewFinding.id == finding_id,
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def update_finding_decision(
        self,
        company_id: UUID,
        project_id: UUID,
        finding_id: UUID,
        decision: FindingHumanDecision,
        user_id: UUID,
        comment: Optional[str] = None,
        modified_recommendation: Optional[str] = None,
    ) -> Optional[RequirementReviewFinding]:
        finding = self.get_finding_by_id(company_id, project_id, finding_id)
        if not finding:
            return None

        finding.human_decision = decision
        finding.updated_by = user_id
        finding.updated_at = datetime.now(timezone.utc)

        if comment is not None:
            finding.human_comment = comment

        if decision == FindingHumanDecision.MODIFIED and modified_recommendation:
            finding.recommendation = modified_recommendation

        self.db.commit()
        self.db.refresh(finding)
        return finding
