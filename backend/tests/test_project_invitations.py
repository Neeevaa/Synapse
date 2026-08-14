import hashlib
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.invitation import Invitation
from app.models.enums import CompanyRole, ProjectRole, Specialization, InvitationStatus, SubscriptionPlan
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_create_valid_invitation(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm@acme.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Project Alpha")
    
    # Add pm as Project Manager
    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    payload = {
        "email": "invitee@acme.com",
        "project_role": "DEVELOPER",
        "specialization": "BACKEND",
        "personal_message": "Welcome to Alpha team!",
    }

    res = client.post(f"/projects/{proj.id}/members/invite", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()["data"]

    assert data["email"] == "invitee@acme.com"
    assert data["status"] == "PENDING"
    assert "join?token=" in data["join_url"]
    raw_token = data["join_url"].split("join?token=")[1]

    # Verify raw token is NOT stored in PostgreSQL DB, only SHA-256 token_hash is stored
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    db_inv = db_session.execute(select(Invitation).filter(Invitation.token_hash == token_hash)).scalar_one()
    assert db_inv.token_hash == token_hash
    assert raw_token not in db_inv.token_hash


def test_unauthorized_inviter_rejected(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    dev = create_user(db_session, co, email="dev@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Beta")

    # dev is only a DEVELOPER on project
    dev_member = ProjectMember(project_id=proj.id, user_id=dev.id, role=ProjectRole.DEVELOPER)
    db_session.add(dev_member)
    db_session.commit()

    headers = get_auth_headers(dev.id)
    payload = {"email": "someone@acme.com", "project_role": "DEVELOPER"}

    res = client.post(f"/projects/{proj.id}/members/invite", json=payload, headers=headers)
    assert res.status_code == 403


def test_validate_and_accept_invitation_existing_user(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm2@acme.com", role=CompanyRole.ADMIN)
    target = create_user(db_session, co, email="target@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Gamma")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    # Invite target user
    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "target@acme.com", "project_role": "TEAM_LEAD"},
        headers=headers_pm,
    )
    assert res_inv.status_code == 201
    raw_token = res_inv.json()["data"]["join_url"].split("join?token=")[1]

    # Validate invitation publicly
    res_val = client.get(f"/projects/invitations/validate?token={raw_token}")
    assert res_val.status_code == 200
    val_data = res_val.json()["data"]
    assert val_data["is_valid"] is True
    assert val_data["email"] == "target@acme.com"

    # Accept invitation as target user
    headers_target = get_auth_headers(target.id)
    res_accept = client.post(
        "/projects/invitations/accept",
        json={"token": raw_token},
        headers=headers_target,
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["data"]["role"] == "TEAM_LEAD"

    # Verify ProjectMember record in DB
    mem = db_session.execute(
        select(ProjectMember).filter(ProjectMember.project_id == proj.id, ProjectMember.user_id == target.id)
    ).scalar_one_or_none()
    assert mem is not None
    assert mem.role == ProjectRole.TEAM_LEAD


def test_expired_invitation_rejection(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm3@acme.com", role=CompanyRole.ADMIN)
    target = create_user(db_session, co, email="target_expired@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Delta")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "target_expired@acme.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    raw_token = res_inv.json()["data"]["join_url"].split("join?token=")[1]

    # Manually expire the invitation in DB
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    db_inv = db_session.execute(select(Invitation).filter(Invitation.token_hash == token_hash)).scalar_one()
    db_inv.expires_at = datetime.utcnow() - timedelta(days=1)
    db_session.commit()

    # Acceptance fails due to expiry
    headers_target = get_auth_headers(target.id)
    res_accept = client.post(
        "/projects/invitations/accept",
        json={"token": raw_token},
        headers=headers_target,
    )
    assert res_accept.status_code == 400
    assert "expired" in res_accept.json()["message"].lower()


def test_revoked_invitation_rejection(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm4@acme.com", role=CompanyRole.ADMIN)
    target = create_user(db_session, co, email="target_revoked@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Epsilon")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "target_revoked@acme.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    inv_id = res_inv.json()["data"]["id"]
    raw_token = res_inv.json()["data"]["join_url"].split("join?token=")[1]

    # Revoke invitation
    res_revoke = client.delete(f"/projects/{proj.id}/invitations/{inv_id}", headers=headers_pm)
    assert res_revoke.status_code == 200

    # Acceptance fails due to revocation
    headers_target = get_auth_headers(target.id)
    res_accept = client.post(
        "/projects/invitations/accept",
        json={"token": raw_token},
        headers=headers_target,
    )
    assert res_accept.status_code == 400
    assert "revoked" in res_accept.json()["message"].lower()


def test_reused_invitation_rejection(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm5@acme.com", role=CompanyRole.ADMIN)
    target = create_user(db_session, co, email="target_reused@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Zeta")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "target_reused@acme.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    raw_token = res_inv.json()["data"]["join_url"].split("join?token=")[1]

    headers_target = get_auth_headers(target.id)
    res_accept1 = client.post("/projects/invitations/accept", json={"token": raw_token}, headers=headers_target)
    assert res_accept1.status_code == 200

    # Second acceptance attempt fails
    res_accept2 = client.post("/projects/invitations/accept", json={"token": raw_token}, headers=headers_target)
    assert res_accept2.status_code == 400
    assert "already been accepted" in res_accept2.json()["message"].lower()


def test_wrong_email_acceptance_rejection(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm6@acme.com", role=CompanyRole.ADMIN)
    wrong_user = create_user(db_session, co, email="wrong@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Eta")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "intended@acme.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    raw_token = res_inv.json()["data"]["join_url"].split("join?token=")[1]

    # Wrong user tries to accept
    headers_wrong = get_auth_headers(wrong_user.id)
    res_accept = client.post("/projects/invitations/accept", json={"token": raw_token}, headers=headers_wrong)
    assert res_accept.status_code == 400
    assert "does not match" in res_accept.json()["message"].lower()


def test_cross_company_invitation_rejection(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company A")
    co_b = create_company(db_session, name="Company B")
    pm_a = create_user(db_session, co_a, email="pma@coma.com", role=CompanyRole.ADMIN)
    user_b = create_user(db_session, co_b, email="userb@comb.com", role=None)
    proj_a = create_project(db_session, co_a, name="Project A")

    pm_member = ProjectMember(project_id=proj_a.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers_pm = get_auth_headers(pm_a.id)

    # 1. Direct invitation creation for an existing user in a different company is rejected with 400
    res_inv = client.post(
        f"/projects/{proj_a.id}/members/invite",
        json={"email": "userb@comb.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    assert res_inv.status_code == 400
    assert "different company" in res_inv.json()["message"].lower()

    # 2. Invitation created for a non-existing email cannot be accepted by user_b from Company B
    res_inv_unregistered = client.post(
        f"/projects/{proj_a.id}/members/invite",
        json={"email": "unregistered@coma.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    assert res_inv_unregistered.status_code == 201
    raw_token = res_inv_unregistered.json()["data"]["join_url"].split("join?token=")[1]

    headers_b = get_auth_headers(user_b.id)
    res_accept = client.post("/projects/invitations/accept", json={"token": raw_token}, headers=headers_b)
    assert res_accept.status_code == 400


def test_new_user_registration_with_invitation_token(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm7@acme.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Project Theta")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member)
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "newuser@acme.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    raw_token = res_inv.json()["data"]["join_url"].split("join?token=")[1]

    # New user registers via /auth/register/member supplying invitation_token
    reg_payload = {
        "first_name": "New",
        "last_name": "Developer",
        "email": "newuser@acme.com",
        "password": "Password123!",
        "invitation_token": raw_token,
    }
    res_reg = client.post("/auth/register/member", json=reg_payload)
    assert res_reg.status_code == 201

    # Verify user created and joined to project
    new_u = db_session.execute(select(User).filter(User.email == "newuser@acme.com")).scalar_one()
    mem = db_session.execute(select(ProjectMember).filter(ProjectMember.user_id == new_u.id)).scalar_one_or_none()
    assert mem is not None
    assert mem.project_id == proj.id


def test_duplicate_membership_prevention(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Acme Corp")
    pm = create_user(db_session, co, email="pm8@acme.com", role=CompanyRole.ADMIN)
    existing_mem_user = create_user(db_session, co, email="existingmem@acme.com", role=None)
    proj = create_project(db_session, co, name="Project Iota")

    pm_member = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    existing_project_member = ProjectMember(project_id=proj.id, user_id=existing_mem_user.id, role=ProjectRole.DEVELOPER)
    db_session.add_all([pm_member, existing_project_member])
    db_session.commit()

    headers_pm = get_auth_headers(pm.id)
    res_inv = client.post(
        f"/projects/{proj.id}/members/invite",
        json={"email": "existingmem@acme.com", "project_role": "DEVELOPER"},
        headers=headers_pm,
    )
    assert res_inv.status_code == 400
    assert "already a member" in res_inv.json()["message"].lower()


def test_revoke_invitation_extended_cases(client: TestClient, db_session: Session):
    import uuid
    co_a = create_company(db_session, name="Company A Revoke Test")
    co_a.subscription_plan = SubscriptionPlan.ENTERPRISE
    co_b = create_company(db_session, name="Company B Revoke Test")
    co_b.subscription_plan = SubscriptionPlan.ENTERPRISE
    db_session.commit()

    pm_a = create_user(db_session, co_a, email="pma_revoke@coma.com", role=None)
    dev_a = create_user(db_session, co_a, email="deva_revoke@coma.com", role=None)
    pm_b = create_user(db_session, co_b, email="pmb_revoke@comb.com", role=None)
    target_u = create_user(db_session, co_a, email="target_acc@coma.com", role=None)

    proj_a = create_project(db_session, co_a, name="Project A Revoke")
    proj_a2 = create_project(db_session, co_a, name="Project A2 Revoke")

    pm_member = ProjectMember(project_id=proj_a.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    dev_member = ProjectMember(project_id=proj_a.id, user_id=dev_a.id, role=ProjectRole.DEVELOPER)
    db_session.add_all([pm_member, dev_member])
    db_session.commit()

    headers_pm_a = get_auth_headers(pm_a.id)
    headers_dev_a = get_auth_headers(dev_a.id)
    headers_pm_b = get_auth_headers(pm_b.id)

    # 1. Create invitation
    res_inv = client.post(
        f"/projects/{proj_a.id}/members/invite",
        json={"email": "pending_user@coma.com", "project_role": "DEVELOPER"},
        headers=headers_pm_a,
    )
    assert res_inv.status_code == 201
    inv_id = res_inv.json()["data"]["id"]

    # 2. Authorized user lists members and sees pending invitation with matching canonical ID
    res_list = client.get(f"/projects/{proj_a.id}/members", headers=headers_pm_a)
    assert res_list.status_code == 200
    pending_items = [m for m in res_list.json()["data"]["members"] if m["is_pending"]]
    assert len(pending_items) == 1
    assert pending_items[0]["id"] == inv_id

    # 3. Nonexistent invitation ID returns 404
    fake_id = str(uuid.uuid4())
    res_404 = client.delete(f"/projects/{proj_a.id}/invitations/{fake_id}", headers=headers_pm_a)
    assert res_404.status_code == 404

    # 4. Unauthorized role (DEVELOPER) receives 403
    res_403 = client.delete(f"/projects/{proj_a.id}/invitations/{inv_id}", headers=headers_dev_a)
    assert res_403.status_code == 403

    pm_member_a2 = ProjectMember(project_id=proj_a2.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_member_a2)
    db_session.commit()

    # 5. Wrong project ID returns 404 (when user has PM role on wrong project)
    res_wrong_proj = client.delete(f"/projects/{proj_a2.id}/invitations/{inv_id}", headers=headers_pm_a)
    assert res_wrong_proj.status_code == 404

    # 6. Revoking with valid PM user sets status REVOKED and populates revoked_at
    res_revoke = client.delete(f"/projects/{proj_a.id}/invitations/{inv_id}", headers=headers_pm_a)
    assert res_revoke.status_code == 200
    assert res_revoke.json()["message"] == "Invitation revoked successfully."

    db_inv = db_session.execute(select(Invitation).filter(Invitation.id == uuid.UUID(inv_id))).scalar_one()
    assert db_inv.status == InvitationStatus.REVOKED
    assert db_inv.revoked_at is not None

    # 7. Revoking an already-revoked invitation returns 409 conflict
    res_already_rev = client.delete(f"/projects/{proj_a.id}/invitations/{inv_id}", headers=headers_pm_a)
    assert res_already_rev.status_code == 409

    # 8. Revoking an accepted invitation returns 409 conflict
    res_acc_inv = client.post(
        f"/projects/{proj_a.id}/members/invite",
        json={"email": "target_acc@coma.com", "project_role": "DEVELOPER"},
        headers=headers_pm_a,
    )
    raw_token_acc = res_acc_inv.json()["data"]["join_url"].split("join?token=")[1]
    acc_inv_id = res_acc_inv.json()["data"]["id"]

    headers_target = get_auth_headers(target_u.id)
    res_accept = client.post("/projects/invitations/accept", json={"token": raw_token_acc}, headers=headers_target)
    assert res_accept.status_code == 200

    res_revoke_accepted = client.delete(f"/projects/{proj_a.id}/invitations/{acc_inv_id}", headers=headers_pm_a)
    assert res_revoke_accepted.status_code == 409

