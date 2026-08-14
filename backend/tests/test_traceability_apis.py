"""
Integration tests for Traceability / Related Artifacts APIs:
1. Requirement traceability endpoint (linked meetings, tasks, action items, sprints)
2. Meeting traceability endpoint (linked action items, requirements, tasks)
3. Task traceability endpoint (linked requirement, sprint, meetings, action items)
4. Project-wide traceability graph matrix
5. Cross-tenant isolation & unauthorized project access rejection
"""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.models.task import Task
from app.models.sprint import Sprint
from app.models.meeting import Meeting, MeetingActionItem
from app.models.enums import CompanyRole, ProjectRole, SprintStatus
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_traceability_endpoints_flow(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Traceability Co")
    user = create_user(db_session, company, email="lead_trace@co.com", role=None)
    proj = create_project(db_session, company, name="Traceability Project")

    pm_mem = ProjectMember(project_id=proj.id, user_id=user.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    headers = get_auth_headers(user.id)

    # 1. Create Sprint
    sprint = Sprint(project_id=proj.id, name="Sprint 1", status=SprintStatus.ACTIVE)
    db_session.add(sprint)
    db_session.commit()

    # 2. Create Requirement & Task
    req = Requirement(
        project_id=proj.id,
        company_id=company.id,
        requirement_key="REQ-200",
        title="Traceability Spec",
        description="Explicit artifact linkage",
        created_by=user.id,
    )
    task = Task(
        project_id=proj.id,
        sprint_id=sprint.id,
        title="Implement Traceability API",
        description="FastAPI endpoint for graph",
        created_by=user.id,
    )
    db_session.add_all([req, task])
    db_session.commit()

    # 3. Create Meeting & Action Item linking Requirement and Task
    meeting = Meeting(
        project_id=proj.id,
        company_id=company.id,
        title="Traceability Design Meeting",
        organizer_id=user.id,
        scheduled_at=datetime.now(timezone.utc),
    )
    db_session.add(meeting)
    db_session.commit()

    action_item = MeetingActionItem(
        meeting_id=meeting.id,
        title="Verify Graph Query",
        requirement_id=req.id,
        task_id=task.id,
    )
    db_session.add(action_item)
    db_session.commit()

    # TEST A: Requirement Traceability API
    res_req = client.get(f"/projects/{proj.id}/traceability/requirements/{req.id}", headers=headers)
    assert res_req.status_code == 200, res_req.text
    data_req = res_req.json()["data"]
    assert data_req["requirement"]["requirement_key"] == "REQ-200"
    assert len(data_req["linked_tasks"]) == 1
    assert data_req["linked_tasks"][0]["id"] == str(task.id)
    assert len(data_req["linked_meetings"]) == 1
    assert data_req["linked_meetings"][0]["id"] == str(meeting.id)
    assert len(data_req["linked_sprints"]) == 1
    assert data_req["linked_sprints"][0]["id"] == str(sprint.id)

    # TEST B: Meeting Traceability API
    res_m = client.get(f"/projects/{proj.id}/traceability/meetings/{meeting.id}", headers=headers)
    assert res_m.status_code == 200, res_m.text
    data_m = res_m.json()["data"]
    assert data_m["meeting"]["id"] == str(meeting.id)
    assert len(data_m["linked_requirements"]) == 1
    assert data_m["linked_requirements"][0]["id"] == str(req.id)
    assert len(data_m["linked_tasks"]) == 1
    assert data_m["linked_tasks"][0]["id"] == str(task.id)

    # TEST C: Task Traceability API
    res_t = client.get(f"/projects/{proj.id}/traceability/tasks/{task.id}", headers=headers)
    assert res_t.status_code == 200, res_t.text
    data_t = res_t.json()["data"]
    assert data_t["task"]["id"] == str(task.id)
    assert data_t["linked_requirement"]["id"] == str(req.id)
    assert data_t["linked_sprint"]["id"] == str(sprint.id)
    assert len(data_t["linked_meetings"]) == 1

    # TEST D: Project Traceability Graph Matrix API
    res_g = client.get(f"/projects/{proj.id}/traceability/graph", headers=headers)
    assert res_g.status_code == 200, res_g.text
    data_g = res_g.json()["data"]
    assert data_g["total_requirements"] == 1
    assert data_g["total_meetings"] == 1
    assert data_g["total_tasks"] == 1
    assert len(data_g["nodes"]) == 1
    assert data_g["nodes"][0]["requirement_key"] == "REQ-200"
    assert data_g["nodes"][0]["tasks_count"] == 1


def test_traceability_cross_tenant_isolation(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company Alpha Trace")
    co_b = create_company(db_session, name="Company Beta Trace")

    user_a = create_user(db_session, co_a, email="user_a@alpha.com", role=CompanyRole.ADMIN)
    user_b = create_user(db_session, co_b, email="user_b@beta.com", role=CompanyRole.ADMIN)

    proj_a = create_project(db_session, co_a, name="Project Alpha Trace")
    proj_b = create_project(db_session, co_b, name="Project Beta Trace")

    db_session.add_all([
        ProjectMember(project_id=proj_a.id, user_id=user_a.id, role=ProjectRole.PROJECT_MANAGER),
        ProjectMember(project_id=proj_b.id, user_id=user_b.id, role=ProjectRole.PROJECT_MANAGER),
    ])
    db_session.commit()

    headers_b = get_auth_headers(user_b.id)

    # User B attempting to access Project A's traceability graph -> 403 Forbidden
    res_cross = client.get(f"/projects/{proj_a.id}/traceability/graph", headers=headers_b)
    assert res_cross.status_code == 403
