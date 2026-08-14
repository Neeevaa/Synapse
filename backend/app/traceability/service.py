from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.requirement import Requirement
from app.models.meeting import Meeting, MeetingActionItem
from app.models.task import Task
from app.models.sprint import Sprint
from app.models.user import User
from app.permissions.dependencies import check_project_role_or_company_admin
from app.common.exceptions import ResourceNotFound
from app.traceability.schemas import (
    LinkedRequirementSummary,
    LinkedMeetingSummary,
    LinkedTaskSummary,
    LinkedSprintSummary,
    LinkedActionItemSummary,
    RequirementTraceabilityResponse,
    MeetingTraceabilityResponse,
    TaskTraceabilityResponse,
    ProjectTraceabilityNode,
    ProjectTraceabilityGraphResponse,
)


class TraceabilityService:
    def __init__(self, db: Session):
        self.db = db

    def get_requirement_traceability(
        self, project_id: UUID, requirement_id: UUID, current_user: User
    ) -> RequirementTraceabilityResponse:
        check_project_role_or_company_admin(self.db, current_user, project_id)

        req = self.db.execute(
            select(Requirement).filter(
                Requirement.id == requirement_id, Requirement.project_id == project_id
            )
        ).scalar_one_or_none()
        if not req:
            raise ResourceNotFound("Requirement not found.")

        # Action items linked to requirement
        action_items = list(
            self.db.execute(
                select(MeetingActionItem).filter(MeetingActionItem.requirement_id == requirement_id)
            ).scalars().all()
        )

        meeting_ids = {ai.meeting_id for ai in action_items if ai.meeting_id}
        task_ids = {ai.task_id for ai in action_items if ai.task_id}

        # Meetings linked via action items
        meetings = []
        if meeting_ids:
            meetings = list(
                self.db.execute(
                    select(Meeting).filter(Meeting.id.in_(meeting_ids), Meeting.project_id == project_id)
                ).scalars().all()
            )

        # Tasks linked via action items or requirement
        tasks = []
        if task_ids:
            tasks = list(
                self.db.execute(
                    select(Task).filter(Task.id.in_(task_ids), Task.project_id == project_id)
                ).scalars().all()
            )

        sprint_ids = {t.sprint_id for t in tasks if t.sprint_id}
        sprints = []
        if sprint_ids:
            sprints = list(
                self.db.execute(
                    select(Sprint).filter(Sprint.id.in_(sprint_ids), Sprint.project_id == project_id)
                ).scalars().all()
            )

        req_summary = LinkedRequirementSummary(
            id=req.id,
            requirement_key=req.requirement_key,
            title=req.title,
            requirement_type=req.requirement_type.value if hasattr(req.requirement_type, "value") else str(req.requirement_type),
            status=req.status.value if hasattr(req.status, "value") else str(req.status),
            priority=req.priority.value if hasattr(req.priority, "value") else str(req.priority),
        )

        return RequirementTraceabilityResponse(
            requirement=req_summary,
            linked_tasks=[
                LinkedTaskSummary(
                    id=t.id,
                    title=t.title,
                    status=t.status.value if hasattr(t.status, "value") else str(t.status),
                    priority=t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                    workstream=t.workstream.value if hasattr(t.workstream, "value") else (str(t.workstream) if t.workstream else None),
                    story_points=t.story_points,
                    sprint_id=t.sprint_id,
                )
                for t in tasks
            ],
            linked_meetings=[
                LinkedMeetingSummary(
                    id=m.id,
                    title=m.title,
                    meeting_type=m.meeting_type.value if hasattr(m.meeting_type, "value") else str(m.meeting_type),
                    scheduled_at=m.scheduled_at,
                    status=m.status.value if hasattr(m.status, "value") else str(m.status),
                )
                for m in meetings
            ],
            linked_action_items=[
                LinkedActionItemSummary(
                    id=ai.id,
                    meeting_id=ai.meeting_id,
                    title=ai.title,
                    status=ai.status.value if hasattr(ai.status, "value") else str(ai.status),
                    assigned_to=ai.assigned_to,
                    requirement_id=ai.requirement_id,
                    task_id=ai.task_id,
                )
                for ai in action_items
            ],
            linked_sprints=[
                LinkedSprintSummary(
                    id=s.id,
                    name=s.name,
                    status=s.status.value if hasattr(s.status, "value") else str(s.status),
                )
                for s in sprints
            ],
        )

    def get_meeting_traceability(
        self, project_id: UUID, meeting_id: UUID, current_user: User
    ) -> MeetingTraceabilityResponse:
        check_project_role_or_company_admin(self.db, current_user, project_id)

        meeting = self.db.execute(
            select(Meeting).filter(
                Meeting.id == meeting_id, Meeting.project_id == project_id
            )
        ).scalar_one_or_none()
        if not meeting:
            raise ResourceNotFound("Meeting not found.")

        action_items = meeting.action_items or []

        req_ids = {ai.requirement_id for ai in action_items if ai.requirement_id}
        task_ids = {ai.task_id for ai in action_items if ai.task_id}

        requirements = []
        if req_ids:
            requirements = list(
                self.db.execute(
                    select(Requirement).filter(Requirement.id.in_(req_ids), Requirement.project_id == project_id)
                ).scalars().all()
            )

        tasks = []
        if task_ids:
            tasks = list(
                self.db.execute(
                    select(Task).filter(Task.id.in_(task_ids), Task.project_id == project_id)
                ).scalars().all()
            )

        meeting_summary = LinkedMeetingSummary(
            id=meeting.id,
            title=meeting.title,
            meeting_type=meeting.meeting_type.value if hasattr(meeting.meeting_type, "value") else str(meeting.meeting_type),
            scheduled_at=meeting.scheduled_at,
            status=meeting.status.value if hasattr(meeting.status, "value") else str(meeting.status),
        )

        return MeetingTraceabilityResponse(
            meeting=meeting_summary,
            linked_action_items=[
                LinkedActionItemSummary(
                    id=ai.id,
                    meeting_id=ai.meeting_id,
                    title=ai.title,
                    status=ai.status.value if hasattr(ai.status, "value") else str(ai.status),
                    assigned_to=ai.assigned_to,
                    requirement_id=ai.requirement_id,
                    task_id=ai.task_id,
                )
                for ai in action_items
            ],
            linked_requirements=[
                LinkedRequirementSummary(
                    id=r.id,
                    requirement_key=r.requirement_key,
                    title=r.title,
                    requirement_type=r.requirement_type.value if hasattr(r.requirement_type, "value") else str(r.requirement_type),
                    status=r.status.value if hasattr(r.status, "value") else str(r.status),
                    priority=r.priority.value if hasattr(r.priority, "value") else str(r.priority),
                )
                for r in requirements
            ],
            linked_tasks=[
                LinkedTaskSummary(
                    id=t.id,
                    title=t.title,
                    status=t.status.value if hasattr(t.status, "value") else str(t.status),
                    priority=t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                    workstream=t.workstream.value if hasattr(t.workstream, "value") else (str(t.workstream) if t.workstream else None),
                    story_points=t.story_points,
                    sprint_id=t.sprint_id,
                )
                for t in tasks
            ],
        )

    def get_task_traceability(
        self, project_id: UUID, task_id: UUID, current_user: User
    ) -> TaskTraceabilityResponse:
        check_project_role_or_company_admin(self.db, current_user, project_id)

        task = self.db.execute(
            select(Task).filter(Task.id == task_id, Task.project_id == project_id)
        ).scalar_one_or_none()
        if not task:
            raise ResourceNotFound("Task not found.")

        # Action items pointing to task
        action_items = list(
            self.db.execute(
                select(MeetingActionItem).filter(MeetingActionItem.task_id == task_id)
            ).scalars().all()
        )

        meeting_ids = {ai.meeting_id for ai in action_items if ai.meeting_id}
        req_ids = {ai.requirement_id for ai in action_items if ai.requirement_id}

        meetings = []
        if meeting_ids:
            meetings = list(
                self.db.execute(
                    select(Meeting).filter(Meeting.id.in_(meeting_ids), Meeting.project_id == project_id)
                ).scalars().all()
            )

        linked_req = None
        if req_ids:
            r = self.db.execute(
                select(Requirement).filter(Requirement.id.in_(req_ids), Requirement.project_id == project_id)
            ).scalars().first()
            if r:
                linked_req = LinkedRequirementSummary(
                    id=r.id,
                    requirement_key=r.requirement_key,
                    title=r.title,
                    requirement_type=r.requirement_type.value if hasattr(r.requirement_type, "value") else str(r.requirement_type),
                    status=r.status.value if hasattr(r.status, "value") else str(r.status),
                    priority=r.priority.value if hasattr(r.priority, "value") else str(r.priority),
                )

        linked_sprint = None
        if task.sprint_id:
            s = self.db.execute(
                select(Sprint).filter(Sprint.id == task.sprint_id, Sprint.project_id == project_id)
            ).scalar_one_or_none()
            if s:
                linked_sprint = LinkedSprintSummary(
                    id=s.id,
                    name=s.name,
                    status=s.status.value if hasattr(s.status, "value") else str(s.status),
                )

        task_summary = LinkedTaskSummary(
            id=task.id,
            title=task.title,
            status=task.status.value if hasattr(task.status, "value") else str(task.status),
            priority=task.priority.value if hasattr(task.priority, "value") else str(task.priority),
            workstream=task.workstream.value if hasattr(task.workstream, "value") else (str(task.workstream) if task.workstream else None),
            story_points=task.story_points,
            sprint_id=task.sprint_id,
        )

        return TaskTraceabilityResponse(
            task=task_summary,
            linked_requirement=linked_req,
            linked_sprint=linked_sprint,
            linked_meetings=[
                LinkedMeetingSummary(
                    id=m.id,
                    title=m.title,
                    meeting_type=m.meeting_type.value if hasattr(m.meeting_type, "value") else str(m.meeting_type),
                    scheduled_at=m.scheduled_at,
                    status=m.status.value if hasattr(m.status, "value") else str(m.status),
                )
                for m in meetings
            ],
            linked_action_items=[
                LinkedActionItemSummary(
                    id=ai.id,
                    meeting_id=ai.meeting_id,
                    title=ai.title,
                    status=ai.status.value if hasattr(ai.status, "value") else str(ai.status),
                    assigned_to=ai.assigned_to,
                    requirement_id=ai.requirement_id,
                    task_id=ai.task_id,
                )
                for ai in action_items
            ],
        )

    def get_project_traceability_graph(
        self, project_id: UUID, current_user: User
    ) -> ProjectTraceabilityGraphResponse:
        check_project_role_or_company_admin(self.db, current_user, project_id)

        reqs = list(
            self.db.execute(
                select(Requirement).filter(Requirement.project_id == project_id)
            ).scalars().all()
        )
        total_meetings = self.db.scalar(
            select(func.count(Meeting.id)).filter(Meeting.project_id == project_id)
        ) or 0
        total_tasks = self.db.scalar(
            select(func.count(Task.id)).filter(Task.project_id == project_id)
        ) or 0

        nodes = []
        for r in reqs:
            ais = list(
                self.db.execute(
                    select(MeetingActionItem).filter(MeetingActionItem.requirement_id == r.id)
                ).scalars().all()
            )
            tasks_cnt = sum(1 for ai in ais if ai.task_id)
            meetings_cnt = len({ai.meeting_id for ai in ais if ai.meeting_id})

            nodes.append(
                ProjectTraceabilityNode(
                    requirement_id=r.id,
                    requirement_key=r.requirement_key,
                    requirement_title=r.title,
                    tasks_count=tasks_cnt,
                    meetings_count=meetings_cnt,
                    action_items_count=len(ais),
                )
            )

        return ProjectTraceabilityGraphResponse(
            project_id=project_id,
            total_requirements=len(reqs),
            total_meetings=total_meetings,
            total_tasks=total_tasks,
            nodes=nodes,
        )
