import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.task import Task
from app.models.sprint import Sprint
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.notification import Notification
from app.models.enums import TaskStatus, SprintStatus, ProjectRole, NotificationType

logger = logging.getLogger(__name__)

# Default threshold: 3 or more tasks due within 24 hours triggers project risk alert
PROJECT_RISK_THRESHOLD = 3


def get_project_pms(db: Session, project_id: UUID) -> List[UUID]:
    """Returns user IDs for assigned Project Managers of a project."""
    return list(
        db.scalars(
            select(ProjectMember.user_id).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role == ProjectRole.PROJECT_MANAGER,
            )
        ).all()
    )


def run_deadline_and_risk_checks(
    db: Session,
    now: Optional[datetime] = None,
    risk_threshold: int = PROJECT_RISK_THRESHOLD,
) -> dict:
    """
    Scans incomplete tasks and active sprints for upcoming deadlines, due date reached,
    overdue tasks, and sprint risk alerts.
    
    Strictly adheres to:
    - PostgreSQL persistence.
    - Deterministic deduplication_key uniqueness to prevent duplicate deliveries.
    - Excludes CTO and Super Admin from developer task alerts (notifies assigned devs and PMs).
    - Excludes DONE and CANCELLED tasks from future alerts.
    - One reminder per overdue task per recipient per calendar day.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    date_str = now.strftime("%Y-%m-%d")
    stats = {
        "upcoming_count": 0,
        "due_reached_count": 0,
        "overdue_count": 0,
        "risk_alerts_count": 0,
    }

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Query Incomplete Tasks with a Due Date
    # ─────────────────────────────────────────────────────────────────────────
    tasks = list(
        db.scalars(
            select(Task)
            .options(
                joinedload(Task.project),
                joinedload(Task.assignee),
            )
            .filter(
                Task.status.notin_([TaskStatus.DONE, TaskStatus.CANCELLED]),
                Task.due_date.isnot(None),
            )
        ).all()
    )

    for task in tasks:
        project = task.project
        if not project:
            continue

        company_id = project.company_id
        due = task.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        deep_link = f"/projects/{task.project_id}/board" if task.sprint_id else f"/projects/{task.project_id}/backlog"
        pm_ids = get_project_pms(db, task.project_id)

        # ─── A. Upcoming Deadline (Due within 24 hours) ──────────────────────
        # now <= due <= now + 24 hours
        if now <= due <= (now + timedelta(hours=24)):
            if task.assignee_id:
                dedup = f"TASK_DEADLINE_24H:{task.id}:{task.assignee_id}"
                exists = db.scalar(select(Notification.id).filter(Notification.deduplication_key == dedup))
                if not exists:
                    notif = Notification(
                        recipient_user_id=task.assignee_id,
                        company_id=company_id,
                        project_id=task.project_id,
                        type=NotificationType.TASK_DEADLINE_APPROACHING,
                        title="Task Due Soon",
                        message=f'Your task "{task.title}" is due within 24 hours. Please review the remaining work and update its status.',
                        source_type="TASK",
                        source_id=task.id,
                        deep_link=deep_link,
                        deduplication_key=dedup,
                        is_read=False,
                    )
                    db.add(notif)
                    stats["upcoming_count"] += 1

        # ─── B. Due Date Reached ─────────────────────────────────────────────
        # If due <= now, task has reached its deadline
        if due <= now:
            # 1. Notify Assignee
            if task.assignee_id:
                dedup_assignee = f"TASK_DUE_DATE_REACHED:{task.id}:{task.assignee_id}"
                exists = db.scalar(select(Notification.id).filter(Notification.deduplication_key == dedup_assignee))
                if not exists:
                    notif = Notification(
                        recipient_user_id=task.assignee_id,
                        company_id=company_id,
                        project_id=task.project_id,
                        type=NotificationType.TASK_DUE_DATE_REACHED,
                        title="Task Due Date Reached",
                        message=f'Your task "{task.title}" has reached its due date and remains incomplete.',
                        source_type="TASK",
                        source_id=task.id,
                        deep_link=deep_link,
                        deduplication_key=dedup_assignee,
                        is_read=False,
                    )
                    db.add(notif)
                    stats["due_reached_count"] += 1

            # 2. Notify Project Manager(s)
            assignee_label = (
                f"{task.assignee.first_name} {task.assignee.last_name}"
                if task.assignee
                else "Unassigned"
            )
            for pm_id in pm_ids:
                dedup_pm = f"TASK_DUE_DATE_REACHED:{task.id}:{pm_id}"
                exists = db.scalar(select(Notification.id).filter(Notification.deduplication_key == dedup_pm))
                if not exists:
                    notif = Notification(
                        recipient_user_id=pm_id,
                        company_id=company_id,
                        project_id=task.project_id,
                        type=NotificationType.TASK_DUE_DATE_REACHED,
                        title="Task Due Date Reached",
                        message=f'Task "{task.title}" in {project.name} (assigned to {assignee_label}) has reached its due date and remains incomplete.',
                        source_type="TASK",
                        source_id=task.id,
                        deep_link=deep_link,
                        deduplication_key=dedup_pm,
                        is_read=False,
                    )
                    db.add(notif)
                    stats["due_reached_count"] += 1

        # ─── C. Overdue Task (Due Date Passed, Daily Cadence) ────────────────
        if due < now:
            # 1. Assignee Daily Reminder
            if task.assignee_id:
                dedup_assignee_daily = f"TASK_OVERDUE:{task.id}:{task.assignee_id}:{date_str}"
                exists = db.scalar(select(Notification.id).filter(Notification.deduplication_key == dedup_assignee_daily))
                if not exists:
                    notif = Notification(
                        recipient_user_id=task.assignee_id,
                        company_id=company_id,
                        project_id=task.project_id,
                        type=NotificationType.TASK_OVERDUE,
                        title="Task Overdue",
                        message=f'Your task "{task.title}" is overdue. Please update its status or coordinate a revised deadline with your project manager.',
                        source_type="TASK",
                        source_id=task.id,
                        deep_link=deep_link,
                        deduplication_key=dedup_assignee_daily,
                        is_read=False,
                    )
                    db.add(notif)
                    stats["overdue_count"] += 1

            # 2. PM Daily Reminder
            assignee_label = (
                f"{task.assignee.first_name} {task.assignee.last_name}"
                if task.assignee
                else "Unassigned"
            )
            for pm_id in pm_ids:
                dedup_pm_daily = f"TASK_OVERDUE:{task.id}:{pm_id}:{date_str}"
                exists = db.scalar(select(Notification.id).filter(Notification.deduplication_key == dedup_pm_daily))
                if not exists:
                    notif = Notification(
                        recipient_user_id=pm_id,
                        company_id=company_id,
                        project_id=task.project_id,
                        type=NotificationType.TASK_OVERDUE,
                        title="Task Overdue",
                        message=f'Task "{task.title}" in {project.name} is overdue. It was assigned to {assignee_label} and remains incomplete.',
                        source_type="TASK",
                        source_id=task.id,
                        deep_link=deep_link,
                        deduplication_key=dedup_pm_daily,
                        is_read=False,
                    )
                    db.add(notif)
                    stats["overdue_count"] += 1

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Project-Level Risk Alert (Multiple incomplete tasks due in <= 24h)
    # ─────────────────────────────────────────────────────────────────────────
    active_sprints = list(
        db.scalars(
            select(Sprint)
            .options(joinedload(Sprint.project))
            .filter(Sprint.status == SprintStatus.ACTIVE)
        ).all()
    )

    for sprint in active_sprints:
        project = sprint.project
        if not project:
            continue

        company_id = project.company_id
        # Count incomplete tasks in this sprint due within 24h or already overdue
        sprint_tasks = list(
            db.scalars(
                select(Task).filter(
                    Task.sprint_id == sprint.id,
                    Task.status.notin_([TaskStatus.DONE, TaskStatus.CANCELLED]),
                    Task.due_date.isnot(None),
                )
            ).all()
        )

        critical_tasks = []
        for st in sprint_tasks:
            s_due = st.due_date
            if s_due.tzinfo is None:
                s_due = s_due.replace(tzinfo=timezone.utc)
            if s_due <= (now + timedelta(hours=24)):
                critical_tasks.append(st)

        if len(critical_tasks) >= risk_threshold:
            pm_ids = get_project_pms(db, sprint.project_id)
            for pm_id in pm_ids:
                dedup_risk = f"PROJECT_RISK:{sprint.id}:{pm_id}:{date_str}"
                exists = db.scalar(select(Notification.id).filter(Notification.deduplication_key == dedup_risk))
                if not exists:
                    notif = Notification(
                        recipient_user_id=pm_id,
                        company_id=company_id,
                        project_id=sprint.project_id,
                        type=NotificationType.PROJECT_RISK_ALERT,
                        title="Project Tasks Need Attention",
                        message=f"{len(critical_tasks)} incomplete tasks in {sprint.name} are due within the next 24 hours. Review their progress and identify any blockers.",
                        source_type="SPRINT",
                        source_id=sprint.id,
                        deep_link=f"/projects/{sprint.project_id}/board",
                        deduplication_key=dedup_risk,
                        is_read=False,
                    )
                    db.add(notif)
                    stats["risk_alerts_count"] += 1

    db.commit()
    return stats
