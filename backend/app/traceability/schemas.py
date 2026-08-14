from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class LinkedRequirementSummary(BaseModel):
    id: UUID
    requirement_key: str
    title: str
    requirement_type: str
    status: str
    priority: str


class LinkedMeetingSummary(BaseModel):
    id: UUID
    title: str
    meeting_type: str
    scheduled_at: datetime
    status: str


class LinkedTaskSummary(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str
    workstream: str | None = None
    story_points: int | None = None
    sprint_id: UUID | None = None


class LinkedSprintSummary(BaseModel):
    id: UUID
    name: str
    status: str


class LinkedActionItemSummary(BaseModel):
    id: UUID
    meeting_id: UUID
    title: str
    status: str
    assigned_to: UUID | None = None
    requirement_id: UUID | None = None
    task_id: UUID | None = None


class RequirementTraceabilityResponse(BaseModel):
    requirement: LinkedRequirementSummary
    linked_tasks: list[LinkedTaskSummary]
    linked_meetings: list[LinkedMeetingSummary]
    linked_action_items: list[LinkedActionItemSummary]
    linked_sprints: list[LinkedSprintSummary]


class MeetingTraceabilityResponse(BaseModel):
    meeting: LinkedMeetingSummary
    linked_action_items: list[LinkedActionItemSummary]
    linked_requirements: list[LinkedRequirementSummary]
    linked_tasks: list[LinkedTaskSummary]


class TaskTraceabilityResponse(BaseModel):
    task: LinkedTaskSummary
    linked_requirement: LinkedRequirementSummary | None = None
    linked_sprint: LinkedSprintSummary | None = None
    linked_meetings: list[LinkedMeetingSummary]
    linked_action_items: list[LinkedActionItemSummary]


class ProjectTraceabilityNode(BaseModel):
    requirement_id: UUID
    requirement_key: str
    requirement_title: str
    tasks_count: int
    meetings_count: int
    action_items_count: int


class ProjectTraceabilityGraphResponse(BaseModel):
    project_id: UUID
    total_requirements: int
    total_meetings: int
    total_tasks: int
    nodes: list[ProjectTraceabilityNode]
