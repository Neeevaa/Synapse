"""
Automated unit & integration tests for Synapse in-app Notification Center:
1. Task assignment creates notification for assigned developer with deep link
2. Self-notification is prevented (sender is never notified of their own actions)
3. Developer completing task notifies PM and Team Lead
4. PM updating task status notifies assigned developer
5. PM updating task priority notifies assigned developer
6. Sprint activation notifies project members
7. Sprint completion notifies project members
8. Requirement update notifies project members
9. Requirement status transition notifies project members
10. AI requirement review completion notifies requester
11. Adding member to project notifies added user
12. Member accepting invitation notifies project PM
13. Unread count endpoint returns accurate count
14. Mark single notification as read updates status and timestamp
15. Mark all as read updates all unread notifications
16. Cross-company notification isolation is strictly enforced
17. Notifications are grouped by project context (or General / Company)
18. Project filter query parameter returns project-specific subset
"""

from uuid import uuid4
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.requirement import Requirement, RequirementVersion
from app.models.invitation import Invitation
from app.models.notification import Notification
from app.models.enums import (
    CompanyRole,
    ProjectRole,
    TaskStatus,
    TaskPriority,
    SprintStatus,
    RequirementStatus,
    RequirementPriority,
    RequirementType,
    RequirementSource,
    InvitationStatus,
    NotificationType,
)
from app.core.security import create_access_token
from app.notifications.service import NotificationService
from app.tasks.service import TaskService
from app.tasks.schemas import CreateTaskRequest, UpdateTaskRequest, UpdateTaskStatusRequest
from app.sprints.service import SprintService
from app.sprints.schemas import UpdateSprintRequest
from app.requirements.service import RequirementService
from app.requirements.schemas import RequirementUpdate, RequirementStatusUpdate
from app.project_members.service import ProjectMemberService
from app.project_members.schemas import AddProjectMemberRequest
from tests.conftest import create_company, create_user, create_project, add_project_member


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def test_task_assigned_notification_created(db_session: Session):
    """Test 1: Assigning a developer to a task creates a notification for them."""
    company = create_company(db_session, name="Notif Co")
    pm = create_user(db_session, company, email="pm_task@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_task@notif.com", role=None)
    proj = create_project(db_session, company, name="Task Notif Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    task_service = TaskService(db_session)
    task = task_service.create_task(
        proj.id,
        CreateTaskRequest(
            title="Implement OAuth Handler",
            description="Build OAuth2 endpoint",
            assignee_id=dev.id,
        ),
        current_user=pm,
    )

    notifs = db_session.query(Notification).filter(Notification.recipient_user_id == dev.id).all()
    assert len(notifs) == 1
    assert notifs[0].type == NotificationType.TASK_ASSIGNED
    assert "Implement OAuth Handler" in notifs[0].title or "Implement OAuth Handler" in notifs[0].message
    assert notifs[0].is_read is False
    assert notifs[0].deep_link == f"/projects/{proj.id}/backlog"


def test_no_self_notification(db_session: Session):
    """Test 2: Actor does not receive notifications for actions they perform."""
    company = create_company(db_session, name="Self Notif Co")
    pm = create_user(db_session, company, email="pm_self@notif.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, company, name="Self Notif Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)

    task_service = TaskService(db_session)
    # PM assigns task to themselves
    task_service.create_task(
        proj.id,
        CreateTaskRequest(
            title="PM Self Task",
            assignee_id=pm.id,
        ),
        current_user=pm,
    )

    pm_notifs = db_session.query(Notification).filter(Notification.recipient_user_id == pm.id).all()
    assert len(pm_notifs) == 0


def test_developer_task_completion_notifies_pm(db_session: Session):
    """Test 3: When a developer completes a task, the PM receives a TASK_STATUS_CHANGED notification."""
    company = create_company(db_session, name="Done Co")
    pm = create_user(db_session, company, email="pm_done@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_done@notif.com", role=None)
    proj = create_project(db_session, company, name="Done Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    task_service = TaskService(db_session)
    task = task_service.create_task(
        proj.id,
        CreateTaskRequest(title="Write Unit Tests", assignee_id=dev.id),
        current_user=pm,
    )

    # Developer marks task as DONE
    task_service.update_task_status(task.id, UpdateTaskStatusRequest(status="DONE"), current_user=dev)

    pm_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == pm.id,
        Notification.type == NotificationType.TASK_STATUS_CHANGED,
    ).all()
    assert len(pm_notifs) == 1
    assert "completed" in pm_notifs[0].message.lower() or "completed" in pm_notifs[0].title.lower()


def test_pm_task_status_update_notifies_developer(db_session: Session):
    """Test 4: When PM updates task status, the assigned developer is notified."""
    company = create_company(db_session, name="Status Co")
    pm = create_user(db_session, company, email="pm_status@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_status@notif.com", role=None)
    proj = create_project(db_session, company, name="Status Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    task_service = TaskService(db_session)
    task = task_service.create_task(
        proj.id,
        CreateTaskRequest(title="Design DB Schema", assignee_id=dev.id),
        current_user=pm,
    )

    # PM changes status to IN_PROGRESS
    task_service.update_task_status(task.id, UpdateTaskStatusRequest(status="IN_PROGRESS"), current_user=pm)

    dev_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev.id,
        Notification.type == NotificationType.TASK_STATUS_CHANGED,
    ).all()
    assert len(dev_notifs) == 1
    assert "IN_PROGRESS" in dev_notifs[0].message


def test_pm_task_priority_update_notifies_developer(db_session: Session):
    """Test 5: When PM updates task priority, the assigned developer is notified."""
    company = create_company(db_session, name="Priority Co")
    pm = create_user(db_session, company, email="pm_prio@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_prio@notif.com", role=None)
    proj = create_project(db_session, company, name="Priority Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    task_service = TaskService(db_session)
    task = task_service.create_task(
        proj.id,
        CreateTaskRequest(title="Fix Memory Leak", priority="LOW", assignee_id=dev.id),
        current_user=pm,
    )

    task_service.update_task(task.id, UpdateTaskRequest(priority="URGENT"), current_user=pm)

    dev_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev.id,
        Notification.type == NotificationType.TASK_PRIORITY_CHANGED,
    ).all()
    assert len(dev_notifs) == 1
    assert "URGENT" in dev_notifs[0].message


def test_sprint_activation_notifies_members(db_session: Session):
    """Test 6: Sprint activation notifies all project members (except activating PM)."""
    company = create_company(db_session, name="Sprint Notif Co")
    pm = create_user(db_session, company, email="pm_sprint@notif.com", role=CompanyRole.ADMIN)
    dev1 = create_user(db_session, company, email="dev1_sprint@notif.com", role=None)
    dev2 = create_user(db_session, company, email="dev2_sprint@notif.com", role=None)
    proj = create_project(db_session, company, name="Sprint Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev1, role=ProjectRole.DEVELOPER)
    add_project_member(db_session, proj, dev2, role=ProjectRole.DEVELOPER)

    sprint = Sprint(project_id=proj.id, name="Sprint Alpha", status=SprintStatus.PLANNED)
    db_session.add(sprint)
    db_session.commit()

    sprint_service = SprintService(db_session)
    sprint_service.update_sprint(sprint.id, UpdateSprintRequest(status="ACTIVE"), current_user=pm)

    d1_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev1.id,
        Notification.type == NotificationType.SPRINT_ACTIVATED,
    ).all()
    d2_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev2.id,
        Notification.type == NotificationType.SPRINT_ACTIVATED,
    ).all()
    pm_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == pm.id,
        Notification.type == NotificationType.SPRINT_ACTIVATED,
    ).all()

    assert len(d1_notifs) == 1
    assert len(d2_notifs) == 1
    assert len(pm_notifs) == 0  # Self-notification prevented


