import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from uuid import UUID

logger = logging.getLogger("app")

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.project_member import ProjectMember
from app.models.pending_membership import PendingMembership
from app.models.invitation import Invitation
from app.models.project import Project
from app.models.user import User
from app.models.enums import ProjectRole, Specialization, InvitationStatus
from app.project_members.repository import ProjectMemberRepository
from app.project_members.schemas import (
    AddProjectMemberRequest,
    InviteProjectMemberRequest,
    InvitationResponse,
    ValidateInvitationResponse,
    ProjectMemberResponse,
    ProjectMemberListResponse,
)
from app.common.exceptions import ResourceNotFound, Forbidden, BaseBusinessException
from app.permissions.dependencies import check_project_role_or_company_admin
from app.core.config import settings
from app.mail.service import mail_service


def hash_invitation_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class ProjectMemberService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectMemberRepository(db)

    def list_members(self, project_id: UUID, current_user: User) -> ProjectMemberListResponse:
        """
        Lists all active members and pending invitations for a project.
        """
        project = check_project_role_or_company_admin(self.db, current_user, project_id)

        members = self.repo.get_members_by_project(project_id)
        responses = []
        for m in members:
            u = m.user
            if u:
                spec_val = m.specialization if isinstance(m.specialization, str) or m.specialization is None else m.specialization.value
                responses.append(
                    ProjectMemberResponse(
                        id=m.id,
                        project_id=m.project_id,
                        user_id=m.user_id,
                        first_name=u.first_name,
                        last_name=u.last_name,
                        email=u.email,
                        role=m.role if isinstance(m.role, str) else m.role.value,
                        specialization=spec_val,
                        outcome="added",
                        is_pending=False,
                        created_at=m.created_at,
                    )
                )

        # Include pending invitations from canonical Invitation table
        invitations = self.db.execute(
            select(Invitation).filter(
                Invitation.project_id == project_id,
                Invitation.status == InvitationStatus.PENDING,
            )
        ).scalars().all()

        for inv in invitations:
            spec_val = inv.specialization if isinstance(inv.specialization, str) or inv.specialization is None else inv.specialization.value
            role_val = inv.project_role if isinstance(inv.project_role, str) else inv.project_role.value
            responses.append(
                ProjectMemberResponse(
                    id=inv.id,
                    project_id=inv.project_id,
                    user_id=None,
                    first_name="Pending",
                    last_name="User",
                    email=inv.email,
                    role=role_val,
                    specialization=spec_val,
                    outcome="pending",
                    is_pending=True,
                    created_at=inv.created_at,
                )
            )

        return ProjectMemberListResponse(members=responses, total=len(responses))

    def invite_member(
        self,
        project_id: UUID,
        data: InviteProjectMemberRequest,
        current_user: User,
    ) -> InvitationResponse:
        """
        Creates a secure project invitation with token hashing.
        Sends invitation email with raw token link. Stores ONLY hashed token in PostgreSQL.
        Allowed roles: PROJECT_MANAGER, TEAM_LEAD, or Company OWNER/ADMIN.
        """
        project = check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER, ProjectRole.TEAM_LEAD]
        )

        email_clean = data.email.strip().lower()
        role_enum = data.project_role if isinstance(data.project_role, ProjectRole) else ProjectRole(data.project_role)

        # 1. Check if user already exists and is a member of this project
        target_user = self.db.execute(select(User).filter(User.email == email_clean)).scalar_one_or_none()

        if target_user:
            if str(project.company_id) != str(target_user.company_id):
                raise BaseBusinessException(
                    "This email belongs to an account registered under a different company.",
                    status_code=400,
                )

            existing_member = self.repo.get_member(project_id, target_user.id)
            if existing_member:
                raise BaseBusinessException("User is already a member of this project.", status_code=400)

        # 2. Check for active pending invitation
        existing_pending_inv = self.db.execute(
            select(Invitation).filter(
                Invitation.project_id == project_id,
                Invitation.email == email_clean,
                Invitation.status == InvitationStatus.PENDING,
            )
        ).scalar_one_or_none()

        if existing_pending_inv:
            # If expired, mark expired to allow new invite
            if existing_pending_inv.expires_at < datetime.utcnow():
                existing_pending_inv.status = InvitationStatus.EXPIRED
                self.db.commit()
            else:
                raise BaseBusinessException("An active invitation has already been sent to this email for this project.", status_code=400)

        # 3. Check subscription user limit
        if project.company_id:
            from app.subscriptions.service import EntitlementService
            EntitlementService(self.db).check_user_limit(project.company_id)

        # 4. Generate cryptographically secure raw token and hash it
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_invitation_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(days=7)

        try:
            invitation = Invitation(
                company_id=project.company_id,
                project_id=project_id,
                email=email_clean,
                project_role=role_enum,
                specialization=data.specialization,
                personal_message=data.personal_message,
                token_hash=token_hash,
                status=InvitationStatus.PENDING,
                expires_at=expires_at,
                created_by=current_user.id,
            )
            self.db.add(invitation)

            # Synchronize PendingMembership record for compatibility
            existing_pending_mem = self.db.execute(
                select(PendingMembership).filter(
                    PendingMembership.project_id == project_id,
                    PendingMembership.email == email_clean,
                )
            ).scalar_one_or_none()

            if not existing_pending_mem:
                pending_mem = PendingMembership(
                    project_id=project_id,
                    email=email_clean,
                    role=role_enum,
                    specialization=data.specialization,
                    invited_by=current_user.id,
                )
                self.db.add(pending_mem)

            self.db.commit()
            self.db.refresh(invitation)

            join_url = f"{settings.FRONTEND_URL}/join?token={raw_token}"
            from app.models.company import Company
            company_obj = self.db.execute(select(Company).filter(Company.id == project.company_id)).scalar_one_or_none()
            company_name = company_obj.name if company_obj else "Synapse"

            # Send invitation email
            logger.info(
                f"[INVITATION_EMAIL_START] Recipient={email_clean}, ProjectID={project_id}, InvitationID={invitation.id}",
                extra={
                    "extra_info": {
                        "recipient": email_clean,
                        "project_id": str(project_id),
                        "invitation_id": str(invitation.id),
                    }
                },
            )
            email_sent = mail_service.send_invitation_email(
                email=email_clean,
                token=raw_token,
                company_name=company_name,
                project_name=project.name,
                role=role_enum.value if isinstance(role_enum, ProjectRole) else str(role_enum),
                specialization=data.specialization.value if data.specialization else None,
                personal_message=data.personal_message,
                inviter_name=f"{current_user.first_name} {current_user.last_name}",
                join_url=join_url,
                expires_at=expires_at,
            )

            logger.info(
                f"[INVITATION_EMAIL_END] Recipient={email_clean}, Outcome={'SUCCESS' if email_sent else 'FAILED'}",
                extra={
                    "extra_info": {
                        "recipient": email_clean,
                        "invitation_id": str(invitation.id),
                        "email_sent": email_sent,
                    }
                },
            )

            role_str = role_enum.value if isinstance(role_enum, ProjectRole) else str(role_enum)
            spec_str = data.specialization.value if data.specialization else None

            return InvitationResponse(
                id=invitation.id,
                company_id=invitation.company_id,
                project_id=invitation.project_id,
                email=invitation.email,
                project_role=role_str,
                specialization=spec_str,
                personal_message=invitation.personal_message,
                status=invitation.status.value if isinstance(invitation.status, InvitationStatus) else str(invitation.status),
                expires_at=invitation.expires_at,
                created_by=invitation.created_by,
                created_at=invitation.created_at,
                join_url=join_url,
            )

        except Exception as e:
            self.db.rollback()
            raise e

    def add_member_by_email(self, project_id: UUID, data: AddProjectMemberRequest, current_user: User) -> ProjectMemberResponse:
        """
        Adds a member to a project by email address.
        If user exists, links them immediately (outcome='added').
        If user does not exist, creates an Invitation record (outcome='pending').
        """
        project = check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER]
        )

        email_clean = data.email.strip().lower()
        role_enum = data.role if isinstance(data.role, ProjectRole) else ProjectRole(data.role)

        target_user = self.db.execute(select(User).filter(User.email == email_clean)).scalar_one_or_none()

        if target_user:
            if str(project.company_id) != str(target_user.company_id):
                raise BaseBusinessException(
                    "This email belongs to an account registered under a different company and can't be added to this project.",
                    status_code=400,
                )

            existing = self.repo.get_member(project_id, target_user.id)
            if existing:
                raise BaseBusinessException("User is already a member of this project.", status_code=400)

            try:
                member = ProjectMember(
                    project_id=project_id,
                    user_id=target_user.id,
                    role=role_enum,
                    specialization=data.specialization,
                )
                self.repo.add_member(member)
                self.db.commit()

                spec_val = member.specialization if isinstance(member.specialization, str) or member.specialization is None else member.specialization.value

                return ProjectMemberResponse(
                    id=member.id,
                    project_id=member.project_id,
                    user_id=member.user_id,
                    first_name=target_user.first_name,
                    last_name=target_user.last_name,
                    email=target_user.email,
                    role=member.role if isinstance(member.role, str) else member.role.value,
                    specialization=spec_val,
                    outcome="added",
                    is_pending=False,
                    created_at=member.created_at,
                )
            except Exception as e:
                self.db.rollback()
                raise e
        else:
            invite_data = InviteProjectMemberRequest(
                email=data.email,
                project_role=data.role,
                specialization=data.specialization,
                personal_message=None,
            )
            inv_res = self.invite_member(project_id, invite_data, current_user)
            return ProjectMemberResponse(
                id=inv_res.id,
                project_id=inv_res.project_id,
                user_id=None,
                first_name="Pending",
                last_name="User",
                email=inv_res.email,
                role=inv_res.project_role,
                specialization=inv_res.specialization,
                outcome="pending",
                is_pending=True,
                created_at=inv_res.created_at,
            )

    def validate_invitation(self, raw_token: str) -> ValidateInvitationResponse:
        """
        Validates a raw invitation token.
        Hashes the token, finds invitation, checks status and expiry.
        """
        token_hash = hash_invitation_token(raw_token)
        invitation = self.db.execute(
            select(Invitation).filter(Invitation.token_hash == token_hash)
        ).scalar_one_or_none()

        if not invitation:
            raise ResourceNotFound("Invalid or unknown invitation token.")

        now = datetime.utcnow()
        if invitation.status == InvitationStatus.PENDING and invitation.expires_at < now:
            invitation.status = InvitationStatus.EXPIRED
            self.db.commit()

        status_str = invitation.status.value if isinstance(invitation.status, InvitationStatus) else str(invitation.status)
        is_valid = invitation.status == InvitationStatus.PENDING and invitation.expires_at >= now

        inviter_name = f"{invitation.inviter.first_name} {invitation.inviter.last_name}" if invitation.inviter else "Project Manager"
        company_name = invitation.company.name if invitation.company else "Company"
        project_name = invitation.project.name if invitation.project else "Project"

        return ValidateInvitationResponse(
            id=invitation.id,
            company_id=invitation.company_id,
            company_name=company_name,
            project_id=invitation.project_id,
            project_name=project_name,
            email=invitation.email,
            project_role=invitation.project_role.value if isinstance(invitation.project_role, ProjectRole) else str(invitation.project_role),
            specialization=invitation.specialization.value if invitation.specialization else None,
            personal_message=invitation.personal_message,
            inviter_name=inviter_name,
            status=status_str,
            expires_at=invitation.expires_at,
            is_valid=is_valid,
        )

    def accept_invitation(self, raw_token: str, current_user: User) -> ProjectMemberResponse:
        """
        Authenticated user accepts a valid project invitation token.
        """
        token_hash = hash_invitation_token(raw_token)
        invitation = self.db.execute(
            select(Invitation).filter(Invitation.token_hash == token_hash)
        ).scalar_one_or_none()

        if not invitation:
            raise ResourceNotFound("Invalid or unknown invitation token.")

        if invitation.status == InvitationStatus.EXPIRED or (invitation.status == InvitationStatus.PENDING and invitation.expires_at < datetime.utcnow()):
            invitation.status = InvitationStatus.EXPIRED
            self.db.commit()
            raise BaseBusinessException("This invitation link has expired.", status_code=400)

        if invitation.status == InvitationStatus.ACCEPTED:
            raise BaseBusinessException("This invitation has already been accepted.", status_code=400)

        if invitation.status == InvitationStatus.REVOKED:
            raise BaseBusinessException("This invitation has been revoked by the project manager.", status_code=400)

        # Check requested email matches authenticated user email
        if current_user.email.strip().lower() != invitation.email.strip().lower():
            raise BaseBusinessException("Authenticated user email does not match invitation email address.", status_code=400)

        # Check company isolation
        if str(current_user.company_id) != str(invitation.company_id):
            raise BaseBusinessException("Your user account belongs to a different company than this invitation.", status_code=400)

        # Check if user is already a member of this project
        existing_member = self.repo.get_member(invitation.project_id, current_user.id)
        if existing_member:
            invitation.status = InvitationStatus.ACCEPTED
            invitation.used_at = datetime.utcnow()
            self.db.commit()
            return ProjectMemberResponse(
                id=existing_member.id,
                project_id=existing_member.project_id,
                user_id=existing_member.user_id,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
                email=current_user.email,
                role=existing_member.role if isinstance(existing_member.role, str) else existing_member.role.value,
                specialization=existing_member.specialization.value if existing_member.specialization else None,
                outcome="added",
                is_pending=False,
                created_at=existing_member.created_at,
            )

        try:
            member = ProjectMember(
                project_id=invitation.project_id,
                user_id=current_user.id,
                role=invitation.project_role,
                specialization=invitation.specialization,
            )
            self.db.add(member)

            # Mark invitation accepted
            invitation.status = InvitationStatus.ACCEPTED
            invitation.used_at = datetime.utcnow()

            # Clean up pending membership
            pendings = self.db.execute(
                select(PendingMembership).filter(
                    PendingMembership.project_id == invitation.project_id,
                    PendingMembership.email == invitation.email,
                )
            ).scalars().all()
            for p in pendings:
                self.db.delete(p)

            self.db.commit()
            self.db.refresh(member)

            role_str = member.role.value if isinstance(member.role, ProjectRole) else str(member.role)
            spec_str = member.specialization.value if member.specialization else None

            return ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
                email=current_user.email,
                role=role_str,
                specialization=spec_str,
                outcome="added",
                is_pending=False,
                created_at=member.created_at,
            )
        except Exception as e:
            self.db.rollback()
            raise e

    def revoke_invitation(self, project_id: UUID, invitation_id: UUID, current_user: User) -> None:
        """
        Revokes a pending project invitation.
        Allowed roles: PROJECT_MANAGER or Company OWNER/ADMIN.
        """
        project = check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER]
        )

        invitation = self.db.execute(
            select(Invitation).filter(
                Invitation.id == invitation_id,
                Invitation.project_id == project_id,
            )
        ).scalar_one_or_none()

        if not invitation:
            raise ResourceNotFound("Invitation not found.")

        # Multi-tenant isolation check: company IDs must match
        if str(project.company_id) != str(invitation.company_id):
            raise BaseBusinessException("Forbidden: Invitation belongs to a different company.", status_code=403)

        if invitation.status == InvitationStatus.REVOKED:
            raise BaseBusinessException("Invitation is already revoked.", status_code=409)

        if invitation.status == InvitationStatus.ACCEPTED:
            raise BaseBusinessException("Cannot revoke an invitation that has already been accepted.", status_code=409)

        if invitation.status != InvitationStatus.PENDING:
            raise BaseBusinessException("Invitation is not in pending status.", status_code=400)

        try:
            invitation.status = InvitationStatus.REVOKED
            invitation.revoked_at = datetime.utcnow()

            # Clean up legacy pending membership if any
            pendings = self.db.execute(
                select(PendingMembership).filter(
                    PendingMembership.project_id == project_id,
                    PendingMembership.email == invitation.email,
                )
            ).scalars().all()
            for p in pendings:
                self.db.delete(p)

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def remove_member(self, project_id: UUID, target_user_id: UUID, current_user: User) -> None:
        """
        Removes a member from a project.
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

    def update_member_role(
        self,
        project_id: UUID,
        target_user_id: UUID,
        data,
        current_user: User,
    ) -> ProjectMemberResponse:
        """
        Updates a member's role and specialization in a project.
        Allowed roles: PROJECT_MANAGER or Company OWNER/ADMIN.
        """
        check_project_role_or_company_admin(
            self.db, current_user, project_id, [ProjectRole.PROJECT_MANAGER]
        )

        member = self.repo.get_member(project_id, target_user_id)
        if not member:
            raise ResourceNotFound("Project member not found.")

        role_enum = data.role if isinstance(data.role, ProjectRole) else ProjectRole(data.role)

        # Prevent removing the last PM
        if (member.role == ProjectRole.PROJECT_MANAGER or member.role == "PROJECT_MANAGER") and role_enum != ProjectRole.PROJECT_MANAGER:
            pm_count = self.db.scalar(
                select(func.count(ProjectMember.id)).filter(
                    ProjectMember.project_id == project_id,
                    ProjectMember.role == ProjectRole.PROJECT_MANAGER,
                )
            )
            if pm_count is not None and pm_count <= 1:
                raise BaseBusinessException("Cannot demote the last Project Manager of a project.", status_code=400)

        try:
            member.role = role_enum
            member.specialization = data.specialization
            self.db.commit()
            self.db.refresh(member)

            u = member.user
            spec_val = member.specialization.value if member.specialization else None

            return ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                first_name=u.first_name if u else "",
                last_name=u.last_name if u else "",
                email=u.email if u else "",
                role=member.role.value if isinstance(member.role, ProjectRole) else str(member.role),
                specialization=spec_val,
                outcome="added",
                is_pending=False,
                created_at=member.created_at,
            )
        except Exception as e:
            self.db.rollback()
            raise e
