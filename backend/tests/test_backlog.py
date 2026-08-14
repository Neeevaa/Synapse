import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project, create_sprint, add_project_member


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_new_backlog_task_appends_to_end(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Backlog Co")
    pm = create_user(db_session, company, email="pm@backlog.com")
    project = create_project(db_session, company, name="Backlog Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    # 1. Create first backlog task
    res1 = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "First Backlog Item", "sprint_id": None},
        headers=headers,
    )
    assert res1.status_code == 201, res1.text
    task1_data = res1.json()["data"]
    assert task1_data["position"] == 0

    # 2. Create second backlog task
    res2 = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Second Backlog Item", "sprint_id": None},
        headers=headers,
    )
    assert res2.status_code == 201, res2.text
    task2_data = res2.json()["data"]
    # User refinement #1: Should automatically receive position = max_position + 1 = 1
    assert task2_data["position"] == 1


test_task_returned_to_backlog_appends_to_end_data = None


def test_task_returned_to_backlog_appends_to_end(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Transition Co")
    pm = create_user(db_session, company, email="pm@transition.com")
    project = create_project(db_session, company, name="Transition Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    sprint = create_sprint(db_session, project, name="Sprint 1")
    headers = get_auth_headers(pm.id)

    # Backlog item 1
    res1 = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Item 1", "sprint_id": None},
        headers=headers,
    )
    # Backlog item 2
    res2 = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Item 2", "sprint_id": None},
        headers=headers,
    )

    # Task created in Sprint 1
    res_sprint = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Sprint Task", "sprint_id": str(sprint.id)},
        headers=headers,
    )
    sprint_task_id = res_sprint.json()["data"]["id"]

    # User refinement #2: Move sprint task back to backlog (clear_sprint=True)
    res_clear = client.put(
        f"/tasks/{sprint_task_id}",
        json={"clear_sprint": True},
        headers=headers,
    )
    assert res_clear.status_code == 200, res_clear.text
    cleared_data = res_clear.json()["data"]
    assert cleared_data["sprint_id"] is None
    # Position should be end of backlog: max_pos (1) + 1 = 2
    assert cleared_data["position"] == 2


def test_get_backlog_and_reorder(client: TestClient, db_session: Session):
    company = create_company(db_session, name="Reorder Co")
    pm = create_user(db_session, company, email="pm@reorder.com")
    project = create_project(db_session, company, name="Reorder Project")
    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)

    headers = get_auth_headers(pm.id)

    res_a = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Task A", "story_points": 3},
        headers=headers,
    )
    task_a_id = res_a.json()["data"]["id"]

    res_b = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Task B", "story_points": 5},
        headers=headers,
    )
    task_b_id = res_b.json()["data"]["id"]

    # Get backlog
    res_backlog = client.get(f"/projects/{project.id}/backlog", headers=headers)
    assert res_backlog.status_code == 200, res_backlog.text
    items = res_backlog.json()["data"]["tasks"]
    assert len(items) == 2
    assert items[0]["id"] == task_a_id
    assert items[1]["id"] == task_b_id

    # Reorder backlog: Put B first, then A
    res_reorder = client.post(
        f"/projects/{project.id}/backlog/reorder",
        json={"task_ids": [task_b_id, task_a_id]},
        headers=headers,
    )
    assert res_reorder.status_code == 200, res_reorder.text
    reordered = res_reorder.json()["data"]["tasks"]
    assert reordered[0]["id"] == task_b_id
    assert reordered[0]["position"] == 0
    assert reordered[1]["id"] == task_a_id
    assert reordered[1]["position"] == 1


def test_backlog_rbac_enforcement(client: TestClient, db_session: Session):
    company = create_company(db_session, name="RBAC Backlog Co")
    pm = create_user(db_session, company, email="pm@rbacb.com", role=None)
    dev = create_user(db_session, company, email="dev@rbacb.com", role=None)
    project = create_project(db_session, company, name="RBAC Project")

    add_project_member(db_session, project, pm, ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, project, dev, ProjectRole.DEVELOPER)

    pm_headers = get_auth_headers(pm.id)
    dev_headers = get_auth_headers(dev.id)

    # PM creates task A
    res_a = client.post(
        f"/projects/{project.id}/tasks",
        json={"title": "Backlog Item A"},
        headers=pm_headers,
    )
    task_id = res_a.json()["data"]["id"]

    # Developer CAN view backlog
    res_dev_get = client.get(f"/projects/{project.id}/backlog", headers=dev_headers)
    assert res_dev_get.status_code == 200, res_dev_get.text

    # Developer CANNOT reorder backlog
    res_dev_reorder = client.post(
        f"/projects/{project.id}/backlog/reorder",
        json={"task_ids": [task_id]},
        headers=dev_headers,
    )
    assert res_dev_reorder.status_code == 403, res_dev_reorder.text

    # Developer CANNOT update task fields (like story_points or sprint_id)
    res_dev_update = client.put(
        f"/tasks/{task_id}",
        json={"story_points": 8},
        headers=dev_headers,
    )
    assert res_dev_update.status_code == 403, res_dev_update.text
