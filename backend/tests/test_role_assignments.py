"""
Integration and unit tests for role assignment rules in Synapse backend:
1. Registering an invited team member sets no CompanyRole (user.role is None).
2. Creating a project sets ProjectRole.PROJECT_MANAGER for the creator.
"""
import pytest
from sqlalchemy.orm import Session
from app.auth.service import AuthService
from app.auth.schemas import TeamMemberRegisterRequest
from app.projects.service import ProjectService
from app.projects.schemas import CreateProjectRequest
from app.models.user import User
from app.models.project_member import ProjectMember
from app.models.enums import CompanyRole, ProjectRole
from tests.conftest import create_company, create_user, create_project, create_pending_membership


def test_register_team_member_has_no_company_role(db_session: Session):
    """
    Test that registering an invited team member results in no CompanyRole being set (user.role is None),
    and that their project role is preserved from PendingMembership.
    """
    company = create_company(db_session, name="Role Test Inc")
    owner = create_user(db_session, company, email="owner@roletest.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Role Test Project")
    
    invited_email = "developer@roletest.com"
    create_pending_membership(
        db_session,
        project=project,
        inviter=owner,
        email=invited_email,
        role=ProjectRole.DEVELOPER,
    )

    auth_service = AuthService(db_session)
    register_req = TeamMemberRegisterRequest(
        first_name="Dev",
        last_name="User",
        email=invited_email,
        password="SecurePassword123!",
    )

    result = auth_service.register_team_member(register_req)
    assert result.user_id is not None

    # Query newly created user
    new_user = db_session.query(User).filter(User.id == result.user_id).first()
    assert new_user is not None
    assert new_user.role is None, f"Expected user.role to be None, got {new_user.role}"

    # Verify ProjectMember record preserves DEVELOPER role
    member = (
        db_session.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == new_user.id)
        .first()
    )
    assert member is not None
    assert member.role == ProjectRole.DEVELOPER


def test_create_project_assigns_project_manager_to_creator(db_session: Session):
    """
    Test that creating a new project automatically assigns ProjectRole.PROJECT_MANAGER to the project creator.
    """
    company = create_company(db_session, name="PM Creator Inc")
    owner = create_user(db_session, company, email="creator@pmcreator.com", role=CompanyRole.OWNER)

    project_service = ProjectService(db_session)
    create_req = CreateProjectRequest(
        name="New Alpha Project",
        description="Testing creator project role assignment",
    )

    res = project_service.create_project(create_req, owner)
    assert res.id is not None

    # Query ProjectMember record created for the project creator
    member = (
        db_session.query(ProjectMember)
        .filter(ProjectMember.project_id == res.id, ProjectMember.user_id == owner.id)
        .first()
    )
    assert member is not None
    assert member.role == ProjectRole.PROJECT_MANAGER, f"Expected PROJECT_MANAGER, got {member.role}"


