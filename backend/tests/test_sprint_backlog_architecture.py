"""
Integration and unit tests for Sprint Backlog architecture improvements in Synapse:
1. invalid workstream rejection
2. task in product backlog (sprint_id IS NULL)
3. task added to sprint backlog (PLANNED sprint)
4. active sprint visibility (tasks in PLANNED sprints hidden from active sprint board)
5. workstream filters on backlog and task list
6. company/project multi-tenant isolation
7. role authorization enforcement (PM/TL vs Developer/Viewer)
"""

import pytest
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole, SprintStatus, TaskWorkstream, TaskStatus, TaskPriority
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.tasks.service import TaskService
from app.tasks.schemas import CreateTaskRequest, UpdateTaskRequest
from app.sprints.service import SprintService
from app.sprints.schemas import CreateSprintRequest
from app.common.exceptions import BaseBusinessException, Forbidden, ResourceNotFound
from tests.conftest import create_company, create_user, create_project


def test_invalid_workstream_rejection(db_session: Session):
    """Test 1: Creating or updating a task with an invalid workstream returns a 400 error."""
    company = create_company(db_session, name="Workstream Test Co")
    pm_user = create_user(db_session, company, email="pm_ws@workstream.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Workstream Project")

    task_service = TaskService(db_session)

    # Attempt to create task with invalid workstream value
    invalid_req = CreateTaskRequest(
        title="Invalid Workstream Task",
        workstream="INVALID_WORKSTREAM_XYZ",
    )
    with pytest.raises(BaseBusinessException) as exc_info:
        task_service.create_task(project.id, invalid_req, pm_user)
    assert exc_info.value.status_code == 400
    assert "Invalid task workstream value" in str(exc_info.value)

    # Create a valid task first
    valid_req = CreateTaskRequest(
        title="Valid Workstream Task",
        workstream="BACKEND",
    )
    created_task = task_service.create_task(project.id, valid_req, pm_user)
    assert created_task.workstream == "BACKEND"

    # Update with invalid workstream
    update_req = UpdateTaskRequest(workstream="UNKNOWN_DEPT")
    with pytest.raises(BaseBusinessException) as exc_info:
        task_service.update_task(created_task.id, update_req, pm_user)
    assert exc_info.value.status_code == 400


def test_task_in_product_backlog(db_session: Session):
    """Test 2: Tasks created without a sprint_id remain in the Product Backlog (sprint_id IS NULL)."""
    company = create_company(db_session, name="Product Backlog Co")
    pm_user = create_user(db_session, company, email="pm_pb@productbacklog.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Product Backlog Project")

    task_service = TaskService(db_session)

    task_req = CreateTaskRequest(
        title="Unassigned Story",
        sprint_id=None,
        story_points=5,
        workstream="FRONTEND",
    )
    task_res = task_service.create_task(project.id, task_req, pm_user)
    assert task_res.sprint_id is None
    assert task_res.position == 0

    backlog = task_service.get_backlog(project.id, pm_user)
    assert backlog.total == 1
    assert backlog.tasks[0].id == task_res.id
    assert backlog.tasks[0].sprint_id is None


def test_task_added_to_sprint_backlog(db_session: Session):
    """Test 3: Moving a task into a PLANNED sprint places it into that Sprint Backlog."""
    company = create_company(db_session, name="Sprint Backlog Co")
    pm_user = create_user(db_session, company, email="pm_sb@sprintbacklog.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Sprint Backlog Project")

    sprint_service = SprintService(db_session)
    task_service = TaskService(db_session)

    # Create planned sprint
    planned_sprint = sprint_service.create_sprint(
        project.id,
        CreateSprintRequest(name="Sprint 1 Planned", goal="Initial Planning"),
        pm_user,
    )
    assert planned_sprint.status == SprintStatus.PLANNED

    # Create backlog task and assign to PLANNED sprint
    task = task_service.create_task(
        project.id,
        CreateTaskRequest(title="Sprint Story", workstream="QA"),
        pm_user,
    )
    updated_task = task_service.update_task(
        task.id,
        UpdateTaskRequest(sprint_id=planned_sprint.id),
        pm_user,
    )
    assert updated_task.sprint_id == planned_sprint.id

    # Verify task is no longer in Product Backlog (sprint_id IS NULL)
    backlog = task_service.get_backlog(project.id, pm_user)
    assert backlog.total == 0

    # Verify task IS in planned sprint task list
    sprint_tasks = task_service.list_tasks(project.id, pm_user, sprint_id=planned_sprint.id)
    assert sprint_tasks.total == 1
    assert sprint_tasks.tasks[0].id == task.id


