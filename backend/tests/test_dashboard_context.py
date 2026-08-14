"""
Integration tests for /dashboard/context endpoint:
1. Super Admin flag context
2. Owner / Admin company context & capabilities
3. Project Manager workspace context & capabilities
4. Team Lead workspace context & capabilities
5. Developer workspace context & capabilities across all specializations (FRONTEND, BACKEND, AI_ML, QA_TESTING, DEVOPS, DESIGN, OTHER)
6. Viewer workspace context & strict is_read_only capabilities
7. Multi-project context switching (user belonging to Project A as PM, Project B as Developer+BACKEND, Project C as Team Lead)
8. Cross-tenant access rejection & unauthorized project_id override rejection
"""

import pytest
from sqlalchemy.orm import Session
from app.models.enums import CompanyRole, ProjectRole, Specialization
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.dashboard.service import DashboardService
from app.common.exceptions import Forbidden
from tests.conftest import create_company, create_user, create_project


def test_super_admin_context(db_session: Session):
    """Test 1: Super Admin returns is_super_admin: True in user context."""
    company = create_company(db_session, name="SuperAdmin Co")
    sa_user = create_user(db_session, company, email="sa@synapse.com", role=CompanyRole.OWNER)
    sa_user.is_super_admin = True
    db_session.commit()

    service = DashboardService(db_session)
    res = service.get_dashboard_context(sa_user)
    assert res.user.is_super_admin is True


def test_owner_admin_company_workspace(db_session: Session):
    """Test 2: Company OWNER/ADMIN receives company management capabilities and project list."""
    company = create_company(db_session, name="Owner Admin Co")
    owner = create_user(db_session, company, email="owner@owneradmin.com", role=CompanyRole.OWNER)
    p1 = create_project(db_session, company, name="Project 1")
    p2 = create_project(db_session, company, name="Project 2")

    service = DashboardService(db_session)
    res = service.get_dashboard_context(owner)

    assert res.user.company_role == "OWNER"
    assert len(res.projects) == 2
    assert res.capabilities.can_manage_members is True
    assert res.capabilities.can_manage_sprints is True
    assert res.capabilities.is_read_only is False


def test_project_manager_context(db_session: Session):
    """Test 3: Project Manager context receives can_manage_members and can_manage_sprints."""
    company = create_company(db_session, name="PM Co")
    pm_user = create_user(db_session, company, email="pm@pmco.com", role=None)
    project = create_project(db_session, company, name="PM Project")
    db_session.add(ProjectMember(project_id=project.id, user_id=pm_user.id, role=ProjectRole.PROJECT_MANAGER))
    db_session.commit()

    service = DashboardService(db_session)
    res = service.get_dashboard_context(pm_user)

    assert res.active_project.project_role == "PROJECT_MANAGER"
    assert res.capabilities.can_manage_members is True
    assert res.capabilities.can_manage_sprints is True
    assert res.capabilities.is_read_only is False


def test_team_lead_context(db_session: Session):
    """Test 4: Team Lead receives can_assign_tasks and can_edit_tasks but not can_manage_members."""
    company = create_company(db_session, name="TL Co")
    tl_user = create_user(db_session, company, email="tl@tlco.com", role=None)
    project = create_project(db_session, company, name="TL Project")
    db_session.add(ProjectMember(project_id=project.id, user_id=tl_user.id, role=ProjectRole.TEAM_LEAD))
    db_session.commit()

    service = DashboardService(db_session)
    res = service.get_dashboard_context(tl_user)

    assert res.active_project.project_role == "TEAM_LEAD"
    assert res.capabilities.can_assign_tasks is True
    assert res.capabilities.can_edit_tasks is True
    assert res.capabilities.can_manage_members is False


@pytest.mark.parametrize(
    "spec_enum, expected_spec_str",
    [
        (Specialization.FRONTEND, "FRONTEND"),
        (Specialization.BACKEND, "BACKEND"),
        (Specialization.AI_ML, "AI_ML"),
        (Specialization.QA_TESTING, "QA_TESTING"),
        (Specialization.DEVOPS, "DEVOPS"),
        (Specialization.DESIGN, "DESIGN"),
        (Specialization.OTHER, "OTHER"),
    ],
)
def test_developer_specializations_context(db_session: Session, spec_enum, expected_spec_str):
    """Test 5: Developer receives exact project specialization and developer capabilities."""
    company = create_company(db_session, name=f"Dev {expected_spec_str} Co")
    dev_user = create_user(db_session, company, email=f"dev_{expected_spec_str}@devco.com", role=None)
    project = create_project(db_session, company, name=f"Dev {expected_spec_str} Project")
    db_session.add(
        ProjectMember(
            project_id=project.id,
            user_id=dev_user.id,
            role=ProjectRole.DEVELOPER,
            specialization=spec_enum,
        )
    )
    db_session.commit()

    service = DashboardService(db_session)
    res = service.get_dashboard_context(dev_user)

    assert res.active_project.project_role == "DEVELOPER"
    assert res.active_project.specialization == expected_spec_str
    assert res.capabilities.can_edit_tasks is True
    assert res.capabilities.can_manage_members is False
    assert res.capabilities.is_read_only is False


