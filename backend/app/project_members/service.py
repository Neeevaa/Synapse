from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.project_member import ProjectMember
from app.models.pending_membership import PendingMembership
from app.models.project import Project
from app.models.user import User
from app.models.enums import ProjectRole
from app.project_members.repository import ProjectMemberRepository
from app.project_members.schemas import (
    AddProjectMemberRequest,
    ProjectMemberResponse,
    ProjectMemberListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException
from app.permissions.dependencies import check_project_role_or_company_admin


class ProjectMemberService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectMemberRepository(db)

    def list_members(self, project_id: UUID, current_user: User) -> ProjectMemberListResponse:
        """
        Lists all active members and pending invitations for a project.
        """
        project = self.db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
        if not project:
            raise ResourceNotFound("Project not found.")

        if str(project.company_id) != str(current_user.company_id):
            raise Forbidden("You do not have access to this project.")

        members = self.repo.get_members_by_project(project_id)
        responses = []
        for m in members:
            u = m.user
            if u:
                responses.append(
                    ProjectMemberResponse(
                        id=m.id,
                        project_id=m.project_id,
                        user_id=m.user_id,
                        first_name=u.first_name,
                        last_name=u.last_name,
                        email=u.email,
                        role=m.role if isinstance(m.role, str) else m.role.value,
                        outcome="added",
                        is_pending=False,
                        created_at=m.created_at,
                    )
                )

        # Include pending invitations
        pendings = self.db.execute(
            select(PendingMembership).filter(PendingMembership.project_id == project_id)
        ).scalars().all()

        for p in pendings:
            responses.append(
                ProjectMemberResponse(
                    id=p.id,
                    project_id=p.project_id,
                    user_id=None,
                    first_name="Pending",
                    last_name="User",
                    email=p.email,
                    role=p.role if isinstance(p.role, str) else p.role.value,
                    outcome="pending",
                    is_pending=True,
                    created_at=p.created_at,
                )
            )

        return ProjectMemberListResponse(members=responses, total=len(responses))

    def add_member_by_email(self, project_id: UUID, data: AddProjectMemberRequest, current_user: User) -> ProjectMemberResponse:
        """
        Adds a member to a project by email address.
        If user exists, links them immediately (outcome='added').
        If user does not exist, creates a PendingMembership record (outcome='pending').
        Prevents duplicate pending invitations for the same email and project.
        """
        project = check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER]
        )

        email_clean = data.email.strip().lower()
        role_enum = data.role if isinstance(data.role, ProjectRole) else ProjectRole(data.role)

        # Check if user already exists
        target_user = self.db.execute(select(User).filter(User.email == email_clean)).scalar_one_or_none()

        if target_user:
            # Check existing member
            existing = self.repo.get_member(project_id, target_user.id)
            if existing:
                raise BaseBusinessException("User is already a member of this project.", status_code=400)

            try:
                member = ProjectMember(
                    project_id=project_id,
                    user_id=target_user.id,
                    role=role_enum,
                )
                self.repo.add_member(member)
                self.db.commit()

                return ProjectMemberResponse(
                    id=member.id,
                    project_id=member.project_id,
                    user_id=member.user_id,
                    first_name=target_user.first_name,
                    last_name=target_user.last_name,
                    email=target_user.email,
                    role=member.role if isinstance(member.role, str) else member.role.value,
                    outcome="added",
                    is_pending=False,
                    created_at=member.created_at,
                )
            except Exception as e:
                self.db.rollback()
                raise e
        else:
            # User does not exist yet -> create pending membership
            existing_pending = self.db.execute(
                select(PendingMembership).filter(
                    PendingMembership.project_id == project_id,
                    PendingMembership.email == email_clean,
                )
            ).scalar_one_or_none()

            if existing_pending:
                raise BaseBusinessException("An invitation has already been sent to this email for this project.", status_code=400)

            try:
                pending = PendingMembership(
                    project_id=project_id,
                    email=email_clean,
                    role=role_enum,
                    invited_by=current_user.id,
                )
                self.db.add(pending)
                self.db.flush()
                self.db.commit()

                return ProjectMemberResponse(
                    id=pending.id,
                    project_id=pending.project_id,
                    user_id=None,
                    first_name="Pending",
                    last_name="User",
                    email=email_clean,
                    role=role_enum if isinstance(role_enum, str) else role_enum.value,
                    outcome="pending",
                    is_pending=True,
                    created_at=pending.created_at,
                )
            except Exception as e:
                self.db.rollback()
                raise e

    def add_member(self, project_id: UUID, data: AddProjectMemberRequest, current_user: User) -> ProjectMemberResponse:
        return self.add_member_by_email(project_id, data, current_user)

    def remove_member(self, project_id: UUID, target_user_id: UUID, current_user: User) -> None:
        """
        Removes a member from a project.
        - Self-removal: User removing themselves from a project is permitted regardless of role.
        - Admin/PM removal: Requires PROJECT_MANAGER or Company OWNER/ADMIN.
        - Cannot remove the last PROJECT_MANAGER on a project.
        """
        is_self_removal = str(target_user_id) == str(current_user.id)

        if not is_self_removal:
            check_project_role_or_company_admin(
                self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER]
            )
        else:
            project = self.db.execute(select(Project).filter(Project.id == project_id)).scalar_one_or_none()
            if not project or str(project.company_id) != str(current_user.company_id):
                raise Forbidden("You do not have access to this project.")

        member = self.repo.get_member(project_id, target_user_id)
        if not member:
            raise ResourceNotFound("Project member not found.")

        if member.role == ProjectRole.PROJECT_MANAGER or member.role == "PROJECT_MANAGER":
            pm_count = self.db.scalar(
                select(func.count(ProjectMember.id)).filter(
                    ProjectMember.project_id == project_id,
                    ProjectMember.role == ProjectRole.PROJECT_MANAGER,
                )
            )
            if pm_count is not None and pm_count <= 1:
                raise BaseBusinessException("Cannot remove the last Project Manager from a project.", status_code=400)

        try:
            self.db.delete(member)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
