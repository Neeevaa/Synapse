"""
Comprehensive Invitation & Project Membership Lifecycle Tests (20 Acceptance Scenarios).
"""
import secrets
from datetime import datetime, timedelta
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.invitation import Invitation
from app.models.enums import CompanyRole, ProjectRole, Specialization, InvitationStatus
from app.project_members.service import ProjectMemberService, hash_invitation_token
from app.project_members.schemas import InviteProjectMemberRequest
from app.auth.service import AuthService
from app.auth.schemas import TeamMemberRegisterRequest
from app.common.exceptions import BaseBusinessException, ResourceNotFound
from tests.conftest import create_company, create_user, create_project, create_pending_membership


def create_invitation(
    db: Session,
    project: Project,
    inviter: User,
    email: str,
    role: ProjectRole = ProjectRole.DEVELOPER,
    specialization: Specialization | None = Specialization.BACKEND,
    expires_delta: timedelta = timedelta(days=7),
    status: InvitationStatus = InvitationStatus.PENDING,
) -> tuple[Invitation, str]:
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_invitation_token(raw_token)
    inv = Invitation(
        company_id=project.company_id,
        project_id=project.id,
        email=email.strip().lower(),
        project_role=role,
        specialization=specialization,
        token_hash=token_hash,
        status=status,
        expires_at=datetime.utcnow() + expires_delta,
        created_by=inviter.id,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv, raw_token


def test_1_new_user_with_valid_invitation_accepts(db_session: Session):
    """1. New user + valid invitation -> ACCEPT on registration"""
    company = create_company(db_session, name="Co1")
    owner = create_user(db_session, company, email="owner1@co1.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Proj1")
    
    inv_email = "newbie@co1.com"
    inv, token = create_invitation(db_session, project, owner, inv_email, role=ProjectRole.DEVELOPER, specialization=Specialization.FRONTEND)
    
    auth_service = AuthService(db_session)
    reg_req = TeamMemberRegisterRequest(
        first_name="New",
        last_name="User",
        email=inv_email,
        password="Password123!",
        invitation_token=token,
    )
    auth_service.register_team_member(reg_req)
    
    user = db_session.query(User).filter(User.email == inv_email).first()
    assert user is not None
    pm = db_session.query(ProjectMember).filter(ProjectMember.user_id == user.id, ProjectMember.project_id == project.id).first()
    assert pm is not None
    assert pm.role == ProjectRole.DEVELOPER
    assert pm.specialization == Specialization.FRONTEND


def test_2_existing_logged_in_user_accepts_valid_invitation(db_session: Session):
    """2. Existing logged-in user + valid invitation -> ACCEPT via service.accept_invitation"""
    company = create_company(db_session, name="Co2")
    owner = create_user(db_session, company, email="owner2@co2.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev2@co2.com", role=None)
    project = create_project(db_session, company, name="Proj2")
    
    inv, token = create_invitation(db_session, project, owner, dev.email, role=ProjectRole.DEVELOPER, specialization=Specialization.BACKEND)
    
    pm_service = ProjectMemberService(db_session)
    res = pm_service.accept_invitation(token, dev)
    
    assert res.project_id == project.id
    pm = db_session.query(ProjectMember).filter(ProjectMember.user_id == dev.id, ProjectMember.project_id == project.id).first()
    assert pm is not None
    assert pm.role == ProjectRole.DEVELOPER
    assert pm.specialization == Specialization.BACKEND


def test_3_existing_user_accepts_via_invitation_id(db_session: Session):
    """3. Existing logged-in user accepts invitation via invitation_id directly from dashboard"""
    company = create_company(db_session, name="Co3")
    owner = create_user(db_session, company, email="owner3@co3.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev3@co3.com", role=None)
    project = create_project(db_session, company, name="Proj3")
    
    inv, token = create_invitation(db_session, project, owner, dev.email, role=ProjectRole.TEAM_LEAD, specialization=None)
    
    pm_service = ProjectMemberService(db_session)
    res = pm_service.accept_invitation(raw_token=None, current_user=dev, invitation_id=inv.id)
    assert res.project_id == project.id


def test_4_and_5_project_deletion_user_survives_invitation_invalid(db_session: Session):
    """4 & 5. Project A deleted -> User survives, Project A invitation invalid"""
    company = create_company(db_session, name="Co4")
    owner = create_user(db_session, company, email="owner4@co4.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev4@co4.com", role=None)
    proj_a = create_project(db_session, company, name="ProjA")
    
    inv_a, token_a = create_invitation(db_session, proj_a, owner, dev.email)
    
    # Delete Project A
    db_session.delete(proj_a)
    db_session.commit()
    
    # User 4 MUST survive
    surviving_dev = db_session.query(User).filter(User.id == dev.id).first()
    assert surviving_dev is not None
    
    # Project A invitation MUST be invalid/deleted
    pm_service = ProjectMemberService(db_session)
    with pytest.raises(ResourceNotFound):
        pm_service.accept_invitation(token_a, dev)


def test_6_same_user_invited_to_project_b_after_deletion(db_session: Session):
    """6. Same user invited to Project B after Project A deletion -> ACCEPT"""
    company = create_company(db_session, name="Co6")
    owner = create_user(db_session, company, email="owner6@co6.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev6@co6.com", role=None)
    
    # Project A deleted
    proj_a = create_project(db_session, company, name="ProjA")
    db_session.delete(proj_a)
    db_session.commit()
    
    # Project B created & dev invited
    proj_b = create_project(db_session, company, name="ProjB")
    inv_b, token_b = create_invitation(db_session, proj_b, owner, dev.email, role=ProjectRole.PROJECT_MANAGER)
    
    pm_service = ProjectMemberService(db_session)
    res = pm_service.accept_invitation(token_b, dev)
    assert res.project_id == proj_b.id
    pm = db_session.query(ProjectMember).filter(ProjectMember.user_id == dev.id, ProjectMember.project_id == proj_b.id).first()
    assert pm.role == ProjectRole.PROJECT_MANAGER


def test_7_user_belongs_to_multiple_projects(db_session: Session):
    """7. Same user belongs to Project A + Project B -> both memberships preserved"""
    company = create_company(db_session, name="Co7")
    owner = create_user(db_session, company, email="owner7@co7.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev7@co7.com", role=None)
    
    proj1 = create_project(db_session, company, name="Proj7_1")
    proj2 = create_project(db_session, company, name="Proj7_2")
    
    inv1, t1 = create_invitation(db_session, proj1, owner, dev.email, role=ProjectRole.DEVELOPER, specialization=Specialization.FRONTEND)
    inv2, t2 = create_invitation(db_session, proj2, owner, dev.email, role=ProjectRole.TEAM_LEAD, specialization=None)
    
    pm_service = ProjectMemberService(db_session)
    pm_service.accept_invitation(t1, dev)
    pm_service.accept_invitation(t2, dev)
    
    memberships = db_session.query(ProjectMember).filter(ProjectMember.user_id == dev.id).all()
    assert len(memberships) == 2


def test_8_and_9_idempotent_acceptance(db_session: Session):
    """8 & 9. Same invitation accepted twice -> idempotent, no duplicate membership"""
    company = create_company(db_session, name="Co8")
    owner = create_user(db_session, company, email="owner8@co8.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev8@co8.com", role=None)
    proj = create_project(db_session, company, name="Proj8")
    
    inv, token = create_invitation(db_session, proj, owner, dev.email)
    pm_service = ProjectMemberService(db_session)
    
    res1 = pm_service.accept_invitation(token, dev)
    with pytest.raises(BaseBusinessException):
        pm_service.accept_invitation(token, dev)
    
    memberships = db_session.query(ProjectMember).filter(ProjectMember.user_id == dev.id, ProjectMember.project_id == proj.id).all()
    assert len(memberships) == 1


def test_11_expired_invitation_rejected(db_session: Session):
    """11. Expired invitation -> reject"""
    company = create_company(db_session, name="Co11")
    owner = create_user(db_session, company, email="owner11@co11.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev11@co11.com", role=None)
    proj = create_project(db_session, company, name="Proj11")
    
    inv, token = create_invitation(db_session, proj, owner, dev.email, expires_delta=timedelta(days=-1))
    pm_service = ProjectMemberService(db_session)
    
    with pytest.raises(BaseBusinessException) as exc_info:
        pm_service.accept_invitation(token, dev)
    assert "expired" in str(exc_info.value).lower()


def test_12_revoked_invitation_rejected(db_session: Session):
    """12. Revoked invitation -> reject"""
    company = create_company(db_session, name="Co12")
    owner = create_user(db_session, company, email="owner12@co12.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev12@co12.com", role=None)
    proj = create_project(db_session, company, name="Proj12")
    
    inv, token = create_invitation(db_session, proj, owner, dev.email, status=InvitationStatus.REVOKED)
    pm_service = ProjectMemberService(db_session)
    
    with pytest.raises(BaseBusinessException) as exc_info:
        pm_service.accept_invitation(token, dev)
    assert "revoked" in str(exc_info.value).lower()


def test_13_non_recipient_account_rejected(db_session: Session):
    """13. Non-recipient account opens invitation -> reject"""
    company = create_company(db_session, name="Co13")
    owner = create_user(db_session, company, email="owner13@co13.com", role=CompanyRole.OWNER)
    dev1 = create_user(db_session, company, email="target13@co13.com", role=None)
    dev2 = create_user(db_session, company, email="wrong13@co13.com", role=None)
    proj = create_project(db_session, company, name="Proj13")
    
    inv, token = create_invitation(db_session, proj, owner, dev1.email)
    pm_service = ProjectMemberService(db_session)
    
    with pytest.raises(BaseBusinessException) as exc_info:
        pm_service.accept_invitation(token, dev2)
    assert "does not match" in str(exc_info.value).lower()


def test_14_cross_tenant_invitation_rejected(db_session: Session):
    """14. Company A user + Company B invitation -> reject"""
    comp_a = create_company(db_session, name="CompanyA")
    comp_b = create_company(db_session, name="CompanyB")
    
    owner_b = create_user(db_session, comp_b, email="ownerB@compB.com", role=CompanyRole.OWNER)
    user_a = create_user(db_session, comp_a, email="userA@compA.com", role=None)
    proj_b = create_project(db_session, comp_b, name="ProjB")
    
    inv, token = create_invitation(db_session, proj_b, owner_b, user_a.email)
    pm_service = ProjectMemberService(db_session)
    
    with pytest.raises(BaseBusinessException) as exc_info:
        pm_service.accept_invitation(token, user_a)
    assert "different company" in str(exc_info.value).lower()


def test_19_pending_invitation_discovery_endpoint(db_session: Session):
    """19. Pending invitation appears in GET /invitations/my-pending without logout/login"""
    company = create_company(db_session, name="Co19")
    owner = create_user(db_session, company, email="owner19@co19.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev19@co19.com", role=None)
    proj = create_project(db_session, company, name="Proj19")
    
    inv, token = create_invitation(db_session, proj, owner, dev.email, role=ProjectRole.DEVELOPER, specialization=Specialization.AI_ML)
    
    pm_service = ProjectMemberService(db_session)
    pending_list = pm_service.get_my_pending_invitations(dev)
    
    assert len(pending_list) == 1
    assert pending_list[0].project_name == "Proj19"
    assert pending_list[0].specialization == "AI_ML"