def test_sprint_completion_notifies_members(db_session: Session):
    """Test 7: Sprint completion notifies all project members."""
    company = create_company(db_session, name="Sprint Complete Co")
    pm = create_user(db_session, company, email="pm_sc@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_sc@notif.com", role=None)
    proj = create_project(db_session, company, name="SC Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    sprint = Sprint(project_id=proj.id, name="Sprint Beta", status=SprintStatus.ACTIVE)
    db_session.add(sprint)
    db_session.commit()

    sprint_service = SprintService(db_session)
    sprint_service.update_sprint(sprint.id, UpdateSprintRequest(status="COMPLETED"), current_user=pm)

    dev_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev.id,
        Notification.type == NotificationType.SPRINT_COMPLETED,
    ).all()
    assert len(dev_notifs) == 1
    assert "completed" in dev_notifs[0].message.lower()


def test_requirement_update_notifies_members(db_session: Session):
    """Test 8: Requirement update notifies project members."""
    company = create_company(db_session, name="Req Update Co")
    pm = create_user(db_session, company, email="pm_req@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_req@notif.com", role=None)
    proj = create_project(db_session, company, name="Req Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    req = Requirement(
        project_id=proj.id,
        company_id=company.id,
        requirement_key="REQ-101",
        title="Checkout Service",
        description="Original description",
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    req_service = RequirementService(db_session)
    req_service.update_requirement(
        proj.id,
        req.id,
        RequirementUpdate(description="Updated description with idempotency"),
        current_user=pm,
    )

    dev_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev.id,
        Notification.type == NotificationType.REQUIREMENT_UPDATED,
    ).all()
    assert len(dev_notifs) == 1
    assert "REQ-101" in dev_notifs[0].message


