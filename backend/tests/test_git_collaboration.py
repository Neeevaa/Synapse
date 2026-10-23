import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.git_collaboration import ProjectGitRepository, TaskGitReference
from app.models.enums import CompanyRole, ProjectRole, GitReferenceType, TaskStatus, TaskPriority
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def git_test_setup(db_session: Session):
    company = create_company(db_session, name=f"GitCo-{uuid.uuid4().hex[:6]}")

    # 1. Company Owner / CTO
    owner = create_user(
        db_session,
        company,
        email=f"owner_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.OWNER,
    )

    # 2. Project Manager
    pm = create_user(
        db_session,
        company,
        email=f"pm_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )

    # 3. Developer
    dev = create_user(
        db_session,
        company,
        email=f"dev_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )

    # 4. Viewer (read-only)
    viewer = create_user(
        db_session,
        company,
        email=f"viewer_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.VIEWER,
    )

    # 5. Outside Company & User (for cross-tenant attack tests)
    other_company = create_company(db_session, name=f"OtherCo-{uuid.uuid4().hex[:6]}")
    other_user = create_user(
        db_session,
        other_company,
        email=f"intruder_{uuid.uuid4().hex[:6]}@other.com",
        role=CompanyRole.OWNER,
    )

    # Project 1
    project1 = create_project(db_session, company, name="Synapse Core")
    # Add PM
    db_session.add(ProjectMember(project_id=project1.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER))
    # Add Dev
    db_session.add(ProjectMember(project_id=project1.id, user_id=dev.id, role=ProjectRole.DEVELOPER))
    # Add Viewer
    db_session.add(ProjectMember(project_id=project1.id, user_id=viewer.id, role=ProjectRole.VIEWER))

    # Project 2 (same company, separate project)
    project2 = create_project(db_session, company, name="Synapse Analytics")

    # Tasks for Project 1
    task1 = Task(
        project_id=project1.id,
        title="Setup Auth Validation",
        status=TaskStatus.IN_PROGRESS,
        priority=TaskPriority.HIGH,
    )
    task2 = Task(
        project_id=project1.id,
        title="Build Sprint Board UI",
        status=TaskStatus.TODO,
        priority=TaskPriority.MEDIUM,
    )
    # Task for Project 2
    task_p2 = Task(
        project_id=project2.id,
        title="Analytics Pipeline Task",
        status=TaskStatus.TODO,
        priority=TaskPriority.LOW,
    )
    db_session.add_all([task1, task2, task_p2])
    db_session.commit()
    db_session.refresh(task1)
    db_session.refresh(task2)
    db_session.refresh(task_p2)

    return {
        "company": company,
        "owner": owner,
        "pm": pm,
        "dev": dev,
        "viewer": viewer,
        "other_user": other_user,
        "project1": project1,
        "project2": project2,
        "task1": task1,
        "task2": task2,
        "task_p2": task_p2,
    }


def test_repository_registration_and_retrieval(client: TestClient, git_test_setup):
    """1 & 2: A valid repository can be registered and retrieved."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]

    # Before registration, GET returns null repository
    res = client.get(
        f"/projects/{p1.id}/git/repository",
        headers=get_auth_headers(pm.id),
    )
    assert res.status_code == 200
    assert res.json()["data"] is None

    # Register repository
    payload = {
        "repository_url": "https://github.com/synapse-team/synapse-core",
        "repository_name": "synapse-team/synapse-core",
    }
    res = client.post(
        f"/projects/{p1.id}/git/repository",
        json=payload,
        headers=get_auth_headers(pm.id),
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["repository_url"] == "https://github.com/synapse-team/synapse-core"
    assert data["repository_name"] == "synapse-team/synapse-core"
    assert data["project_id"] == str(p1.id)

    # Retrieve again
    res = client.get(
        f"/projects/{p1.id}/git/repository",
        headers=get_auth_headers(pm.id),
    )
    assert res.status_code == 200
    assert res.json()["data"]["repository_url"] == "https://github.com/synapse-team/synapse-core"


def test_repository_update_and_deduplication(client: TestClient, git_test_setup):
    """3 & 4: Repository URL can be updated; duplicate primary repository is rejected (409)."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]

    # Register initial
    client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )

    # Attempt to register another primary repository -> 409 Conflict
    res_dup = client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/another-repo"},
        headers=get_auth_headers(pm.id),
    )
    assert res_dup.status_code == 409
    assert "already registered" in res_dup.json()["message"]

    # Update repository URL
    res_patch = client.patch(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-monorepo"},
        headers=get_auth_headers(pm.id),
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["data"]["repository_url"] == "https://github.com/synapse-team/synapse-monorepo"


def test_repository_removal_preserves_task_links(client: TestClient, git_test_setup):
    """5: Repository can be removed and task links are preserved."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]
    dev = git_test_setup["dev"]
    task1 = git_test_setup["task1"]

    # Register repo
    client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )

    # Add a commit link
    res_link = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "a1b2c3d4e5f67890",
            "commit_url": "https://github.com/synapse-team/synapse-core/commit/a1b2c3d4e5f67890",
            "description": "Auth middleware fix",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_link.status_code == 201

    # Remove repository
    res_del = client.delete(
        f"/projects/{p1.id}/git/repository",
        headers=get_auth_headers(pm.id),
    )
    assert res_del.status_code == 200

    # Verify repository is gone
    res_get = client.get(
        f"/projects/{p1.id}/git/repository",
        headers=get_auth_headers(pm.id),
    )
    assert res_get.json()["data"] is None

    # Verify task link remains intact
    res_refs = client.get(
        f"/projects/{p1.id}/git/references",
        headers=get_auth_headers(dev.id),
    )
    assert res_refs.status_code == 200
    assert len(res_refs.json()["data"]) == 1
    assert res_refs.json()["data"][0]["commit_hash"] == "a1b2c3d4e5f67890"


def test_commit_and_pull_request_linking(client: TestClient, git_test_setup):
    """6 & 7: Valid commit and PR references can be created and retrieved."""
    p1 = git_test_setup["project1"]
    dev = git_test_setup["dev"]
    task1 = git_test_setup["task1"]
    task2 = git_test_setup["task2"]

    # 1. Create Commit Reference
    res_commit = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "7b8c9d0e1f2a3456",
            "description": "Added JWT expiration check",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_commit.status_code == 201
    c_data = res_commit.json()["data"]
    assert c_data["task_id"] == str(task1.id)
    assert c_data["task_title"] == "Setup Auth Validation"
    assert c_data["reference_type"] == "COMMIT"
    assert c_data["commit_hash"] == "7b8c9d0e1f2a3456"

    # 2. Create Pull Request Reference
    res_pr = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task2.id),
            "reference_type": "PULL_REQUEST",
            "pull_request_url": "https://github.com/synapse-team/synapse-core/pull/128",
            "description": "Sprint board kanban column drag-and-drop",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_pr.status_code == 201
    pr_data = res_pr.json()["data"]
    assert pr_data["task_id"] == str(task2.id)
    assert pr_data["reference_type"] == "PULL_REQUEST"
    assert pr_data["pull_request_url"] == "https://github.com/synapse-team/synapse-core/pull/128"

    # 3. List all references
    res_list = client.get(
        f"/projects/{p1.id}/git/references",
        headers=get_auth_headers(dev.id),
    )
    assert res_list.status_code == 200
    refs = res_list.json()["data"]
    assert len(refs) == 2

    # 4. Filter by task_id
    res_filter = client.get(
        f"/projects/{p1.id}/git/references?task_id={task1.id}",
        headers=get_auth_headers(dev.id),
    )
    assert res_filter.status_code == 200
    assert len(res_filter.json()["data"]) == 1
    assert res_filter.json()["data"][0]["commit_hash"] == "7b8c9d0e1f2a3456"


def test_cross_project_task_linking_rejected(client: TestClient, git_test_setup):
    """8: A task from another project cannot be linked."""
    p1 = git_test_setup["project1"]
    dev = git_test_setup["dev"]
    task_p2 = git_test_setup["task_p2"]  # Belongs to project2

    res = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task_p2.id),
            "reference_type": "COMMIT",
            "commit_hash": "deadbeef1234567",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res.status_code == 400
    assert "Selected task does not belong to this project" in res.json()["message"]


def test_invalid_urls_and_hashes_rejected(client: TestClient, git_test_setup):
    """9, 10, 11: Invalid URLs and hashes are rejected."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]
    dev = git_test_setup["dev"]
    task1 = git_test_setup["task1"]

    # 9a. Non-GitHub domain in repository_url
    res_bad_domain = client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://gitlab.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )
    assert res_bad_domain.status_code == 422

    # 9b. Non-HTTPS in repository_url
    res_http = client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "http://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )
    assert res_http.status_code == 422

    # 10. Invalid commit hash (not hexadecimal, or too short)
    res_bad_hash = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "not-a-valid-hex-hash",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_bad_hash.status_code == 422

    res_short_hash = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "abc",  # less than 7 chars
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_short_hash.status_code == 422

    # 11. Pull request without PR URL
    res_no_pr_url = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "PULL_REQUEST",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_no_pr_url.status_code == 422

    # 11b. Pull request with non-PR URL (e.g. repo URL instead of /pull/42)
    res_invalid_pr_url = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "PULL_REQUEST",
            "pull_request_url": "https://github.com/synapse-team/synapse-core/issues/42",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_invalid_pr_url.status_code == 422


def test_authentication_and_authorization(client: TestClient, git_test_setup):
    """12, 13, 14: Unauthenticated, unauthorized, and cross-tenant access are blocked."""
    p1 = git_test_setup["project1"]
    viewer = git_test_setup["viewer"]
    other_user = git_test_setup["other_user"]
    task1 = git_test_setup["task1"]

    # 12. Unauthenticated request -> 401
    res_unauth = client.get(f"/projects/{p1.id}/git/repository")
    assert res_unauth.status_code == 401

    # 13a. Viewer trying to register repository -> 403 Forbidden
    res_viewer_repo = client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(viewer.id),
    )
    assert res_viewer_repo.status_code == 403

    # 13b. Viewer trying to create Git reference -> 403 Forbidden
    res_viewer_ref = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "deadbeef1234567",
        },
        headers=get_auth_headers(viewer.id),
    )
    assert res_viewer_ref.status_code == 403

    # 14. Cross-tenant user trying to read or modify project1 -> 403 Forbidden
    res_other_get = client.get(
        f"/projects/{p1.id}/git/repository",
        headers=get_auth_headers(other_user.id),
    )
    assert res_other_get.status_code == 403

    res_other_refs = client.get(
        f"/projects/{p1.id}/git/references",
        headers=get_auth_headers(other_user.id),
    )
    assert res_other_refs.status_code == 403


