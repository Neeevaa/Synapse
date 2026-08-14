import hashlib
from dataclasses import dataclass
from typing import Optional, Any
from uuid import UUID

from app.models.enums import KnowledgeSourceType
from app.models.requirement import Requirement, RequirementVersion
from app.models.meeting import Meeting, MeetingActionItem
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.sprint import Sprint


@dataclass
class NormalizedArtifact:
    project_id: UUID
    company_id: UUID
    source_type: KnowledgeSourceType
    source_id: UUID
    source_version: Optional[int]
    source_key: Optional[str]
    title: str
    content: str
    content_hash: str
    metadata: dict[str, Any]
    deep_link_url: str


def compute_content_hash(text: str) -> str:
    """Computes SHA-256 hash of normalized text content."""
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


class ArtifactNormalizer:
    @staticmethod
    def normalize_requirement(req: Requirement) -> NormalizedArtifact:
        content_lines = [
            f"# Requirement: {req.requirement_key} - {req.title}",
            f"Type: {req.requirement_type.value}",
            f"Priority: {req.priority.value}",
            f"Status: {req.status.value}",
            f"Source: {req.source.value}",
            f"Current Version: v{req.current_version}",
            "",
            "## Description",
            req.description or "No description provided.",
        ]
        if req.acceptance_criteria:
            content_lines.extend(["", "## Acceptance Criteria", req.acceptance_criteria])

        content = "\n".join(content_lines)
        return NormalizedArtifact(
            project_id=req.project_id,
            company_id=req.company_id,
            source_type=KnowledgeSourceType.REQUIREMENT,
            source_id=req.id,
            source_version=req.current_version,
            source_key=req.requirement_key,
            title=f"{req.requirement_key}: {req.title}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "requirement_key": req.requirement_key,
                "current_version": req.current_version,
                "status": req.status.value,
                "priority": req.priority.value,
            },
            deep_link_url=f"/projects/{req.project_id}/requirements",
        )

    @staticmethod
    def normalize_requirement_version(ver: RequirementVersion, req_key: str, project_id: UUID, company_id: UUID) -> NormalizedArtifact:
        content_lines = [
            f"# Requirement Version Snapshot: {req_key} (Version {ver.version_number})",
            f"Title: {ver.title}",
            f"Type: {ver.requirement_type.value}",
            f"Priority: {ver.priority.value}",
            f"Status: {ver.status.value}",
            f"Source: {ver.source.value}",
            f"Change Summary: {ver.change_summary or 'No change summary'}",
            "",
            "## Historical Description",
            ver.description or "No description provided.",
        ]
        if ver.acceptance_criteria:
            content_lines.extend(["", "## Historical Acceptance Criteria", ver.acceptance_criteria])

        content = "\n".join(content_lines)
        return NormalizedArtifact(
            project_id=project_id,
            company_id=company_id,
            source_type=KnowledgeSourceType.REQUIREMENT_VERSION,
            source_id=ver.id,
            source_version=ver.version_number,
            source_key=f"{req_key}-v{ver.version_number}",
            title=f"{req_key} (v{ver.version_number}): {ver.title}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "requirement_id": str(ver.requirement_id),
                "requirement_key": req_key,
                "version_number": ver.version_number,
                "change_summary": ver.change_summary,
            },
            deep_link_url=f"/projects/{project_id}/requirements",
        )

    @staticmethod
    def normalize_meeting_notes(m: Meeting) -> NormalizedArtifact:
        organizer_name = f"{m.organizer.first_name} {m.organizer.last_name}" if m.organizer else "Organizer"
        content_lines = [
            f"# Meeting Notes: {m.title}",
            f"Meeting Type: {m.meeting_type.value}",
            f"Status: {m.status.value}",
            f"Scheduled Date: {m.scheduled_at.isoformat() if m.scheduled_at else 'TBD'}",
            f"Duration: {m.duration_minutes} minutes",
            f"Organizer: {organizer_name}",
            "",
        ]

        if m.summary:
            content_lines.extend(["## Summary", m.summary, ""])
        if m.decisions:
            content_lines.extend(["## Decisions Made", m.decisions, ""])
        if m.discussion_notes:
            content_lines.extend(["## Discussion Notes", m.discussion_notes, ""])
        if m.risks_concerns:
            content_lines.extend(["## Risks & Concerns", m.risks_concerns, ""])

        content = "\n".join(content_lines)
        source_key = f"MTG-{m.title[:20]}"
        return NormalizedArtifact(
            project_id=m.project_id,
            company_id=m.company_id,
            source_type=KnowledgeSourceType.MEETING_NOTE,
            source_id=m.id,
            source_version=None,
            source_key=source_key,
            title=f"Meeting Notes: {m.title}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "meeting_type": m.meeting_type.value,
                "status": m.status.value,
                "organizer_name": organizer_name,
            },
            deep_link_url=f"/projects/{m.project_id}/meetings/{m.id}",
        )

    @staticmethod
    def normalize_meeting_transcript(m: Meeting) -> NormalizedArtifact:
        content_lines = [
            f"# Source Meeting Transcript: {m.title}",
            f"Recording Reference: {m.recording_url_or_reference or 'None'}",
            f"Transcript Updated At: {m.transcript_updated_at.isoformat() if m.transcript_updated_at else 'N/A'}",
            "",
            "## Source Transcript",
            m.transcript or "",
        ]
        content = "\n".join(content_lines)
        source_key = f"TRNS-{m.title[:20]}"
        return NormalizedArtifact(
            project_id=m.project_id,
            company_id=m.company_id,
            source_type=KnowledgeSourceType.MEETING_TRANSCRIPT,
            source_id=m.id,
            source_version=None,
            source_key=source_key,
            title=f"Source Transcript: {m.title}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "recording_url": m.recording_url_or_reference,
            },
            deep_link_url=f"/projects/{m.project_id}/meetings/{m.id}",
        )

    @staticmethod
    def normalize_meeting_action_item(ai: MeetingActionItem, project_id: UUID, company_id: UUID) -> NormalizedArtifact:
        assignee_name = f"{ai.assignee.first_name} {ai.assignee.last_name}" if ai.assignee else "Unassigned"
        req_key = ai.requirement.requirement_key if ai.requirement else None
        task_title = ai.task.title if ai.task else None

        content_lines = [
            f"# Meeting Action Item: {ai.title}",
            f"Status: {ai.status.value}",
            f"Priority: {ai.priority.value}",
            f"Assignee: {assignee_name}",
            f"Due Date: {ai.due_date.isoformat() if ai.due_date else 'No due date'}",
            f"Linked Requirement: {req_key or 'None'}",
            f"Linked Task: {task_title or 'None'}",
            "",
            "## Description",
            ai.description or "No description provided.",
        ]
        content = "\n".join(content_lines)
        source_key = f"ACT-{ai.title[:20]}"
        return NormalizedArtifact(
            project_id=project_id,
            company_id=company_id,
            source_type=KnowledgeSourceType.MEETING_ACTION_ITEM,
            source_id=ai.id,
            source_version=None,
            source_key=source_key,
            title=f"Action Item: {ai.title}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "status": ai.status.value,
                "priority": ai.priority.value,
                "requirement_key": req_key,
                "task_title": task_title,
            },
            deep_link_url=f"/projects/{project_id}/meetings/{ai.meeting_id}",
        )

    @staticmethod
    def normalize_task(task: Task, company_id: UUID) -> NormalizedArtifact:
        content_lines = [
            f"# Task: {task.title}",
            f"Status: {task.status.value}",
            f"Priority: {task.priority.value}",
            f"Sprint ID: {task.sprint_id or 'Backlog'}",
            "",
            "## Description",
            task.description or "No description provided.",
        ]
        content = "\n".join(content_lines)
        source_key = f"TASK-{task.title[:20]}"
        return NormalizedArtifact(
            project_id=task.project_id,
            company_id=company_id,
            source_type=KnowledgeSourceType.TASK,
            source_id=task.id,
            source_version=None,
            source_key=source_key,
            title=f"Task: {task.title}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "status": task.status.value,
                "priority": task.priority.value,
            },
            deep_link_url=f"/projects/{task.project_id}/board",
        )

    @staticmethod
    def normalize_sprint(sprint: Sprint, company_id: UUID) -> NormalizedArtifact:
        content_lines = [
            f"# Sprint: {sprint.name}",
            f"Status: {sprint.status.value}",
            f"Capacity: {sprint.capacity or 'Unspecified'} story points",
            f"Dates: {sprint.start_date.isoformat() if sprint.start_date else 'TBD'} to {sprint.end_date.isoformat() if sprint.end_date else 'TBD'}",
            "",
            "## Sprint Goal",
            sprint.goal or "No sprint goal defined.",
        ]
        content = "\n".join(content_lines)
        source_key = f"SPRINT-{sprint.name[:20]}"
        return NormalizedArtifact(
            project_id=sprint.project_id,
            company_id=company_id,
            source_type=KnowledgeSourceType.SPRINT,
            source_id=sprint.id,
            source_version=None,
            source_key=source_key,
            title=f"Sprint: {sprint.name}",
            content=content,
            content_hash=compute_content_hash(content),
            metadata={
                "status": sprint.status.value,
                "capacity": sprint.capacity,
            },
            deep_link_url=f"/projects/{sprint.project_id}/sprints",
        )
