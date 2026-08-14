import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import CompanyRole, ProjectRole
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project, add_project_member


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_project_visibility_and_direct_access(client: TestClient, db_session: Session):
    # Setup company with 5 projects
    company = create_company(db_session, name="Visibility Co")
    owner = create_user(db_session, company, email="owner@vis.com", role=CompanyRole.OWNER)

    projects = []
    for i in range(1, 6):
        p = create_project(db_session, company, name=f"Project {i}")
        projects.append(p)

    # 1. Company Owner sees all 5 projects
    owner_headers = get_auth_headers(owner.id)
    res_owner = client.get("/projects", headers=owner_headers)
    assert res_owner.status_code == 200, res_owner.text
    owner_projects = res_owner.json()["data"]["projects"]
    assert len(owner_projects) == 5

    # Owner can access any project detail directly
    for p in projects:
        res_detail = client.get(f"/projects/{p.id}", headers=owner_headers)
        assert res_detail.status_code == 200, res_detail.text

    # 2. PM who is member of 2 out of 5 projects (projects[0] and projects[1])
    pm_user = create_user(db_session, company, email="pm@vis.com", role=None)
    add_project_member(db_session, projects[0], pm_user, ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, projects[1], pm_user, ProjectRole.PROJECT_MANAGER)

    pm_headers = get_auth_headers(pm_user.id)
    res_pm = client.get("/projects", headers=pm_headers)
    assert res_pm.status_code == 200, res_pm.text
    pm_projects = res_pm.json()["data"]["projects"]
    assert len(pm_projects) == 2
    pm_project_ids = {p["id"] for p in pm_projects}
    assert str(projects[0].id) in pm_project_ids
    assert str(projects[1].id) in pm_project_ids

    # PM direct detail access: 2 allowed projects succeed
    assert client.get(f"/projects/{projects[0].id}", headers=pm_headers).status_code == 200
    assert client.get(f"/projects/{projects[1].id}", headers=pm_headers).status_code == 200

    # PM direct detail access: 3 unassigned projects return 403 Forbidden
    for unassigned_project in projects[2:]:
        res_blocked = client.get(f"/projects/{unassigned_project.id}", headers=pm_headers)
        assert res_blocked.status_code == 403, f"Expected 403 for unassigned project {unassigned_project.id}, got {res_blocked.status_code}"

    # 3. Developer with 0 project memberships
    dev_user = create_user(db_session, company, email="dev@vis.com", role=None)
    dev_headers = get_auth_headers(dev_user.id)

    # List returns empty list []
    res_dev = client.get("/projects", headers=dev_headers)
    assert res_dev.status_code == 200, res_dev.text
    dev_projects = res_dev.json()["data"]["projects"]
    assert len(dev_projects) == 0

    # Direct access to all 5 projects returns 403 Forbidden
    for p in projects:
        res_dev_detail = client.get(f"/projects/{p.id}", headers=dev_headers)
        assert res_dev_detail.status_code == 403, f"Expected 403 for non-member dev, got {res_dev_detail.status_code}"

    # 4. Verify sub-resource endpoints (tasks, backlog, sprints, members) return 403 Forbidden for non-members
    unassigned_id = projects[2].id
    assert client.get(f"/projects/{unassigned_id}/tasks", headers=dev_headers).status_code == 403
    assert client.get(f"/projects/{unassigned_id}/backlog", headers=dev_headers).status_code == 403
    assert client.get(f"/projects/{unassigned_id}/sprints", headers=dev_headers).status_code == 403
    assert client.get(f"/projects/{unassigned_id}/members", headers=dev_headers).status_code == 403
