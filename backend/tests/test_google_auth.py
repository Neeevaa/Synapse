"""
Integration tests for POST /auth/google — Google Sign-In.

All tests mock google.oauth2.id_token.verify_oauth2_token so we never
hit Google's servers. The mock returns a controlled id_info dict.
"""
from unittest.mock import patch, MagicMock
from sqlalchemy import select

from app.models.user import User
from app.models.company import Company
from app.models.project_member import ProjectMember
from app.models.pending_membership import PendingMembership

from tests.conftest import (
    create_company,
    create_user,
    create_project,
    create_pending_membership,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

GOOGLE_ENDPOINT = "/auth/google"
MOCK_TARGET = "google.oauth2.id_token.verify_oauth2_token"

FAKE_GOOGLE_SUB = "google-sub-112233"
FAKE_EMAIL = "alice@gmail.com"
FAKE_FIRST = "Alice"
FAKE_LAST = "Smith"


def _id_info(
    sub: str = FAKE_GOOGLE_SUB,
    email: str = FAKE_EMAIL,
    given_name: str = FAKE_FIRST,
    family_name: str = FAKE_LAST,
):
    """Build a fake Google id_info payload."""
    return {
        "sub": sub,
        "email": email,
        "given_name": given_name,
        "family_name": family_name,
        "name": f"{given_name} {family_name}",
        "email_verified": True,
    }


# ---------------------------------------------------------------------------
# Test 1 — Brand-new user via Google (no existing account at all)
# ---------------------------------------------------------------------------


@patch(MOCK_TARGET, return_value=_id_info())
def test_new_user_google_signup(mock_verify, client, db_session):
    """
    When no user with this email exists, Google sign-in should:
    - Create a new Company (user becomes OWNER)
    - Create a User with oauth_provider="google", oauth_id set, no password
    - Mark is_verified = True immediately
    - Return access + refresh tokens
    """
    response = client.post(GOOGLE_ENDPOINT, json={"id_token": "fake-token"})

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Verify User was created correctly
    user = db_session.execute(
        select(User).filter(User.email == FAKE_EMAIL)
    ).scalar_one()
    assert user.oauth_provider == "google"
    assert user.oauth_id == FAKE_GOOGLE_SUB
    assert user.password_hash is None
    assert user.is_verified is True
    assert user.first_name == FAKE_FIRST
    assert user.role.value == "OWNER"  # brand-new user owns their company

    # Verify a Company was created
    company = db_session.execute(
        select(Company).filter(Company.id == user.company_id)
    ).scalar_one()
    assert company is not None


# ---------------------------------------------------------------------------
# Test 2 — Existing Google user logs in again
# ---------------------------------------------------------------------------


@patch(MOCK_TARGET, return_value=_id_info())
def test_existing_google_user_login(mock_verify, client, db_session):
    """
    When a user with oauth_provider="google" and matching oauth_id exists,
    Google sign-in should just log them in without creating duplicates.
    """
    company = create_company(db_session, name="Existing Co")
    existing_user = create_user(
        db_session,
        company,
        email=FAKE_EMAIL,
        password_hash=None,
        oauth_provider="google",
        oauth_id=FAKE_GOOGLE_SUB,
    )

    response = client.post(GOOGLE_ENDPOINT, json={"id_token": "fake-token"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data

    # Ensure no duplicate user was created
    users = db_session.execute(
        select(User).filter(User.email == FAKE_EMAIL)
    ).scalars().all()
    assert len(users) == 1
    assert users[0].id == existing_user.id


# ---------------------------------------------------------------------------
# Test 3 — Link Google to existing password-based account
# ---------------------------------------------------------------------------


@patch(MOCK_TARGET, return_value=_id_info())
def test_link_google_to_password_account(mock_verify, client, db_session):
    """
    When a user with this email exists but was registered with a password
    (no oauth_id), Google sign-in should link the Google identity to the
    existing account rather than creating a duplicate.
    """
    company = create_company(db_session, name="Password Co")
    password_user = create_user(
        db_session,
        company,
        email=FAKE_EMAIL,
        password_hash="$2b$12$somefakehash",
        oauth_provider=None,
        oauth_id=None,
    )

    response = client.post(GOOGLE_ENDPOINT, json={"id_token": "fake-token"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data

    # Refresh the user from DB
    db_session.refresh(password_user)
    assert password_user.oauth_provider == "google"
    assert password_user.oauth_id == FAKE_GOOGLE_SUB
    assert password_user.is_verified is True
    # Original password hash should still be there
    assert password_user.password_hash == "$2b$12$somefakehash"

    # No duplicate user
    users = db_session.execute(
        select(User).filter(User.email == FAKE_EMAIL)
    ).scalars().all()
    assert len(users) == 1


# ---------------------------------------------------------------------------
# Test 4 — Pending invitation completed via Google sign-up
# ---------------------------------------------------------------------------


@patch(MOCK_TARGET, return_value=_id_info())
def test_pending_invitation_via_google(mock_verify, client, db_session):
    """
    When the email matches a PendingMembership (invited but not registered),
    Google sign-in should:
    - Create the user under the invited company (NOT create a new company)
    - Convert PendingMembership records to ProjectMember records
    - Delete the PendingMembership records
    """
    company = create_company(db_session, name="Invite Co")
    inviter = create_user(
        db_session,
        company,
        email="admin@inviteco.com",
        role="OWNER",
    )
    project = create_project(db_session, company, name="Cool Project")
    pending = create_pending_membership(
        db_session, project, inviter, email=FAKE_EMAIL
    )

    response = client.post(GOOGLE_ENDPOINT, json={"id_token": "fake-token"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data

    # User should belong to the inviting company, NOT a new one
    new_user = db_session.execute(
        select(User).filter(User.email == FAKE_EMAIL)
    ).scalar_one()
    assert new_user.company_id == company.id
    assert new_user.oauth_provider == "google"
    assert new_user.oauth_id == FAKE_GOOGLE_SUB
    assert new_user.password_hash is None

    # PendingMembership should have been deleted
    remaining = db_session.execute(
        select(PendingMembership).filter(PendingMembership.email == FAKE_EMAIL)
    ).scalars().all()
    assert len(remaining) == 0

    # ProjectMember should have been created
    members = db_session.execute(
        select(ProjectMember).filter(
            ProjectMember.user_id == new_user.id,
            ProjectMember.project_id == project.id,
        )
    ).scalars().all()
    assert len(members) == 1


# ---------------------------------------------------------------------------
# Test 5 — Invalid Google token returns 401
# ---------------------------------------------------------------------------


@patch(MOCK_TARGET, side_effect=ValueError("Token is not valid"))
def test_invalid_google_token(mock_verify, client, db_session):
    """
    When the Google ID token verification fails (e.g. bad signature,
    wrong audience), the endpoint should return 401.
    """
    response = client.post(GOOGLE_ENDPOINT, json={"id_token": "bad-token"})

    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert "Invalid Google ID token" in body["message"]


# ---------------------------------------------------------------------------
# Test 6 — Join flow with Google sign-up without invitation returns 400
# ---------------------------------------------------------------------------


@patch(MOCK_TARGET, return_value=_id_info())
def test_uninvited_google_join_flow(mock_verify, client, db_session):
    """
    When a user attempts Google sign-in via the /join page (is_join=True)
    without an invitation or existing account, the endpoint should return 400.
    """
    response = client.post(
        GOOGLE_ENDPOINT, json={"id_token": "fake-token", "is_join": True}
    )

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert "No invitation found for this email address" in body["message"]