def test_viewer_context(db_session: Session):
    """Test 6: Viewer context receives is_read_only: True and zero edit capabilities."""
    company = create_company(db_session, name="Viewer Co")
    viewer_user = create_user(db_session, company, email="viewer@viewerco.com", role=None)
    project = create_project(db_session, company, name="Viewer Project")
    db_session.add(ProjectMember(project_id=project.id, user_id=viewer_user.id, role=ProjectRole.VIEWER))
    db_session.commit()

    service = DashboardService(db_session)
    res = service.get_dashboard_context(viewer_user)

    assert res.active_project.project_role == "VIEWER"
    assert res.capabilities.is_read_only is True
    assert res.capabilities.can_manage_members is False
    assert res.capabilities.can_assign_tasks is False
    assert res.capabilities.can_manage_sprints is False


def test_multi_project_context_switching(db_session: Session):
    """Test 7: Multi-project user context switching between 3 projects with different roles & specializations."""
    company = create_company(db_session, name="MultiProj Co")
    user = create_user(db_session, company, email="alex@multiproj.com", role=None)

    p_a = create_project(db_session, company, name="Project Alpha")
    p_b = create_project(db_session, company, name="Project Beta")
    p_c = create_project(db_session, company, name="Project Gamma")

    # Project A: PROJECT_MANAGER
    db_session.add(ProjectMember(project_id=p_a.id, user_id=user.id, role=ProjectRole.PROJECT_MANAGER))
    # Project B: DEVELOPER + BACKEND
    db_session.add(ProjectMember(project_id=p_b.id, user_id=user.id, role=ProjectRole.DEVELOPER, specialization=Specialization.BACKEND))
    # Project C: TEAM_LEAD
    db_session.add(ProjectMember(project_id=p_c.id, user_id=user.id, role=ProjectRole.TEAM_LEAD))
    db_session.commit()

    service = DashboardService(db_session)

    # 1. Switch to Project A
    res_a = service.get_dashboard_context(user, project_id=p_a.id)
    assert res_a.active_project.project_id == p_a.id
    assert res_a.active_project.project_role == "PROJECT_MANAGER"
    assert res_a.capabilities.can_manage_members is True

    # 2. Switch to Project B
    res_b = service.get_dashboard_context(user, project_id=p_b.id)
    assert res_b.active_project.project_id == p_b.id
    assert res_b.active_project.project_role == "DEVELOPER"
    assert res_b.active_project.specialization == "BACKEND"
    assert res_b.capabilities.can_manage_members is False
    assert res_b.capabilities.can_edit_tasks is True

    # 3. Switch to Project C
    res_c = service.get_dashboard_context(user, project_id=p_c.id)
    assert res_c.active_project.project_id == p_c.id
    assert res_c.active_project.project_role == "TEAM_LEAD"
    assert res_c.capabilities.can_assign_tasks is True
    assert res_c.capabilities.can_manage_members is False


def test_cross_tenant_dashboard_context_rejection(db_session: Session):
    """Test 8: Accessing an unauthorized project context from another company raises Forbidden."""
    company_a = create_company(db_session, name="Company Alpha")
    company_b = create_company(db_session, name="Company Beta")

    user_a = create_user(db_session, company_a, email="user_a@alpha.com", role=None)
    user_b = create_user(db_session, company_b, email="user_b@beta.com", role=None)

    proj_a = create_project(db_session, company_a, name="Project Alpha")
    proj_b = create_project(db_session, company_b, name="Project Beta")

    db_session.add(ProjectMember(project_id=proj_a.id, user_id=user_a.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=proj_b.id, user_id=user_b.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    service = DashboardService(db_session)

    # user_a attempting to fetch dashboard context for proj_b must raise Forbidden
    with pytest.raises(Forbidden):
        service.get_dashboard_context(user_a, project_id=proj_b.id)
