import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.git_collaboration import ProjectGitRepository, TaskGitReference, ProjectGitConnection
from app.models.enums import CompanyRole, ProjectRole, GitReferenceType
from app.core.security import create_access_token
from app.core.config import settings
from app.git_collaboration import crypto
from tests.conftest import create_company, create_user, create_project
from tests.test_git_collaboration import get_auth_headers, git_test_setup


def test_fernet_crypto_roundtrip_and_errors():
    """Verify encryption, decryption, and error handling for bad keys/ciphertexts."""
    test_secret = "github_pat_11AEXAMPLESECRET_99999"

    # 1. Successful roundtrip
    ciphertext = crypto.encrypt_secret(test_secret)
    assert ciphertext != test_secret
    assert len(ciphertext) > 50

    decrypted = crypto.decrypt_secret(ciphertext)
    assert decrypted == test_secret

    # 2. Corrupted ciphertext fails
    with pytest.raises(Exception):
        crypto.decrypt_secret("not-a-valid-fernet-token")

    # 3. Missing or invalid encryption key configuration
    original_key = settings.CREDENTIAL_ENCRYPTION_KEY
    try:
        settings.CREDENTIAL_ENCRYPTION_KEY = ""
        with pytest.raises(Exception) as exc_info:
            crypto.get_fernet_cipher()
        assert "not configured" in str(exc_info.value)

        settings.CREDENTIAL_ENCRYPTION_KEY = "invalid-non-base64-key"
        with pytest.raises(Exception) as exc_info2:
            crypto.get_fernet_cipher()
        assert "Invalid CREDENTIAL_ENCRYPTION_KEY" in str(exc_info2.value)
    finally:
        settings.CREDENTIAL_ENCRYPTION_KEY = original_key


@patch("app.git_collaboration.github_client.validate_pat_and_get_user")
@patch("app.git_collaboration.github_client.verify_repo_access")
def test_connect_github_pat_success_and_encryption(
    mock_verify_repo,
    mock_validate_user,
    client: TestClient,
    db_session: Session,
    git_test_setup,
):
    """Verify PAT is validated, encrypted before DB storage, and NEVER returned in API responses."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]

    # Register repository first
    client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )

    mock_validate_user.return_value = {
        "username": "octocat",
        "user_id": "583231",
        "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
        "name": "The Octocat",
    }
    mock_verify_repo.return_value = {
        "full_name": "synapse-team/synapse-core",
        "private": True,
        "permissions": {"pull": True, "push": True},
    }

    raw_pat = "github_pat_11AEXAMPLESECRET_99999"

    # Connect PAT
    res = client.post(
        f"/projects/{p1.id}/git/connection",
        json={"personal_access_token": raw_pat},
        headers=get_auth_headers(pm.id),
    )
    assert res.status_code == 200
    res_data = res.json()["data"]

    # 1. Response validation
    assert res_data["connected"] is True
    conn_info = res_data["connection"]
    assert conn_info["github_username"] == "octocat"
    assert conn_info["github_avatar_url"] == "https://avatars.githubusercontent.com/u/583231?v=4"
    assert conn_info["is_valid"] is True
    assert conn_info["token_type"] == "fine-grained"

    # CRITICAL SECURITY CHECK: Raw PAT and encrypted PAT must NEVER appear in response
    response_text = res.text
    assert raw_pat not in response_text
    assert "encrypted_pat" not in response_text
    assert "personal_access_token" not in response_text

    # 2. Database validation
    db_conn = db_session.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == p1.id)
    ).scalar_one()

    # Database must NOT store raw PAT
    assert db_conn.encrypted_pat != raw_pat
    # Decrypting stored ciphertext yields original PAT
    assert crypto.decrypt_secret(db_conn.encrypted_pat) == raw_pat
    assert db_conn.github_username == "octocat"


@patch("app.git_collaboration.github_client.validate_pat_and_get_user")
def test_get_and_test_connection_status(
    mock_validate_user,
    client: TestClient,
    git_test_setup,
):
    """Verify connection retrieval and testing endpoints."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]

    mock_validate_user.return_value = {
        "username": "octocat",
        "user_id": "583231",
        "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
    }

    # Connect
    client.post(
        f"/projects/{p1.id}/git/connection",
        json={"personal_access_token": "ghp_classicexampletoken1234567890"},
        headers=get_auth_headers(pm.id),
    )

    # 1. GET connection status
    res_get = client.get(
        f"/projects/{p1.id}/git/connection",
        headers=get_auth_headers(pm.id),
    )
    assert res_get.status_code == 200
    assert res_get.json()["data"]["connected"] is True
    assert res_get.json()["data"]["connection"]["github_username"] == "octocat"
    assert "ghp_classicexampletoken1234567890" not in res_get.text

    # 2. POST test connection
    res_test = client.post(
        f"/projects/{p1.id}/git/connection/test",
        headers=get_auth_headers(pm.id),
    )
    assert res_test.status_code == 200
    assert res_test.json()["data"]["is_valid"] is True
    assert res_test.json()["data"]["github_username"] == "octocat"