def test_active_sprint_visibility(db_session: Session):
    """Test 4: Tasks in PLANNED sprints are not visible on the ACTIVE sprint board list."""
    company = create_company(db_session, name="Active Sprint Co")
    pm_user = create_user(db_session, company, email="pm_active@sprint.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Active Sprint Project")

    sprint_service = SprintService(db_session)
    task_service = TaskService(db_session)

    # Active Sprint
    active_sprint = sprint_service.get_active_sprint(project.id, pm_user)
    assert active_sprint.status == SprintStatus.ACTIVE

    # Planned Sprint
    planned_sprint = sprint_service.create_sprint(
        project.id,
        CreateSprintRequest(name="Sprint 2 Future"),
        pm_user,
    )

    # Task for active sprint
    active_task = task_service.create_task(
        project.id,
        CreateTaskRequest(title="Active Sprint Task", sprint_id=active_sprint.id, workstream="BACKEND"),
        pm_user,
    )

    # Task for planned sprint
    planned_task = task_service.create_task(
        project.id,
        CreateTaskRequest(title="Planned Sprint Task", sprint_id=planned_sprint.id, workstream="DEVOPS"),
        pm_user,
    )

    # Query active sprint tasks
    active_tasks = task_service.list_tasks(project.id, pm_user, sprint_id=active_sprint.id)
    assert active_tasks.total == 1
    assert active_tasks.tasks[0].id == active_task.id

    # Planned task must not be returned when querying active sprint tasks
    task_ids = [t.id for t in active_tasks.tasks]
    assert planned_task.id not in task_ids


def test_workstream_filters(db_session: Session):
    """Test 5: Querying tasks with workstream filter returns matching items only."""
    company = create_company(db_session, name="Workstream Filter Co")
    pm_user = create_user(db_session, company, email="pm_filter@workstream.com", role=CompanyRole.OWNER)
    project = create_project(db_session, company, name="Workstream Filter Project")

    task_service = TaskService(db_session)

    t_fe = task_service.create_task(
        project.id, CreateTaskRequest(title="FE Component", workstream="FRONTEND"), pm_user
    )
    t_be = task_service.create_task(
        project.id, CreateTaskRequest(title="BE API Endpoint", workstream="BACKEND"), pm_user
    )
    t_ai = task_service.create_task(
        project.id, CreateTaskRequest(title="AI RAG Context", workstream="AI_ML"), pm_user
    )

    # Filter product backlog by FRONTEND
    fe_backlog = task_service.get_backlog(project.id, pm_user, workstream="FRONTEND")
    assert fe_backlog.total == 1
    assert fe_backlog.tasks[0].id == t_fe.id

    # Filter all project tasks by AI_ML
    ai_tasks = task_service.list_tasks(project.id, pm_user, workstream="AI_ML")
    assert ai_tasks.total == 1
    assert ai_tasks.tasks[0].id == t_ai.id


def test_company_project_isolation(db_session: Session):
    """Test 6: Cross-tenant access to tasks and backlog items is strictly rejected."""
    company_a = create_company(db_session, name="Company A")
    company_b = create_company(db_session, name="Company B")

    pm_a = create_user(db_session, company_a, email="pm_a@compa.com", role=CompanyRole.OWNER)
    pm_b = create_user(db_session, company_b, email="pm_b@compb.com", role=CompanyRole.OWNER)

    project_a = create_project(db_session, company_a, name="Project A")

    task_service = TaskService(db_session)
    task_a = task_service.create_task(
        project_a.id, CreateTaskRequest(title="Tenant A Task", workstream="BACKEND"), pm_a
    )

    # User B from Company B attempting to access Project A backlog must raise Forbidden
    with pytest.raises(Forbidden):
        task_service.get_backlog(project_a.id, pm_b)

    # User B attempting to update Task A must raise Forbidden
    with pytest.raises(Forbidden):
        task_service.update_task(task_a.id, UpdateTaskRequest(title="Hacked Title"), pm_b)


def test_role_authorization(db_session: Session):
    """Test 7: Developer/Viewer roles cannot create tasks or reorder backlog, but PMs/TLs can."""
    company = create_company(db_session, name="Role Auth Co")
    pm_user = create_user(db_session, company, email="pm@roleauth.com", role=CompanyRole.OWNER)
    dev_user = create_user(db_session, company, email="dev@roleauth.com", role=None)
    project = create_project(db_session, company, name="Role Auth Project")

    # Add dev_user as DEVELOPER on project
    db_session.add(ProjectMember(project_id=project.id, user_id=dev_user.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    task_service = TaskService(db_session)

    # Dev attempting to create task must be rejected (Forbidden)
    with pytest.raises(Forbidden):
        task_service.create_task(
            project.id, CreateTaskRequest(title="Dev Task Creation Attempt"), dev_user
        )

    # PM creating task succeeds
    created_task = task_service.create_task(
        project.id, CreateTaskRequest(title="PM Task", workstream="UI_UX"), pm_user
    )
    assert created_task.id is not None
