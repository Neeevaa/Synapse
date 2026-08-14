import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import ProjectRole
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project, add_project_member


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_create_and_update_sprint_capacity(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Capacity Co")
    pm = create_user(db_session, company, email="pm@cap.com", role=None)
    project = create_project(db_session, company, name="Cap Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # 1. Create sprint with capacity 40
    res_create = client.post(
        f"/projects/{project.id}/sprints",
        json={"name": "Sprint 1", "capacity": 40},
        headers=headers,
    )
    assert res_create.status_code == 201, res_create.text
    sprint_data = res_create.json()["data"]
    assert sprint_data["capacity"] == 40
    assert sprint_data["allocated_points"] == 0
    assert sprint_data["remaining_capacity"] == 40

    sprint_id = sprint_data["id"]

    # 2. Update sprint capacity to 50
    res_update = client.put(
        f"/sprints/{sprint_id}",
        json={"capacity": 50},
        headers=headers,
    )
    assert res_update.status_code == 200, res_update.text
    updated_data = res_update.json()["data"]
    assert updated_data["capacity"] == 50
    assert updated_data["remaining_capacity"] == 50


def test_sprint_capacity_and_remaining_calculation(client: TestClient, db_session: Session):
    company = create_company(db_session, name="OverCap Co")
    pm = create_user(db_session, company, email="pm@overcap.com", role=None)
    project = create_project(db_session, company, name="OverCap Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # Create sprint with capacity 30
    res_sprint = client.post(
        f"/projects/{project.id}/sprints",
        json={"name": "Sprint Over", "capacity": 30, "status": "ACTIVE"},
        headers=headers,
    )
    sprint_id = res_sprint.json()["data"]["id"]

    # Add task A (20 pts)
    res_task_a = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Task A", "sprint_id": sprint_id, "story_points": 20},
        headers=headers,
    )
    assert res_task_a.status_code == 201, res_task_a.text

    # Add task B (15 pts) -> total 35 pts (exceeds capacity of 30)
    res_task_b = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Task B", "sprint_id": sprint_id, "story_points": 15},
        headers=headers,
    )
    assert res_task_b.status_code == 201, res_task_b.text

    # Fetch active sprint details
    res_active = client.get(f"/projects/{project.id}/sprints/active", headers=headers)
    assert res_active.status_code == 200, res_active.text
    active_data = res_active.json()["data"]

    assert active_data["capacity"] == 30
    assert active_data["allocated_points"] == 35
    # Requirement 2 & 4: remaining_capacity is -5 (not clamped to 0)
    assert active_data["remaining_capacity"] == -5


def test_uncapped_sprint_capacity(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Uncapped Co")
    pm = create_user(db_session, company, email="pm@uncapped.com", role=None)
    project = create_project(db_session, company, name="Uncapped Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # Sprint with capacity = None
    res_sprint = client.post(
        f"/projects/{project.id}/sprints",
        json={"name": "Sprint Uncapped"},
        headers=headers,
    )
    sprint_id = res_sprint.json()["data"]["id"]

    client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Task 1", "sprint_id": sprint_id, "story_points": 8},
        headers=headers,
    )

    res_list = client.get(f"/projects/{project.id}/sprints", headers=headers)
    assert res_list.status_code == 200
    sprints = res_list.json()["data"]["sprints"]
    target = next(s for s in sprints if s["id"] == sprint_id)

    assert target["capacity"] is None
    assert target["allocated_points"] == 8
    assert target["remaining_capacity"] is None