def test_check_project_role_or_company_admin_cross_tenant_rejection(db_session: Session):
    """
    Test that check_project_role_or_company_admin rejects cross-tenant access regardless of user role,
    and enforces permitted ProjectRoles for same-tenant members.
    """
    from app.permissions.dependencies import check_project_role_or_company_admin
    from app.common.exceptions import Forbidden

    company_a = create_company(db_session, name="Company A")
    company_b = create_company(db_session, name="Company B")

    owner_a = create_user(db_session, company_a, email="owner_a@compa.com", role=CompanyRole.OWNER)
    dev_a = create_user(db_session, company_a, email="dev_a@compa.com", role=None)
    owner_b = create_user(db_session, company_b, email="owner_b@compb.com", role=CompanyRole.OWNER)

    project_a = create_project(db_session, company_a, name="Project A")

    # Add dev_a as DEVELOPER on project_a
    db_session.add(ProjectMember(project_id=project_a.id, user_id=dev_a.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    # 1. Cross-tenant access by owner_b (Company OWNER of Company B) on Project A must be rejected
    with pytest.raises(Forbidden) as exc:
        check_project_role_or_company_admin(db_session, owner_b, project_a.id, [ProjectRole.PROJECT_MANAGER])
    assert "do not have access" in str(exc.value).lower()

    # 2. Same-tenant OWNER_A on Project A passes
    proj = check_project_role_or_company_admin(db_session, owner_a, project_a.id, [ProjectRole.PROJECT_MANAGER])
    assert proj.id == project_a.id

    # 3. Same-tenant dev_a (DEVELOPER) fails when PROJECT_MANAGER is required
    with pytest.raises(Forbidden) as exc:
        check_project_role_or_company_admin(db_session, dev_a, project_a.id, [ProjectRole.PROJECT_MANAGER])
    assert "only project managers" in str(exc.value).lower()


def test_developer_and_viewer_rejection_for_sprints_and_member_invitations(db_session: Session):
    """
    Test that DEVELOPER and VIEWER roles are rejected when attempting to create sprints or add members,
    while task status updates for assigned tasks succeed.
    """
    from app.sprints.service import SprintService
    from app.sprints.schemas import CreateSprintRequest
    from app.project_members.service import ProjectMemberService
    from app.project_members.schemas import AddProjectMemberRequest
    from app.tasks.service import TaskService
    from app.tasks.schemas import CreateTaskRequest, UpdateTaskStatusRequest
    from app.common.exceptions import Forbidden

    company = create_company(db_session, name="Dev Rejection Inc")
    owner = create_user(db_session, company, email="owner@devrej.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="developer@devrej.com", role=None)
    viewer = create_user(db_session, company, email="viewer@devrej.com", role=None)

    project = create_project(db_session, company, name="Dev Rejection Project")

    # Add dev and viewer as members
    db_session.add(ProjectMember(project_id=project.id, user_id=dev.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=project.id, user_id=viewer.id, role=ProjectRole.VIEWER))
    db_session.commit()

    sprint_service = SprintService(db_session)
    member_service = ProjectMemberService(db_session)
    task_service = TaskService(db_session)

    # 1. Developer creating sprint -> REJECTED
    with pytest.raises(Forbidden):
        sprint_service.create_sprint(project.id, CreateSprintRequest(name="Dev Sprint"), dev)

    # 2. Viewer adding member -> REJECTED
    with pytest.raises(Forbidden):
        member_service.add_member_by_email(project.id, AddProjectMemberRequest(email="new@devrej.com", role=ProjectRole.DEVELOPER), viewer)

    # 3. Developer creating task -> REJECTED (only PM/TL/Admin)
    with pytest.raises(Forbidden):
        task_service.create_task(project.id, CreateTaskRequest(title="Dev Task"), dev)

    # 4. Owner creates task and assigns to dev
    task_res = task_service.create_task(project.id, CreateTaskRequest(title="Assigned Task", assignee_id=dev.id), owner)

    # 5. Developer updating status of assigned task -> ALLOWED
    updated_task = task_service.update_task_status(task_res.id, UpdateTaskStatusRequest(status="IN_PROGRESS"), dev)
    assert updated_task.status == "IN_PROGRESS"


def test_delete_member_rbac_and_last_pm_guard(db_session: Session):
    """
    Test member removal permissions:
    1. Removing the last PROJECT_MANAGER is rejected (400 Bad Request).
    2. Developer removing another member is rejected (403 Forbidden).
    3. Self-removal by a Developer succeeds.
    4. Project Manager removing a Developer succeeds.
    """
    from app.project_members.service import ProjectMemberService
    from app.common.exceptions import Forbidden, BaseBusinessException

    company = create_company(db_session, name="Member Del Inc")
    pm_user = create_user(db_session, company, email="pm@memberdel.com", role=None)
    dev_user = create_user(db_session, company, email="dev@memberdel.com", role=None)

    project = create_project(db_session, company, name="Member Del Project")

    # Add pm_user as PROJECT_MANAGER, dev_user as DEVELOPER
    db_session.add(ProjectMember(project_id=project.id, user_id=pm_user.id, role=ProjectRole.PROJECT_MANAGER))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev_user.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    member_service = ProjectMemberService(db_session)

    # 1. PM trying to remove themselves when they are the ONLY PM -> REJECTED (last PM guard)
    with pytest.raises(BaseBusinessException) as exc:
        member_service.remove_member(project.id, pm_user.id, pm_user)
    assert "last project manager" in str(exc.value).lower()

    # 2. Developer trying to remove PM -> REJECTED (403 Forbidden)
    with pytest.raises(Forbidden):
        member_service.remove_member(project.id, pm_user.id, dev_user)

    # 3. PM removing Developer -> ALLOWED
    member_service.remove_member(project.id, dev_user.id, pm_user)
    leftover = db_session.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == dev_user.id).first()
    assert leftover is None

    # 4. Self-removal: re-add dev_user, then dev_user removes themselves -> ALLOWED
    db_session.add(ProjectMember(project_id=project.id, user_id=dev_user.id, role=ProjectRole.DEVELOPER))
    db_session.commit()
    member_service.remove_member(project.id, dev_user.id, dev_user)
    leftover2 = db_session.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == dev_user.id).first()
    assert leftover2 is None


def test_delete_task_rbac_and_cross_tenant_rejection(db_session: Session):
    """
    Test task deletion permissions:
    1. Developer deleting a task -> REJECTED (403 Forbidden).
    2. Cross-tenant user deleting a task -> REJECTED (403 Forbidden).
    3. Project Manager or Company Owner deleting a task -> ALLOWED.
    """
    from app.tasks.service import TaskService
    from app.tasks.schemas import CreateTaskRequest
    from app.common.exceptions import Forbidden

    company_a = create_company(db_session, name="Task Del Co A")
    company_b = create_company(db_session, name="Task Del Co B")

    owner_a = create_user(db_session, company_a, email="owner@coa.com", role=CompanyRole.OWNER)
    dev_a = create_user(db_session, company_a, email="dev@coa.com", role=None)
    owner_b = create_user(db_session, company_b, email="owner@cob.com", role=CompanyRole.OWNER)

    project_a = create_project(db_session, company_a, name="Task Del Project A")
    db_session.add(ProjectMember(project_id=project_a.id, user_id=dev_a.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    task_service = TaskService(db_session)
    task_res = task_service.create_task(project_a.id, CreateTaskRequest(title="Task to Delete"), owner_a)

    # 1. Developer deleting task -> REJECTED
    with pytest.raises(Forbidden):
        task_service.delete_task(task_res.id, dev_a)

    # 2. Cross-tenant user (owner_b from Company B) deleting task -> REJECTED
    with pytest.raises(Forbidden) as exc:
        task_service.delete_task(task_res.id, owner_b)
    assert "do not have access" in str(exc.value).lower()

    # 3. Owner A deleting task -> ALLOWED
    task_service.delete_task(task_res.id, owner_a)
    assert task_service.repo.get_task_by_id(task_res.id) is None


def test_update_task_rbac_and_unassigned_dev_status_rejection(db_session: Session):
    """
    1. Test PUT /tasks/{task_id}: Developer & Viewer rejected; PM, Team Lead, and Company Owner/Admin succeed.
    2. Test PATCH /tasks/{task_id}/status: Rejected for Developer who is neither assignee nor creator.
    """
    from app.tasks.service import TaskService
    from app.tasks.schemas import CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest
    from app.common.exceptions import Forbidden

    company = create_company(db_session, name="Task RBAC Inc")
    owner = create_user(db_session, company, email="owner@taskrbac.com", role=CompanyRole.OWNER)
    pm = create_user(db_session, company, email="pm@taskrbac.com", role=None)
    tl = create_user(db_session, company, email="tl@taskrbac.com", role=None)
    dev_assignee = create_user(db_session, company, email="dev1@taskrbac.com", role=None)
    dev_unassigned = create_user(db_session, company, email="dev2@taskrbac.com", role=None)
    viewer = create_user(db_session, company, email="viewer@taskrbac.com", role=None)

    project = create_project(db_session, company, name="Task RBAC Project")
    db_session.add(ProjectMember(project_id=project.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER))
    db_session.add(ProjectMember(project_id=project.id, user_id=tl.id, role=ProjectRole.TEAM_LEAD))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev_assignee.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev_unassigned.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=project.id, user_id=viewer.id, role=ProjectRole.VIEWER))
    db_session.commit()

    task_service = TaskService(db_session)
    task_res = task_service.create_task(project.id, CreateTaskRequest(title="Original Task", assignee_id=dev_assignee.id), owner)

    # 1. Developer (dev_unassigned) updating task details -> REJECTED (403 Forbidden)
    with pytest.raises(Forbidden):
        task_service.update_task(task_res.id, UpdateTaskRequest(title="Dev Updated"), dev_unassigned)

    # 2. Viewer updating task details -> REJECTED (403 Forbidden)
    with pytest.raises(Forbidden):
        task_service.update_task(task_res.id, UpdateTaskRequest(title="Viewer Updated"), viewer)

    # 3. Team Lead updating task details -> ALLOWED
    tl_updated = task_service.update_task(task_res.id, UpdateTaskRequest(title="TL Updated"), tl)
    assert tl_updated.title == "TL Updated"

    # 4. Project Manager updating task details -> ALLOWED
    pm_updated = task_service.update_task(task_res.id, UpdateTaskRequest(title="PM Updated"), pm)
    assert pm_updated.title == "PM Updated"

    # 5. Company Owner updating task details -> ALLOWED
    owner_updated = task_service.update_task(task_res.id, UpdateTaskRequest(title="Owner Updated"), owner)
    assert owner_updated.title == "Owner Updated"

    # 6. Unassigned Developer (dev_unassigned) updating task status -> REJECTED (403 Forbidden)
    with pytest.raises(Forbidden):
        task_service.update_task_status(task_res.id, UpdateTaskStatusRequest(status="DONE"), dev_unassigned)

    # 7. Assigned Developer (dev_assignee) updating task status -> ALLOWED
    assignee_status_updated = task_service.update_task_status(task_res.id, UpdateTaskStatusRequest(status="DONE"), dev_assignee)
    assert assignee_status_updated.status == "DONE"


def test_cross_tenant_rejection_across_all_domain_endpoints(db_session: Session):
    """
    Test cross-tenant access rejection for company OWNER of Company B across all mutating endpoints.
    """
    from app.projects.service import ProjectService
    from app.projects.schemas import UpdateProjectRequest
    from app.sprints.service import SprintService
    from app.sprints.schemas import CreateSprintRequest, UpdateSprintRequest
    from app.tasks.service import TaskService
    from app.tasks.schemas import CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest
    from app.project_members.service import ProjectMemberService
    from app.project_members.schemas import AddProjectMemberRequest
    from app.common.exceptions import Forbidden

    company_a = create_company(db_session, name="Tenant Co A")
    company_b = create_company(db_session, name="Tenant Co B")

    owner_a = create_user(db_session, company_a, email="owner@tenanta.com", role=CompanyRole.OWNER)
    dev_a = create_user(db_session, company_a, email="dev@tenanta.com", role=None)
    owner_b = create_user(db_session, company_b, email="owner@tenantb.com", role=CompanyRole.OWNER)

    project_a = create_project(db_session, company_a, name="Tenant Project A")
    db_session.add(ProjectMember(project_id=project_a.id, user_id=dev_a.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    project_service = ProjectService(db_session)
    sprint_service = SprintService(db_session)
    task_service = TaskService(db_session)
    member_service = ProjectMemberService(db_session)

    sprint_a = sprint_service.create_sprint(project_a.id, CreateSprintRequest(name="Sprint A"), owner_a)
    task_a = task_service.create_task(project_a.id, CreateTaskRequest(title="Task A"), owner_a)

    # 1. Project update cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        project_service.update_project(project_a.id, UpdateProjectRequest(name="Hacked Project"), owner_b)

    # 2. Sprint creation cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        sprint_service.create_sprint(project_a.id, CreateSprintRequest(name="Hacked Sprint"), owner_b)

    # 3. Sprint update cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        sprint_service.update_sprint(sprint_a.id, UpdateSprintRequest(name="Hacked Sprint Name"), owner_b)

    # 4. Task creation cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        task_service.create_task(project_a.id, CreateTaskRequest(title="Hacked Task"), owner_b)

    # 5. Task update cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        task_service.update_task(task_a.id, UpdateTaskRequest(title="Hacked Task Title"), owner_b)

    # 6. Task status update cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        task_service.update_task_status(task_a.id, UpdateTaskStatusRequest(status="DONE"), owner_b)

    # 7. Member invitation cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        member_service.add_member_by_email(project_a.id, AddProjectMemberRequest(email="hack@tenantb.com", role=ProjectRole.DEVELOPER), owner_b)

    # 8. Member removal cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        member_service.remove_member(project_a.id, dev_a.id, owner_b)

    # 9. Task deletion cross-tenant -> REJECTED
    with pytest.raises(Forbidden):
        task_service.delete_task(task_a.id, owner_b)


def test_viewer_role_confirmed_read_only(db_session: Session):
    """
    Test that VIEWER role can read projects/sprints/tasks but is rejected from ALL mutating operations.
    """
    from app.projects.service import ProjectService
    from app.projects.schemas import UpdateProjectRequest
    from app.sprints.service import SprintService
    from app.sprints.schemas import CreateSprintRequest, UpdateSprintRequest
    from app.tasks.service import TaskService
    from app.tasks.schemas import CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest
    from app.project_members.service import ProjectMemberService
    from app.project_members.schemas import AddProjectMemberRequest
    from app.common.exceptions import Forbidden

    company = create_company(db_session, name="Viewer Inc")
    owner = create_user(db_session, company, email="owner@viewerinc.com", role=CompanyRole.OWNER)
    dev = create_user(db_session, company, email="dev@viewerinc.com", role=None)
    viewer = create_user(db_session, company, email="viewer@viewerinc.com", role=None)

    project = create_project(db_session, company, name="Viewer Project")
    db_session.add(ProjectMember(project_id=project.id, user_id=dev.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=project.id, user_id=viewer.id, role=ProjectRole.VIEWER))
    db_session.commit()

    project_service = ProjectService(db_session)
    sprint_service = SprintService(db_session)
    task_service = TaskService(db_session)
    member_service = ProjectMemberService(db_session)

    sprint = sprint_service.create_sprint(project.id, CreateSprintRequest(name="Read Only Sprint"), owner)
    task = task_service.create_task(project.id, CreateTaskRequest(title="Read Only Task"), owner)

    # READ Operations by Viewer -> SUCCEED
    proj_detail = project_service.get_project_detail(project.id, viewer)
    assert proj_detail.id == project.id

    sprints_list = sprint_service.list_sprints(project.id, viewer)
    assert len(sprints_list.sprints) >= 1

    tasks_list = task_service.list_tasks(project.id, viewer)
    assert len(tasks_list.tasks) >= 1

    # MUTATING Operations by Viewer -> ALL REJECTED (403 Forbidden)
    with pytest.raises(Forbidden):
        project_service.update_project(project.id, UpdateProjectRequest(name="Viewer Update"), viewer)

    with pytest.raises(Forbidden):
        sprint_service.create_sprint(project.id, CreateSprintRequest(name="Viewer Sprint"), viewer)

    with pytest.raises(Forbidden):
        sprint_service.update_sprint(sprint.id, UpdateSprintRequest(name="Viewer Sprint Update"), viewer)

    with pytest.raises(Forbidden):
        task_service.create_task(project.id, CreateTaskRequest(title="Viewer Task"), viewer)

    with pytest.raises(Forbidden):
        task_service.update_task(task.id, UpdateTaskRequest(title="Viewer Task Update"), viewer)

    with pytest.raises(Forbidden):
        task_service.update_task_status(task.id, UpdateTaskStatusRequest(status="DONE"), viewer)

    with pytest.raises(Forbidden):
        member_service.add_member_by_email(project.id, AddProjectMemberRequest(email="invited@viewerinc.com", role=ProjectRole.DEVELOPER), viewer)

    with pytest.raises(Forbidden):
        member_service.remove_member(project.id, dev.id, viewer)

    with pytest.raises(Forbidden):
        task_service.delete_task(task.id, viewer)




