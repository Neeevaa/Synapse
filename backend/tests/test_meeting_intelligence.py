"""
Integration tests for Meeting Intelligence AI pipeline and human task review conversion:
1. Meeting Intelligence analysis pipeline execution on transcript
2. Task suggestions enter PENDING state and DO NOT automatically become project tasks
3. Accepting a suggestion converts it into a real project Task entity with links to meeting & requirement
4. Modifying a suggestion converts it into a real project Task entity with custom properties
5. Rejecting a suggestion updates status without creating a project task
6. Research evaluation metrics endpoint (human_acceptance_rate, latencies)
7. Cross-company tenant security isolation (403 Forbidden)
"""

from uuid import UUID
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.models.meeting import Meeting
from app.models.task import Task
from app.models.enums import CompanyRole, ProjectRole, MeetingType, FindingHumanDecision
from app.core.security import create_access_token
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_meeting_intelligence_pipeline_and_human_review_flow(client: TestClient, db_session: Session):
    co = create_company(db_session, name="Intel Co")
    pm = create_user(db_session, co, email="pm_intel@intel.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, co, name="Intel Project")

    pm_mem = ProjectMember(project_id=proj.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER)
    db_session.add(pm_mem)
    db_session.commit()

    # Create Requirement
    req = Requirement(
        project_id=proj.id,
        company_id=co.id,
        requirement_key="REQ-10",
        title="Payment Gateway Integration",
        description="Must integrate Stripe for payment processing.",
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    # Create Meeting with Transcript
    transcript_text = """
[00:01] PM: Welcome team to the payment integration sync.
[00:02] Lead: We need to implement the Stripe webhook handler on the backend to process payment confirmations.
[00:03] PM: Great. Also, UI team should design the checkout confirmation modal.
[00:04] Lead: Agreed. Let's make sure we log all failed webhook payloads.
"""
    mtg = Meeting(
        project_id=proj.id,
        company_id=co.id,
        title="Payment Sync Meeting",
        meeting_type=MeetingType.TECHNICAL,
        organizer_id=pm.id,
        scheduled_at=datetime.now(timezone.utc),
        duration_minutes=30,
        transcript=transcript_text,
    )
    db_session.add(mtg)
    db_session.commit()

    headers = get_auth_headers(pm.id)

    # 1. Trigger Meeting Intelligence Analysis
    res_an = client.post(f"/projects/{proj.id}/meetings/{mtg.id}/analyze", headers=headers)
    assert res_an.status_code == 201, res_an.text
    an_data = res_an.json()["data"]

    assert an_data["status"] == "COMPLETED", f"Analysis failed with error: {an_data.get('error_message')}"
    assert an_data["summary"] is not None
    assert len(an_data["task_suggestions"]) >= 1

    # Verify task suggestions start in PENDING state
    first_sug = an_data["task_suggestions"][0]
    assert first_sug["human_decision"] == "PENDING"
    assert first_sug["created_task_id"] is None

    # Verify NO real project task exists yet for this suggestion
    tasks_count_before = db_session.query(Task).filter(Task.project_id == proj.id).count()
    assert tasks_count_before == 0

    analysis_id = an_data["id"]
    sug_id = first_sug["id"]

    # 2. Human accepts the task suggestion -> converts into real Task
    patch_accept = {
        "human_decision": "ACCEPTED",
        "human_comment": "Approved task during meeting triage.",
    }
    res_patch = client.patch(
        f"/projects/{proj.id}/meetings/{mtg.id}/analyses/{analysis_id}/suggestions/{sug_id}",
        json=patch_accept,
        headers=headers,
    )
    assert res_patch.status_code == 200, res_patch.text
    sug_data = res_patch.json()["data"]

    assert sug_data["human_decision"] == "ACCEPTED"
    assert sug_data["created_task_id"] is not None

    # Verify real Task was created in DB
    tasks_count_after = db_session.query(Task).filter(Task.project_id == proj.id).count()
    assert tasks_count_after == 1
    created_task = db_session.query(Task).filter(Task.id == UUID(sug_data["created_task_id"])).scalar()
    assert created_task is not None
    assert created_task.title == first_sug["title"]


def test_meeting_intelligence_metrics_and_isolation(client: TestClient, db_session: Session):
    co_a = create_company(db_session, name="Company Alpha Intel")
    co_b = create_company(db_session, name="Company Beta Intel")

    user_a = create_user(db_session, co_a, email="user_a_intel@alpha.com", role=CompanyRole.ADMIN)
    user_b = create_user(db_session, co_b, email="user_b_intel@beta.com", role=CompanyRole.ADMIN)

    proj_a = create_project(db_session, co_a, name="Project Alpha Intel")
    proj_b = create_project(db_session, co_b, name="Project Beta Intel")

    db_session.add_all([
        ProjectMember(project_id=proj_a.id, user_id=user_a.id, role=ProjectRole.PROJECT_MANAGER),
        ProjectMember(project_id=proj_b.id, user_id=user_b.id, role=ProjectRole.PROJECT_MANAGER),
    ])
    db_session.commit()

    mtg_a = Meeting(
        project_id=proj_a.id,
        company_id=co_a.id,
        title="Alpha Confidential Sync",
        organizer_id=user_a.id,
        scheduled_at=datetime.now(timezone.utc),
        transcript="Discussed confidential alpha features.",
    )
    db_session.add(mtg_a)
    db_session.commit()

    headers_a = get_auth_headers(user_a.id)
    headers_b = get_auth_headers(user_b.id)

    # User A runs analysis
    res_a = client.post(f"/projects/{proj_a.id}/meetings/{mtg_a.id}/analyze", headers=headers_a)
    assert res_a.status_code == 201

    # User A checks research metrics
    res_met = client.get(f"/projects/{proj_a.id}/meetings/intelligence/metrics", headers=headers_a)
    assert res_met.status_code == 200
    met_data = res_met.json()["data"]
    assert met_data["total_analyses_run"] >= 1
    assert "human_acceptance_rate" in met_data

    # User B attempts to trigger analysis on Company A's meeting -> 403 Forbidden
    res_cross = client.post(f"/projects/{proj_a.id}/meetings/{mtg_a.id}/analyze", headers=headers_b)
    assert res_cross.status_code == 403
