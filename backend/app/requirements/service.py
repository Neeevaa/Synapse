from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.models.requirement import Requirement, RequirementVersion
from app.models.user import User
from app.models.enums import (
    RequirementType,
    RequirementStatus,
    RequirementPriority,
    RequirementSource,
    ProjectRole,
    CompanyRole,
)
from app.requirements.schemas import (
    RequirementCreate,
    RequirementUpdate,
    RequirementStatusUpdate,
    RequirementResponse,
    RequirementVersionResponse,
    RequirementListResponse,
)
from app.requirements.repository import RequirementRepository
from app.permissions.dependencies import check_project_role_or_company_admin
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException


class RequirementService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RequirementRepository(db)

    def _to_version_response(self, v: RequirementVersion) -> RequirementVersionResponse:
        author_name = f"{v.author.first_name} {v.author.last_name}" if v.author else None
        return RequirementVersionResponse(
            id=v.id,
            requirement_id=v.requirement_id,
            version_number=v.version_number,
            title=v.title,
            description=v.description,
            acceptance_criteria=v.acceptance_criteria,
            requirement_type=v.requirement_type,
            priority=v.priority,
            status=v.status,
            source=v.source,
            change_summary=v.change_summary,
            created_by=v.created_by,
            author_name=author_name,
            created_at=v.created_at,
        )

    def _to_requirement_response(self, r: Requirement) -> RequirementResponse:
        creator_name = f"{r.creator.first_name} {r.creator.last_name}" if r.creator else None
        version_responses = [self._to_version_response(v) for v in r.versions]
        return RequirementResponse(
            id=r.id,
            project_id=r.project_id,
            company_id=r.company_id,
            requirement_key=r.requirement_key,
            title=r.title,
            description=r.description,
            requirement_type=r.requirement_type,
            priority=r.priority,
            status=r.status,
            source=r.source,
            acceptance_criteria=r.acceptance_criteria,
            current_version=r.current_version,
            created_by=r.created_by,
            creator_name=creator_name,
            created_at=r.created_at,
            updated_at=r.updated_at,
            versions=version_responses,
        )

    def create_requirement(
        self,
        project_id: UUID,
        data: RequirementCreate,
        current_user: User,
    ) -> RequirementResponse:
        """
        Creates a new Requirement and initial Version 1 record.
        Allowed roles: PM, Team Lead, Developer, or Company Admin/Owner.
        """
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )

        req_key = self.repo.generate_requirement_key(project_id)

        requirement = Requirement(
            project_id=project_id,
            company_id=project.company_id,
            requirement_key=req_key,
            title=data.title.strip(),
            description=data.description.strip(),
            requirement_type=data.requirement_type,
            priority=data.priority,
            status=RequirementStatus.DRAFT,
            source=data.source,
            acceptance_criteria=data.acceptance_criteria.strip() if data.acceptance_criteria else None,
            current_version=1,
            created_by=current_user.id,
        )
        self.repo.create_requirement(requirement)

        # Create Version 1 snapshot
        initial_version = RequirementVersion(
            requirement_id=requirement.id,
            version_number=1,
            title=requirement.title,
            description=requirement.description,
            acceptance_criteria=requirement.acceptance_criteria,
            requirement_type=requirement.requirement_type,
            priority=requirement.priority,
            status=requirement.status,
            source=requirement.source,
            change_summary="Initial requirement created",
            created_by=current_user.id,
        )
        self.repo.create_version(initial_version)

        # Fetch fully populated model with relationships
        full_req = self.repo.get_requirement(requirement.id, project_id)
        return self._to_requirement_response(full_req)

    def list_requirements(
        self,
        project_id: UUID,
        current_user: User,
        requirement_type: Optional[RequirementType] = None,
        priority: Optional[RequirementPriority] = None,
        status: Optional[RequirementStatus] = None,
        created_by: Optional[UUID] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> RequirementListResponse:
        """
        Lists project requirements with pagination & filtering.
        Allowed for all valid project members and company admins.
        """
        check_project_role_or_company_admin(self.db, current_user, project_id)

        items, total = self.repo.list_requirements(
            project_id=project_id,
            requirement_type=requirement_type,
            priority=priority,
            status=status,
            created_by=created_by,
            keyword=keyword,
            page=page,
            page_size=page_size,
        )

        responses = [self._to_requirement_response(r) for r in items]
        return RequirementListResponse(
            requirements=responses,
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_requirement(
        self,
        project_id: UUID,
        requirement_id: UUID,
        current_user: User,
    ) -> RequirementResponse:
        """
        Gets requirement detail along with full version history.
        """
        check_project_role_or_company_admin(self.db, current_user, project_id)
        req = self.repo.get_requirement(requirement_id, project_id)
        if not req:
            raise ResourceNotFound("Requirement not found.")
        return self._to_requirement_response(req)

    def update_requirement(
        self,
        project_id: UUID,
        requirement_id: UUID,
        data: RequirementUpdate,
        current_user: User,
    ) -> RequirementResponse:
        """
        Updates requirement content. Automatically increments version number
        and creates a new RequirementVersion historical record.
        """
        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER],
        )

        req = self.repo.get_requirement(requirement_id, project_id)
        if not req:
            raise ResourceNotFound("Requirement not found.")

        # Multi-tenant company boundary check
        if str(req.company_id) != str(project.company_id):
            raise Forbidden("Cross-company access denied.")

        if req.status == RequirementStatus.ARCHIVED:
            raise BaseBusinessException("Archived requirements cannot be modified.", status_code=400)

        # Check if content actually changed
        has_title_change = data.title is not None and data.title.strip() != req.title
        has_desc_change = data.description is not None and data.description.strip() != req.description
        has_acc_change = data.acceptance_criteria is not None and (data.acceptance_criteria.strip() or None) != req.acceptance_criteria
        has_type_change = data.requirement_type is not None and data.requirement_type != req.requirement_type
        has_priority_change = data.priority is not None and data.priority != req.priority
        has_source_change = data.source is not None and data.source != req.source

        if not (has_title_change or has_desc_change or has_acc_change or has_type_change or has_priority_change or has_source_change):
            return self._to_requirement_response(req)

        # Apply updates
        if data.title is not None:
            req.title = data.title.strip()
        if data.description is not None:
            req.description = data.description.strip()
        if data.requirement_type is not None:
            req.requirement_type = data.requirement_type
        if data.priority is not None:
            req.priority = data.priority
        if data.source is not None:
            req.source = data.source
        if data.acceptance_criteria is not None:
            req.acceptance_criteria = data.acceptance_criteria.strip() if data.acceptance_criteria.strip() else None

        # Increment version number
        req.current_version += 1
        self.db.commit()

        # Create new version snapshot
        new_version = RequirementVersion(
            requirement_id=req.id,
            version_number=req.current_version,
            title=req.title,
            description=req.description,
            acceptance_criteria=req.acceptance_criteria,
            requirement_type=req.requirement_type,
            priority=req.priority,
            status=req.status,
            source=req.source,
            change_summary=data.change_summary or "Content update",
            created_by=current_user.id,
        )
        self.repo.create_version(new_version)

        full_req = self.repo.get_requirement(req.id, project_id)
        return self._to_requirement_response(full_req)

    def update_requirement_status(
        self,
        project_id: UUID,
        requirement_id: UUID,
        data: RequirementStatusUpdate,
        current_user: User,
    ) -> RequirementResponse:
        """
        Transitions requirement status (e.g. DRAFT -> REVIEW -> APPROVED / REJECTED / ARCHIVED).
        Approve/Reject/Archive require Project Manager or Company Admin/Owner.
        """
        is_approval_action = data.status in (RequirementStatus.APPROVED, RequirementStatus.REJECTED, RequirementStatus.ARCHIVED)
        allowed_roles = [ProjectRole.PROJECT_MANAGER] if is_approval_action else [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD, ProjectRole.DEVELOPER]

        project = check_project_role_or_company_admin(
            self.db,
            current_user,
            project_id,
            allowed_roles,
        )

        req = self.repo.get_requirement(requirement_id, project_id)
        if not req:
            raise ResourceNotFound("Requirement not found.")

        if str(req.company_id) != str(project.company_id):
            raise Forbidden("Cross-company access denied.")

        if req.status == data.status:
            return self._to_requirement_response(req)

        req.status = data.status
        req.current_version += 1
        self.db.commit()

        # Log status transition snapshot in version history
        status_version = RequirementVersion(
            requirement_id=req.id,
            version_number=req.current_version,
            title=req.title,
            description=req.description,
            acceptance_criteria=req.acceptance_criteria,
            requirement_type=req.requirement_type,
            priority=req.priority,
            status=req.status,
            source=req.source,
            change_summary=data.change_summary or f"Status changed to {data.status.value}",
            created_by=current_user.id,
        )
        self.repo.create_version(status_version)

        full_req = self.repo.get_requirement(req.id, project_id)
        return self._to_requirement_response(full_req)

    def archive_requirement(
        self,
        project_id: UUID,
        requirement_id: UUID,
        current_user: User,
    ) -> RequirementResponse:
        """
        Soft-deletes / archives a requirement.
        Requires Project Manager or Company Admin/Owner.
        """
        status_data = RequirementStatusUpdate(status=RequirementStatus.ARCHIVED, change_summary="Archived requirement")
        return self.update_requirement_status(project_id, requirement_id, status_data, current_user)
