from enum import Enum


class SubscriptionPlan(str, Enum):
    FREE = "FREE"
    STARTER = "STARTER"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class CompanyStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"
    DEACTIVATED = "DEACTIVATED"


class InvitationStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class CompanyRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"


class ProjectRole(str, Enum):
    PROJECT_MANAGER = "PROJECT_MANAGER"
    TEAM_LEAD = "TEAM_LEAD"
    DEVELOPER = "DEVELOPER"
    VIEWER = "VIEWER"


class Specialization(str, Enum):
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    AI_ML = "AI_ML"
    QA_TESTING = "QA_TESTING"
    DEVOPS = "DEVOPS"
    DESIGN = "DESIGN"
    OTHER = "OTHER"


LEGACY_ROLE_TO_SPECIALIZATION = {
    "BACKEND_DEVELOPER": "BACKEND",
    "FRONTEND_DEVELOPER": "FRONTEND",
    "AI_ENGINEER": "AI_ML",
    "UI_UX_DESIGNER": "DESIGN",
    "QA_ENGINEER": "QA_TESTING",
    "DEVOPS_ENGINEER": "DEVOPS",
}


class ProjectStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TaskWorkstream(str, Enum):
    UI_UX = "UI_UX"
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    QA = "QA"
    DEVOPS = "DEVOPS"
    AI_ML = "AI_ML"
    GENERAL = "GENERAL"



class SprintStatus(str, Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class AIJobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RequirementType(str, Enum):
    FUNCTIONAL = "FUNCTIONAL"
    NON_FUNCTIONAL = "NON_FUNCTIONAL"
    USER_STORY = "USER_STORY"


class RequirementStatus(str, Enum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


class RequirementPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class RequirementSource(str, Enum):
    SRS = "SRS"
    USER_STORY = "USER_STORY"
    MEETING = "MEETING"
    MANUAL_ENTRY = "MANUAL_ENTRY"
    IMPORTED_DOCUMENT = "IMPORTED_DOCUMENT"
    OTHER = "OTHER"


class MeetingType(str, Enum):
    PLANNING = "PLANNING"
    STANDUP = "STANDUP"
    REVIEW = "REVIEW"
    RETROSPECTIVE = "RETROSPECTIVE"
    REQUIREMENT_DISCUSSION = "REQUIREMENT_DISCUSSION"
    TECHNICAL = "TECHNICAL"
    CLIENT = "CLIENT"
    OTHER = "OTHER"


class MeetingStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AttendanceStatus(str, Enum):
    INVITED = "INVITED"
    ATTENDED = "ATTENDED"
    ABSENT = "ABSENT"
    DECLINED = "DECLINED"


class ActionItemStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ActionItemPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class KnowledgeSourceType(str, Enum):
    REQUIREMENT = "REQUIREMENT"
    REQUIREMENT_VERSION = "REQUIREMENT_VERSION"
    MEETING_NOTE = "MEETING_NOTE"
    MEETING_TRANSCRIPT = "MEETING_TRANSCRIPT"
    MEETING_ACTION_ITEM = "MEETING_ACTION_ITEM"
    TASK = "TASK"
    TASK_COMMENT = "TASK_COMMENT"
    SPRINT = "SPRINT"
    DOCUMENTATION = "DOCUMENTATION"


class RequirementReviewStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ReviewIssueType(str, Enum):
    AMBIGUITY = "AMBIGUITY"
    INCOMPLETENESS = "INCOMPLETENESS"
    INCONSISTENCY = "INCONSISTENCY"
    CONFLICT = "CONFLICT"
    MISSING_ACCEPTANCE_CRITERIA = "MISSING_ACCEPTANCE_CRITERIA"
    MISSING_EDGE_CASE = "MISSING_EDGE_CASE"
    UNCLEAR_ACTOR = "UNCLEAR_ACTOR"
    UNCLEAR_BEHAVIOR = "UNCLEAR_BEHAVIOR"
    TESTABILITY = "TESTABILITY"
    OTHER = "OTHER"


class ReviewSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingEvidenceStatus(str, Enum):
    GROUNDED = "GROUNDED"
    INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT"


class FindingHumanDecision(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    MODIFIED = "MODIFIED"


class EvaluationCondition(str, Enum):
    LLM_ONLY = "LLM_ONLY"
    RAG_LLM = "RAG_LLM"
    RAG_LLM_HUMAN = "RAG_LLM_HUMAN"


class EvaluationCaseType(str, Enum):
    CONTEXT_RICH = "CONTEXT_RICH"
    CONTEXT_POOR = "CONTEXT_POOR"



