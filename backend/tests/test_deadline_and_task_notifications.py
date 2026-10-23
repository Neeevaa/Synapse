import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from sqlalchemy.orm import Session



from app.models.company import Company
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.notification import Notification
from app.models.enums import CompanyRole, ProjectRole, TaskStatus, SprintStatus, NotificationType
from app.core.security import create_access_token
from app.tasks.service import TaskService
from app.tasks.schemas import CreateTaskRequest, UpdateTaskRequest
from app.notifications.deadline_service import run_deadline_and_risk_checks
from tests.conftest import create_company, create_user, create_project


def get_auth_headers(user_id) -> dict:
    token = create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def deadline_test_setup(db_session: Session):
    company = create_company(db_session, name=f"DeadlineCo-{uuid.uuid4().hex[:6]}")

    cto = create_user(
        db_session,
        company,
        email=f"cto_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.OWNER,
    )
    cto.designation = "Chief Technology Officer"

    pm = create_user(
        db_session,
        company,
        email=f"pm_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    pm.designation = "Project Manager"

    dev = create_user(
        db_session,
        company,
        email=f"dev_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    dev.designation = "Backend Developer"

    dev2 = create_user(
        db_session,
        company,
        email=f"dev2_{uuid.uuid4().hex[:6]}@test.com",
        role=CompanyRole.MEMBER,
    )
    dev2.designation = "Frontend Developer"

    project = create_project(db_session, company, name="Phoenix Initiative")

    db_session.add(ProjectMember(project_id=project.id, user_id=pm.id, role=ProjectRole.PROJECT_MANAGER))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev.id, role=ProjectRole.DEVELOPER))
    db_session.add(ProjectMember(project_id=project.id, user_id=dev2.id, role=ProjectRole.DEVELOPER))
    db_session.commit()

    return {
        "company": company,
        "cto": cto,
        "pm": pm,
        "dev": dev,
        "dev2": dev2,
        "project": project,
    }


def test_newly_assigned_task_generates_one_notification(db_session: Session, deadline_test_setup):
    """Creating a task with an assignee notifies only that developer."""
    data = deadline_test_setup
    task_service = TaskService(db_session)

    req = CreateTaskRequest(
        title="Implement OAuth Security",
        description="Add MFA and OAuth validation",
        assignee_id=data["dev"].id,
    )
    created = task_service.create_task(data["project"].id, req, current_user=data["pm"])

    # Verify notification created for dev
    notifs = list(
        db_session.scalars(
            select(Notification).filter(
                Notification.recipient_user_id == data["dev"].id,
                Notification.type == NotificationType.TASK_ASSIGNED,
            )
        ).all()
    )
    assert len(notifs) == 1
    assert "Implement OAuth Security" in notifs[0].message
    assert "Phoenix Initiative" in notifs[0].message
    assert notifs[0].title == "New Task Assigned"

    # Verify unrelated developer and CTO did not receive assignment notification
    cto_notifs = list(
        db_session.scalars(
            select(Notification).filter(Notification.recipient_user_id == data["cto"].id)
        ).all()
    )
    assert len(cto_notifs) == 0


def test_saving_unchanged_task_does_not_generate_duplicate_notification(db_session: Session, deadline_test_setup):
    """Updating a task without changing the assignee does not trigger duplicate assignment notification."""
    data = deadline_test_setup
    task_service = TaskService(db_session)

    # 1. Create task
    req = CreateTaskRequest(title="Initial Task", assignee_id=data["dev"].id)
    created = task_service.create_task(data["project"].id, req, current_user=data["pm"])

    initial_count = db_session.scalar(
        select(Notification.id).filter(
            Notification.recipient_user_id == data["dev"].id,
            Notification.type == NotificationType.TASK_ASSIGNED,
        )
    )
    assert initial_count is not None

    # 2. Update without changing assignee (same assignee_id)
    update_req = UpdateTaskRequest(
        description="Updated description without assignee change",
        assignee_id=data["dev"].id,
    )
    task_service.update_task(created.id, update_req, current_user=data["pm"])

    # Count must remain 1
    all_notifs = list(
        db_session.scalars(
            select(Notification).filter(
                Notification.recipient_user_id == data["dev"].id,
                Notification.type == NotificationType.TASK_ASSIGNED,
            )
        ).all()
    )
    assert len(all_notifs) == 1