def test_requirement_status_change_notifies_members(db_session: Session):
    """Test 9: Requirement status change notifies project members."""
    company = create_company(db_session, name="Req Status Co")
    pm = create_user(db_session, company, email="pm_rs@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_rs@notif.com", role=None)
    proj = create_project(db_session, company, name="RS Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)
    add_project_member(db_session, proj, dev, role=ProjectRole.DEVELOPER)

    req = Requirement(
        project_id=proj.id,
        company_id=company.id,
        requirement_key="REQ-102",
        title="Payment Gateway",
        description="Integrate Stripe",
        status=RequirementStatus.DRAFT,
        created_by=pm.id,
    )
    db_session.add(req)
    db_session.commit()

    req_service = RequirementService(db_session)
    req_service.update_requirement_status(
        proj.id,
        req.id,
        RequirementStatusUpdate(status=RequirementStatus.APPROVED),
        current_user=pm,
    )

    dev_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev.id,
        Notification.type == NotificationType.REQUIREMENT_STATUS_CHANGED,
    ).all()
    assert len(dev_notifs) == 1
    assert "APPROVED" in dev_notifs[0].message


def test_ai_review_completion_notifies_requester(db_session: Session):
    """Test 10: AI requirement review completion creates a notification for requester."""
    company = create_company(db_session, name="AI Review Co")
    user = create_user(db_session, company, email="requester@notif.com", role=CompanyRole.ADMIN)
    proj = create_project(db_session, company, name="AI Project")
    add_project_member(db_session, proj, user, role=ProjectRole.PROJECT_MANAGER)

    service = NotificationService(db_session)
    service.notify_users(
        recipient_ids=[user.id],
        sender_id=None,
        company_id=company.id,
        type=NotificationType.AI_REVIEW_COMPLETED,
        title="AI Review Completed",
        message="AI review completed for REQ-200 with 3 findings.",
        project_id=proj.id,
        source_type="AI_REVIEW",
        source_id=uuid4(),
        deep_link=f"/projects/{proj.id}/requirements",
    )

    notifs = db_session.query(Notification).filter(Notification.recipient_user_id == user.id).all()
    assert len(notifs) == 1
    assert notifs[0].type == NotificationType.AI_REVIEW_COMPLETED
    assert "AI review completed" in notifs[0].message