def test_disconnect_github_preserves_task_links(client: TestClient, db_session: Session, git_test_setup):
    """Disconnecting GitHub PAT removes credential record but preserves repository and task links."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]
    dev = git_test_setup["dev"]
    task1 = git_test_setup["task1"]

    # Register repo & task link
    client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )
    client.post(
        f"/projects/{p1.id}/git/references",
        json={
            "task_id": str(task1.id),
            "reference_type": "COMMIT",
            "commit_hash": "c0ffee1234567890",
        },
        headers=get_auth_headers(dev.id),
    )

    with patch("app.git_collaboration.github_client.validate_pat_and_get_user") as mock_val, \
         patch("app.git_collaboration.github_client.verify_repo_access") as mock_repo:
        mock_val.return_value = {"username": "octocat", "user_id": "1", "avatar_url": None}
        mock_repo.return_value = {"full_name": "synapse-team/synapse-core"}

        client.post(
            f"/projects/{p1.id}/git/connection",
            json={"personal_access_token": "github_pat_disconnect_test_token"},
            headers=get_auth_headers(pm.id),
        )

    # Disconnect
    res_disc = client.delete(
        f"/projects/{p1.id}/git/connection",
        headers=get_auth_headers(pm.id),
    )
    assert res_disc.status_code == 200
    assert res_disc.json()["data"]["connected"] is False

    # Connection is gone from DB
    db_conn = db_session.execute(
        select(ProjectGitConnection).filter(ProjectGitConnection.project_id == p1.id)
    ).scalar_one_or_none()
    assert db_conn is None

    # Repo and task links are intact!
    res_repo = client.get(f"/projects/{p1.id}/git/repository", headers=get_auth_headers(pm.id))
    assert res_repo.json()["data"] is not None

    res_refs = client.get(f"/projects/{p1.id}/git/references", headers=get_auth_headers(dev.id))
    assert len(res_refs.json()["data"]) == 1
    assert res_refs.json()["data"][0]["commit_hash"] == "c0ffee1234567890"


@patch("app.git_collaboration.github_client.fetch_repo_commits")
@patch("app.git_collaboration.github_client.fetch_repo_pull_requests")
@patch("app.git_collaboration.github_client.validate_pat_and_get_user")
@patch("app.git_collaboration.github_client.verify_repo_access")
def test_live_commits_and_pulls_endpoints(
    mock_verify_repo,
    mock_validate_user,
    mock_fetch_prs,
    mock_fetch_commits,
    client: TestClient,
    git_test_setup,
):
    """Verify live commits and PRs endpoints fetch from GitHub REST client."""
    p1 = git_test_setup["project1"]
    pm = git_test_setup["pm"]
    dev = git_test_setup["dev"]

    client.post(
        f"/projects/{p1.id}/git/repository",
        json={"repository_url": "https://github.com/synapse-team/synapse-core"},
        headers=get_auth_headers(pm.id),
    )

    mock_validate_user.return_value = {"username": "octocat", "user_id": "1", "avatar_url": None}
    mock_verify_repo.return_value = {"full_name": "synapse-team/synapse-core"}

    client.post(
        f"/projects/{p1.id}/git/connection",
        json={"personal_access_token": "github_pat_fetch_test_token"},
        headers=get_auth_headers(pm.id),
    )

    mock_fetch_commits.return_value = [
        {
            "sha": "1234567890abcdef1234567890abcdef12345678",
            "short_sha": "12345678",
            "message": "feat: live GitHub integration",
            "author_name": "Developer One",
            "author_avatar": "https://avatars.githubusercontent.com/u/1",
            "date": "2026-10-24T00:00:00Z",
            "html_url": "https://github.com/synapse-team/synapse-core/commit/1234567890abcdef",
        }
    ]

    mock_fetch_prs.return_value = [
        {
            "number": 42,
            "title": "Add Encrypted PAT Support",
            "state": "open",
            "author_login": "octocat",
            "author_avatar": None,
            "created_at": "2026-10-24T00:00:00Z",
            "html_url": "https://github.com/synapse-team/synapse-core/pull/42",
        }
    ]

    # Fetch live commits
    res_commits = client.get(
        f"/projects/{p1.id}/git/github/commits",
        headers=get_auth_headers(dev.id),
    )
    assert res_commits.status_code == 200
    assert len(res_commits.json()["data"]) == 1
    assert res_commits.json()["data"][0]["short_sha"] == "12345678"

    # Fetch live PRs
    res_prs = client.get(
        f"/projects/{p1.id}/git/github/pulls",
        headers=get_auth_headers(dev.id),
    )
    assert res_prs.status_code == 200
    assert len(res_prs.json()["data"]) == 1
    assert res_prs.json()["data"][0]["number"] == 42


def test_unauthorized_user_cannot_connect_or_disconnect(client: TestClient, git_test_setup):
    """Viewers and outside company users are blocked from connecting or disconnecting GitHub."""
    p1 = git_test_setup["project1"]
    viewer = git_test_setup["viewer"]
    other_user = git_test_setup["other_user"]

    # Viewer cannot connect
    res_v_conn = client.post(
        f"/projects/{p1.id}/git/connection",
        json={"personal_access_token": "github_pat_unauthorized_token"},
        headers=get_auth_headers(viewer.id),
    )
    assert res_v_conn.status_code == 403

    # Viewer cannot disconnect
    res_v_disc = client.delete(
        f"/projects/{p1.id}/git/connection",
        headers=get_auth_headers(viewer.id),
    )
    assert res_v_disc.status_code == 403

    # Other tenant cannot connect
    res_o_conn = client.post(
        f"/projects/{p1.id}/git/connection",
        json={"personal_access_token": "github_pat_intruder_token"},
        headers=get_auth_headers(other_user.id),
    )
    assert res_o_conn.status_code == 403