def test_task_due_within_24h_generates_upcoming_deadline_notification(db_session: Session, deadline_test_setup):
    """An incomplete task due in 12 hours triggers TASK_DEADLINE_APPROACHING for the assignee."""
    data = deadline_test_setup
    now = datetime.now(timezone.utc)
    due_in_12h = now + timedelta(hours=12)

    task = Task(
        project_id=data["project"].id,
        title="Deploy Redis Cache Layer",
        status=TaskStatus.IN_PROGRESS,
        assignee_id=data["dev"].id,
        due_date=due_in_12h,
    )
    db_session.add(task)
    db_session.commit()

    # Run check
    stats = run_deadline_and_risk_checks(db_session, now=now)
    assert stats["upcoming_count"] >= 1

    notif = db_session.scalar(
        select(Notification).filter(
            Notification.recipient_user_id == data["dev"].id,
            Notification.type == NotificationType.TASK_DEADLINE_APPROACHING,
            Notification.source_id == task.id,
        )
    )
    assert notif is not None
    assert notif.title == "Task Due Soon"
    assert "Deploy Redis Cache Layer" in notif.message
    assert "within 24 hours" in notif.message


def test_incomplete_task_due_date_reached_notifies_developer_and_pm(db_session: Session, deadline_test_setup):
    """When a task reaches its deadline, both the developer and the project manager receive alerts."""
    data = deadline_test_setup
    now = datetime.now(timezone.utc)
    just_passed = now - timedelta(minutes=5)

    task = Task(
        project_id=data["project"].id,
        title="Complete API Documentation",
        status=TaskStatus.TODO,
        assignee_id=data["dev"].id,
        due_date=just_passed,
    )
    db_session.add(task)
    db_session.commit()

    stats = run_deadline_and_risk_checks(db_session, now=now)
    assert stats["due_reached_count"] >= 2  # dev and pm

    dev_notif = db_session.scalar(
        select(Notification).filter(
            Notification.recipient_user_id == data["dev"].id,
            Notification.type == NotificationType.TASK_DUE_DATE_REACHED,
            Notification.source_id == task.id,
        )
    )
    assert dev_notif is not None
    assert "reached its due date" in dev_notif.message

    pm_notif = db_session.scalar(
        select(Notification).filter(
            Notification.recipient_user_id == data["pm"].id,
            Notification.type == NotificationType.TASK_DUE_DATE_REACHED,
            Notification.source_id == task.id,
        )
    )
    assert pm_notif is not None
    assert "Complete API Documentation" in pm_notif.message


def test_overdue_task_generates_daily_cadence_reminders(db_session: Session, deadline_test_setup):
    """An overdue task produces 1 reminder per recipient per calendar day."""
    data = deadline_test_setup
    day1 = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    day2 = datetime(2026, 10, 21, 10, 0, 0, tzinfo=timezone.utc)
    overdue_date = datetime(2026, 10, 18, 12, 0, 0, tzinfo=timezone.utc)

    task = Task(
        project_id=data["project"].id,
        title="Overdue Feature Migration",
        status=TaskStatus.IN_PROGRESS,
        assignee_id=data["dev"].id,
        due_date=overdue_date,
    )
    db_session.add(task)
    db_session.commit()

    # 1. Run check on Day 1
    stats1 = run_deadline_and_risk_checks(db_session, now=day1)
    assert stats1["overdue_count"] >= 2  # 1 for dev, 1 for pm

    # 2. Run check AGAIN on Day 1 (should be skipped due to daily deduplication_key)
    stats1_repeat = run_deadline_and_risk_checks(db_session, now=day1 + timedelta(hours=2))
    assert stats1_repeat["overdue_count"] == 0

    # 3. Run check on Day 2 -> Generates 1 new reminder for the new day
    stats2 = run_deadline_and_risk_checks(db_session, now=day2)
    assert stats2["overdue_count"] >= 2


def test_completed_task_receives_no_further_deadline_reminders(db_session: Session, deadline_test_setup):
    """A task marked DONE never receives upcoming or overdue alerts."""
    data = deadline_test_setup
    now = datetime.now(timezone.utc)
    past_date = now - timedelta(days=2)

    task = Task(
        project_id=data["project"].id,
        title="Completed Verification Suite",
        status=TaskStatus.DONE,
        assignee_id=data["dev"].id,
        due_date=past_date,
    )
    db_session.add(task)
    db_session.commit()

    stats = run_deadline_and_risk_checks(db_session, now=now)
    # The completed task should not trigger overdue notifications
    completed_notifs = list(
        db_session.scalars(
            select(Notification).filter(
                Notification.source_id == task.id,
                Notification.type.in_([NotificationType.TASK_OVERDUE, NotificationType.TASK_DEADLINE_APPROACHING]),
            )
        ).all()
    )
    assert len(completed_notifs) == 0