def test_duplicate_reference_prevention(client: TestClient, git_test_setup):
    """15: Duplicate references for same task and hash/PR are rejected (409)."""
    p1 = git_test_setup["project1"]
    dev = git_test_setup["dev"]
    task1 = git_test_setup["task1"]
    task2 = git_test_setup["task2"]

    # First commit link on task1
    res1 = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "1122334455667788",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res1.status_code == 201

    # Duplicate commit link on same task1 -> 409 Conflict
    res_dup = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "1122334455667788",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_dup.status_code == 409

    # Same commit link on task2 is ALLOWED (a single commit can legitimately touch multiple tasks)
    res_task2 = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task2.id),
            "reference_type": "COMMIT",
            "commit_hash": "1122334455667788",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_task2.status_code == 201


def test_reference_edit_and_deletion(client: TestClient, git_test_setup):
    """16: Deletion and editing persist correctly and enforce permissions."""
    p1 = git_test_setup["project1"]
    dev = git_test_setup["dev"]
    pm = git_test_setup["pm"]
    task1 = git_test_setup["task1"]

    # Dev creates link
    res_create = client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "abcdef1234567890",
            "description": "Initial description",
        },
        headers=get_auth_headers(dev.id),
    )
    assert res_create.status_code == 201
    ref_id = res_create.json()["data"]["id"]

    # Dev edits description
    res_patch = client.patch(
        f"/projects/{p1.id}/git/references/{ref_id}",
        json={"description": "Updated description with bug fix notes"},
        headers=get_auth_headers(dev.id),
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["data"]["description"] == "Updated description with bug fix notes"

    # PM deletes reference
    res_del = client.delete(
        f"/projects/{p1.id}/git/references/{ref_id}",
        headers=get_auth_headers(pm.id),
    )
    assert res_del.status_code == 200

    # Ensure deleted reference cannot be found
    res_list = client.get(
        f"/projects/{p1.id}/git/references",
        headers=get_auth_headers(dev.id),
    )
    assert len(res_list.json()["data"]) == 0