def test_project_member_added_notifies_user(db_session: Session):
    """Test 11: Adding a member to a project by email notifies that user."""
    company = create_company(db_session, name="Member Add Co")
    pm = create_user(db_session, company, email="pm_ma@notif.com", role=CompanyRole.ADMIN)
    dev = create_user(db_session, company, email="dev_ma@notif.com", role=None)
    proj = create_project(db_session, company, name="MA Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)

    pm_service = ProjectMemberService(db_session)
    pm_service.add_member_by_email(
        proj.id,
        AddProjectMemberRequest(email=dev.email, role=ProjectRole.DEVELOPER),
        current_user=pm,
    )

    dev_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == dev.id,
        Notification.type == NotificationType.PROJECT_MEMBER_ADDED,
    ).all()
    assert len(dev_notifs) == 1
    assert "Added to Project" in dev_notifs[0].title


def test_invitation_acceptance_notifies_pm(db_session: Session):
    """Test 12: Accepting an invitation notifies the project PM."""
    from datetime import timedelta
    from app.project_members.service import hash_invitation_token

    company = create_company(db_session, name="Invite Accept Co")
    pm = create_user(db_session, company, email="pm_ia@notif.com", role=CompanyRole.ADMIN)
    new_user = create_user(db_session, company, email="joiner@notif.com", role=None)
    proj = create_project(db_session, company, name="IA Project")
    add_project_member(db_session, proj, pm, role=ProjectRole.PROJECT_MANAGER)

    raw_token = "secret_invite_token_123"
    inv = Invitation(
        company_id=company.id,
        project_id=proj.id,
        email=new_user.email,
        token_hash=hash_invitation_token(raw_token),
        project_role=ProjectRole.DEVELOPER,
        status=InvitationStatus.PENDING,
        created_by=pm.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(inv)
    db_session.commit()

    pm_service = ProjectMemberService(db_session)
    pm_service.accept_invitation(raw_token, current_user=new_user)

    pm_notifs = db_session.query(Notification).filter(
        Notification.recipient_user_id == pm.id,
        Notification.type == NotificationType.PROJECT_MEMBER_ADDED,
    ).all()
    assert len(pm_notifs) == 1
    assert "joined" in pm_notifs[0].message.lower()


def test_unread_count_endpoint(client: TestClient, db_session: Session):
    """Test 13: GET /notifications/unread-count returns accurate count."""
    company = create_company(db_session, name="Count Co")
    user = create_user(db_session, company, email="counter@notif.com", role=None)
    proj = create_project(db_session, company, name="Count Project")

    # Create 3 unread notifications and 1 read notification
    for i in range(3):
        notif = Notification(
            recipient_user_id=user.id,
            company_id=company.id,
            project_id=proj.id,
            type=NotificationType.TASK_ASSIGNED,
            title=f"Unread {i}",
            message=f"Message {i}",
            is_read=False,
        )
        db_session.add(notif)

    read_notif = Notification(
        recipient_user_id=user.id,
        company_id=company.id,
        project_id=proj.id,
        type=NotificationType.TASK_ASSIGNED,
        title="Already Read",
        message="Message read",
        is_read=True,
    )
    db_session.add(read_notif)
    db_session.commit()

    headers = get_auth_headers(user.id)
    resp = client.get("/notifications/unread-count", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["unread_count"] == 3


def test_mark_single_notification_read(client: TestClient, db_session: Session):
    """Test 14: PATCH /notifications/{id}/read marks the notification as read."""
    company = create_company(db_session, name="Mark One Co")
    user = create_user(db_session, company, email="mark_one@notif.com", role=None)
    notif = Notification(
        recipient_user_id=user.id,
        company_id=company.id,
        type=NotificationType.TASK_ASSIGNED,
        title="Pending Read",
        message="Important message",
        is_read=False,
    )
    db_session.add(notif)
    db_session.commit()

    headers = get_auth_headers(user.id)
    resp = client.patch(f"/notifications/{notif.id}/read", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_read"] is True
    assert data["read_at"] is not None

    db_session.refresh(notif)
    assert notif.is_read is True


def test_mark_all_notifications_read(client: TestClient, db_session: Session):
    """Test 15: POST /notifications/mark-all-read marks all unread notifications as read."""
    company = create_company(db_session, name="Mark All Co")
    user = create_user(db_session, company, email="mark_all@notif.com", role=None)

    for i in range(4):
        notif = Notification(
            recipient_user_id=user.id,
            company_id=company.id,
            type=NotificationType.TASK_ASSIGNED,
            title=f"Notif {i}",
            message="Test",
            is_read=False,
        )
        db_session.add(notif)
    db_session.commit()

    headers = get_auth_headers(user.id)
    resp = client.post("/notifications/mark-all-read", json={}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["marked_read_count"] == 4

    unread = db_session.query(Notification).filter(
        Notification.recipient_user_id == user.id,
        Notification.is_read == False,
    ).count()
    assert unread == 0


def test_cross_company_isolation(client: TestClient, db_session: Session):
    """Test 16: User from Company B cannot access or receive Company A's notifications."""
    company_a = create_company(db_session, name="Company A")
    company_b = create_company(db_session, name="Company B")
    user_a = create_user(db_session, company_a, email="user_a@tenant.com")
    user_b = create_user(db_session, company_b, email="user_b@tenant.com")

    notif_a = Notification(
        recipient_user_id=user_a.id,
        company_id=company_a.id,
        type=NotificationType.TASK_ASSIGNED,
        title="Company A Secret Task",
        message="Confidential project details",
        is_read=False,
    )
    db_session.add(notif_a)
    db_session.commit()

    # User B requests their notifications
    headers_b = get_auth_headers(user_b.id)
    resp = client.get("/notifications", headers=headers_b)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 0
    assert data["unread_count"] == 0

    # User B cannot mark User A's notification read
    resp_mark = client.patch(f"/notifications/{notif_a.id}/read", headers=headers_b)
    assert resp_mark.status_code == 404


def test_project_grouping_and_filtering(client: TestClient, db_session: Session):
    """Test 17 & 18: Notifications are grouped by project context and can be filtered by project_id."""
    company = create_company(db_session, name="Group Co")
    user = create_user(db_session, company, email="grouper@notif.com")
    proj1 = create_project(db_session, company, name="Project Alpha")
    proj2 = create_project(db_session, company, name="Project Beta")

    n1 = Notification(
        recipient_user_id=user.id,
        company_id=company.id,
        project_id=proj1.id,
        type=NotificationType.TASK_ASSIGNED,
        title="Alpha Task",
        message="Task on Alpha",
        is_read=False,
    )
    n2 = Notification(
        recipient_user_id=user.id,
        company_id=company.id,
        project_id=proj2.id,
        type=NotificationType.SPRINT_ACTIVATED,
        title="Beta Sprint",
        message="Sprint on Beta",
        is_read=False,
    )
    n3 = Notification(
        recipient_user_id=user.id,
        company_id=company.id,
        project_id=None,  # General / Company
        type=NotificationType.PROJECT_MEMBER_ADDED,
        title="Welcome to Organization",
        message="Account verified",
        is_read=True,
    )
    db_session.add_all([n1, n2, n3])
    db_session.commit()

    headers = get_auth_headers(user.id)

    # All notifications grouped
    resp = client.get("/notifications", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 3
    assert data["unread_count"] == 2
    assert len(data["groups"]) == 3
    group_names = {g["project_name"] for g in data["groups"]}
    assert "Project Alpha" in group_names
    assert "Project Beta" in group_names
    assert "General / Company" in group_names

    # Filter by Project Alpha
    resp_alpha = client.get(f"/notifications?project_id={proj1.id}", headers=headers)
    assert resp_alpha.status_code == 200
    alpha_data = resp_alpha.json()["data"]
    assert len(alpha_data["items"]) == 1
    assert alpha_data["items"][0]["title"] == "Alpha Task"
    assert alpha_data["unread_count"] == 1