def test_repeated_scheduler_executions_do_not_create_duplicates(db_session: Session, deadline_test_setup):
    """Running the deadline checker multiple times consecutively creates 0 duplicate notifications."""
    data = deadline_test_setup
    now = datetime.now(timezone.utc)
    due_in_6h = now + timedelta(hours=6)

    task = Task(
        project_id=data["project"].id,
        title="Idempotency Validation Task",
        status=TaskStatus.TODO,
        assignee_id=data["dev"].id,
        due_date=due_in_6h,
    )
    db_session.add(task)
    db_session.commit()

    # Run 1
    stats1 = run_deadline_and_risk_checks(db_session, now=now)
    # Run 2 immediately
    stats2 = run_deadline_and_risk_checks(db_session, now=now)
    # Run 3 immediately
    stats3 = run_deadline_and_risk_checks(db_session, now=now)

    assert stats2["upcoming_count"] == 0
    assert stats3["upcoming_count"] == 0

    total_for_task = db_session.scalar(
        select(func.count(Notification.id)).filter(
            Notification.source_id == task.id,
            Notification.type == NotificationType.TASK_DEADLINE_APPROACHING,
        )
    )
    assert total_for_task == 1



def test_project_risk_alert_when_threshold_met(db_session: Session, deadline_test_setup):
    """When >= 3 incomplete tasks in an active sprint are due in <= 24h, PM receives a risk alert."""
    data = deadline_test_setup
    now = datetime.now(timezone.utc)

    # 1. Create active sprint
    sprint = Sprint(
        project_id=data["project"].id,
        name="Sprint Alpha 2026",
        status=SprintStatus.ACTIVE,
        start_date=now - timedelta(days=5),
        end_date=now + timedelta(days=2),
    )
    db_session.add(sprint)
    db_session.commit()

    # 2. Create 3 incomplete tasks due within 24h
    for i in range(3):
        t = Task(
            project_id=data["project"].id,
            sprint_id=sprint.id,
            title=f"Critical Bug {i + 1}",
            status=TaskStatus.IN_PROGRESS,
            assignee_id=data["dev"].id,
            due_date=now + timedelta(hours=8 + i),
        )
        db_session.add(t)
    db_session.commit()

    # Run checks with threshold=3
    stats = run_deadline_and_risk_checks(db_session, now=now, risk_threshold=3)
    assert stats["risk_alerts_count"] >= 1

    pm_risk_notif = db_session.scalar(
        select(Notification).filter(
            Notification.recipient_user_id == data["pm"].id,
            Notification.type == NotificationType.PROJECT_RISK_ALERT,
            Notification.source_id == sprint.id,
        )
    )
    assert pm_risk_notif is not None
    assert pm_risk_notif.title == "Project Tasks Need Attention"
    assert "Sprint Alpha 2026" in pm_risk_notif.message
    assert "due within the next 24 hours" in pm_risk_notif.message


def test_user_cannot_access_or_modify_another_users_notifications(client: TestClient, deadline_test_setup, db_session: Session):
    """A user cannot access, mark as read, or view another user's notifications."""
    data = deadline_test_setup
    dev_headers = get_auth_headers(data["dev"].id)
    pm_headers = get_auth_headers(data["pm"].id)

    # Create private notification strictly for PM
    pm_notif = Notification(
        recipient_user_id=data["pm"].id,
        company_id=data["company"].id,
        project_id=data["project"].id,
        type=NotificationType.PROJECT_RISK_ALERT,
        title="Confidential Manager Brief",
        message="Confidential alert for PM only",
        is_read=False,
    )
    db_session.add(pm_notif)
    db_session.commit()

    # 1. Dev fetches notifications -> PM's notification must NOT be visible
    res_dev_list = client.get("/notifications", headers=dev_headers)
    assert res_dev_list.status_code == 200
    dev_items = res_dev_list.json()["data"]["items"]
    assert not any(n["id"] == str(pm_notif.id) for n in dev_items)

    # 2. Dev tries to mark PM's notification as read -> 404 Not Found (or 403 Forbidden)
    res_tamper = client.patch(f"/notifications/{pm_notif.id}/read", headers=dev_headers)
    assert res_tamper.status_code == 404

    # 3. PM marks it as read -> 200 OK
    res_pm_read = client.patch(f"/notifications/{pm_notif.id}/read", headers=pm_headers)
    assert res_pm_read.status_code == 200
    assert res_pm_read.json()["data"]["is_read"] is True


def test_run_deadline_checks_api_endpoint(client: TestClient, deadline_test_setup):
    """Calling POST /notifications/run-deadline-checks runs checks and returns execution summary."""
    data = deadline_test_setup
    pm_headers = get_auth_headers(data["pm"].id)

    res = client.post("/notifications/run-deadline-checks", headers=pm_headers)
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["success"] is True
    assert "upcoming_count" in json_data["data"]
    assert "due_reached_count" in json_data["data"]
    assert "overdue_count" in json_data["data"]
    assert "risk_alerts_count" in json_data["data"]
