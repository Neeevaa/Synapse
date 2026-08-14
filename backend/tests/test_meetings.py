import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.models.task import Task
from app.models.meeting import (
    Meeting,
    MeetingParticipant,
    MeetingAgendaItem,
    MeetingActionItem,
)
from app.models.enums import (
    CompanyRole,
    ProjectRole,
    MeetingType,
    MeetingStatus,
    AttendanceStatus,
    ActionItemStatus,
    ActionItemPriority,
)
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_create_meeting(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Meeting Co")
    pm = create_user(db_session, co, email="pm_meet@meet.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, co, email="dev_meet@meet.com", role=None)
    proj = create_project(db_session, co, name="Meeting Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    dev_mem = ProjectMember(project_id=proj.id, user_id=dev.id, role=ProjectRole.DEVELOPER)
    db_session.add_all([pm_mem, dev_mem])
    db_session.commit()

    headers = get_auth_headers(pm.id)
    sched_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    payload = {
        "title": "Sprint Planning Meeting",
        "description": "Aligning on upcoming sprint scope and backlog.",
        "meeting_type": "PLANNING",
        "organizer_id": str(pm.id),
        "scheduled_at": sched_time,
        "duration_minutes": 45,
        "participant_ids": [str(dev.id)],
        "agenda_items": [
            {"title": "Review Backlog", "description": "Prioritize P0 user stories", "order_index": 0},
            {"title": "Capacity Planning", "description": "Calculate dev team velocity", "order_index": 1},
        ],
    }

    res = client.post(f"/projects/{proj.id}/meetings", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()["data"]

    assert data["title"] == "Sprint Planning Meeting"
    assert data["meeting_type"] == "PLANNING"
    assert data["status"] == "SCHEDULED"
    assert data["duration_minutes"] == 45
    assert len(data["participants"]) == 2  # Organizer PM + Dev
    assert len(data["agenda_items"]) == 2


def test_list_and_filter_meetings(client: TestClient, db_session: Session):
    co = create_company(db_session, name="List Meeting Co")
    pm = create_user(db_session, co, email="pm_lmeet@meet.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="List Meeting Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    sched_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    client.post(
        f"/projects/{proj.id}/meetings",
        json={"title": "Daily Standup", "meeting_type": "STANDUP", "scheduled_at": sched_time},
        headers=headers,
    )
    client.post(
        f"/projects/{proj.id}/meetings",
        json={"title": "Architecture Review", "meeting_type": "TECHNICAL", "scheduled_at": sched_time},
        headers=headers,
    )

    res_all = client.get(f"/projects/{proj.id}/meetings", headers=headers)
    assert res_all.status_code == 200
    assert len(res_all.json()["data"]["meetings"]) == 2

    res_type = client.get(f"/projects/{proj.id}/meetings?meeting_type=STANDUP", headers=headers)
    assert res_type.status_code == 200
    assert len(res_type.json()["data"]["meetings"]) == 1
    assert res_type.json()["data"]["meetings"][0]["title"] == "Daily Standup"


def test_update_notes_and_transcript(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Notes Meeting Co")
    pm = create_user(db_session, co, email="pm_nmeet@meet.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Notes Meeting Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    headers = get_auth_headers(pm.id)
    sched_time = datetime.now(timezone.utc).isoformat()

    res_create = client.post(
        f"/projects/{proj.id}/meetings",
        json={"title": "Requirement Discussion", "meeting_type": "REQUIREMENT_DISCUSSION", "scheduled_at": sched_time},
        headers=headers,
    )
    meeting_id = res_create.json()["data"]["id"]

    # Update structured notes
    update_notes_payload = {
        "summary": "Discussed user authentication requirements.",
        "decisions": "Approved JWT with 15-min expiry and refresh tokens.",
        "discussion_notes": "Security lead recommended adding rate limiting.",
        "risks_concerns": "OAuth provider outage risk.",
        "status": "COMPLETED",
    }
    res_notes = client.patch(f"/projects/{proj.id}/meetings/{meeting_id}", json=update_notes_payload, headers=headers)
    assert res_notes.status_code == 200
    data_notes = res_notes.json()["data"]
    assert data_notes["summary"] == "Discussed user authentication requirements."
    assert data_notes["status"] == "COMPLETED"

    # Update transcript
    transcript_payload = {
        "transcript": "[00:01] PM: Welcome everyone.\n[00:02] Lead: Let's review JWT specs.",
        "recording_url_or_reference": "https://storage.synapse.com/recordings/rec-101.mp4",
    }
    res_trans = client.put(f"/projects/{proj.id}/meetings/{meeting_id}/transcript", json=transcript_payload, headers=headers)
    assert res_trans.status_code == 200
    data_trans = res_trans.json()["data"]
    assert "[00:01] PM: Welcome" in data_trans["transcript"]
    assert data_trans["recording_url_or_reference"] == "https://storage.synapse.com/recordings/rec-101.mp4"
    assert data_trans["transcript_updated_at"] is not None


def test_action_item_traceability_to_requirement_and_task(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Trace Co")
    pm = create_user(db_session, co, email="pm_trace@meet.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, co, email="dev_trace@meet.com", role=None)
    proj = create_project(db_session, co, name="Trace Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    dev_mem = ProjectMember(project_id=proj.id, user_id=dev.id, role=ProjectRole.DEVELOPER)
    db_session.add_all([pm_mem, dev_mem])
    db_session.commit()

    # Create Requirement & Task
    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-101",
        title="OAuth2 Integration Requirement",
        description="Must support Google OAuth2",
        created_by=pm.id,
    )
    task = Task(
        project_id=proj.id,
        title="Implement OAuth2 Login Handler",
        description="Backend route for Google callback",
        created_by=pm.id,
    )
    db_session.add_all([req, task])
    db_session.commit()

    headers = get_auth_headers(pm.id)
    sched_time = datetime.now(timezone.utc).isoformat()

    res_create = client.post(
        f"/projects/{proj.id}/meetings",
        json={"title": "Technical Sync", "meeting_type": "TECHNICAL", "scheduled_at": sched_time},
        headers=headers,
    )
    meeting_id = res_create.json()["data"]["id"]

    # Create action item linked to Requirement and Task
    ai_payload = {
        "title": "Update Google OAuth Client Secrets",
        "description": "Configure env vars in production deployment",
        "assigned_to": str(dev.id),
        "priority": "HIGH",
        "requirement_id": str(req.id),
        "task_id": str(task.id),
    }

    res_ai = client.post(f"/projects/{proj.id}/meetings/{meeting_id}/action-items", json=ai_payload, headers=headers)
    assert res_ai.status_code == 201, res_ai.text
    data_ai = res_ai.json()["data"]

    assert data_ai["title"] == "Update Google OAuth Client Secrets"
    assert data_ai["assigned_to"] == str(dev.id)
    assert data_ai["requirement_key"] == "REQ-101"
    assert data_ai["task_title"] == "Implement OAuth2 Login Handler"
    assert data_ai["status"] == "OPEN"

    # Update Action Item status to COMPLETED
    res_ai_update = client.patch(
        f"/projects/{proj.id}/meetings/{meeting_id}/action-items/{data_ai['id']}",
        json={"status": "COMPLETED"},
        headers=headers,
    )
    assert res_ai_update.status_code == 200
    assert res_ai_update.json()["data"]["status"] == "COMPLETED"


def test_research_preserves_contextual_relationships(client: TestClient, db_session: Session):
    """Verifies that Meeting -> Project -> Company & ActionItem -> Requirement -> Task relationships remain intact."""
    co = create_company(db_session, name="Context Co")
    pm = create_user(db_session, co, email="pm_context@meet.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Context Proj")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    req = Requirement(project_id=proj.id, company_id=co.id, requirement_key="REQ-50", title="RAG Context Spec", description="Spec", created_by=pm.id)
    task = Task(project_id=proj.id, title="RAG Pipeline Task", description="Task", created_by=pm.id)
    db_session.add_all([req, task])
    db_session.commit()

    headers = get_auth_headers(pm.id)
    sched_time = datetime.now(timezone.utc).isoformat()

    res_m = client.post(
        f"/projects/{proj.id}/meetings",
        json={"title": "AI Context Sync", "meeting_type": "TECHNICAL", "scheduled_at": sched_time},
        headers=headers,
    )
    m_id = res_m.json()["data"]["id"]

    res_ai = client.post(
        f"/projects/{proj.id}/meetings/{m_id}/action-items",
        json={"title": "Index meeting notes for RAG", "requirement_id": str(req.id), "task_id": str(task.id)},
        headers=headers,
    )
    assert res_ai.status_code == 201

    # Retrieve full meeting
    res_detail = client.get(f"/projects/{proj.id}/meetings/{m_id}", headers=headers)
    assert res_detail.status_code == 200
    data = res_detail.json()["data"]

    assert data["project_id"] == str(proj.id)
    assert data["company_id"] == str(co.id)
    assert len(data["action_items"]) == 1
    assert data["action_items"][0]["requirement_id"] == str(req.id)
    assert data["action_items"][0]["task_id"] == str(task.id)


def test_cross_company_isolation(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company A Meet")
    co_b = create_company(db_session, name="Company B Meet")

    pm_a = create_user(db_session, co_a, email="pma_miso@coma.com", role=CompanyRole.ADMIN)
    pm_b = create_user(db_session, co_b, email="pmb_miso@comb.com", role=CompanyRole.ADMIN)

    proj_a = create_project(db_session, co_a, name="Project A Meet")
    proj_b = create_project(db_session, co_b, name="Project B Meet")

    pm_mem_a = ProjectMember(project_id=proj_a.id, user_id=pm_a.id, role=ProjectRole.PROJECT_MANAGER)
    pm_mem_b = ProjectMember(project_id=proj_b.id, user_id=pm_b.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add_all([pm_mem_a, pm_mem_b])
    db_session.commit()

    headers_a = get_auth_headers(pm_a.id)
    headers_b = get_auth_headers(pm_b.id)

    sched_time = datetime.now(timezone.utc).isoformat()
    res_create = client.post(
        f"/projects/{proj_a.id}/meetings",
        json={"title": "Confidential Board Meeting", "meeting_type": "REVIEW", "scheduled_at": sched_time},
        headers=headers_a,
    )
    m_id = res_create.json()["data"]["id"]

    # PM B from Company B attempts to list Project A's meetings -> 403 Forbidden
    res_cross_list = client.get(f"/projects/{proj_a.id}/meetings", headers=headers_b)
    assert res_cross_list.status_code == 403

    # PM B attempts to view detail -> 403 Forbidden
    res_cross_detail = client.get(f"/projects/{proj_a.id}/meetings/{m_id}", headers=headers_b)
    assert res_cross_detail.status_code == 403
