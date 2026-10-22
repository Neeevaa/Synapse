export type ImplementationStatus = "implemented" | "partially_implemented" | "planned";

export interface SynapseFeature {
  id: string;
  name: string;
  shortName: string;
  oneLiner: string;
  status: ImplementationStatus;
  statusLabel: string;
  statusEvidence: string;
  iconName: string;
  category: "AI Core" | "Agile Lifecycle" | "Knowledge & Intelligence" | "Predictive Analytics";
  problem: string;
  howSynapseHelps: string[];
  practicalBenefit: string;
  connectedFeatureIds: string[];
  ctaText: string;
  ctaHref: string;
}

export const SYNAPSE_FEATURES: SynapseFeature[] = [
  {
    id: "ai-requirement-checker",
    name: "AI Requirement Checker",
    shortName: "Requirement Audit",
    oneLiner: "Automated audit of specifications against project context to catch ambiguities, contradictions, and missing criteria before development.",
    status: "implemented",
    statusLabel: "Implemented",
    statusEvidence: "Verified in backend app/requirements/review_service.py and REQUIREMENT_REVIEW_PROMPT_V1 with RAG context grounding and human review workflow.",
    iconName: "FileCheck2",
    category: "AI Core",
    problem: "Software requirements are frequently vague, incomplete, ambiguous, or inconsistent with prior sprint commitments, leading to misinterpretation, wasted engineering cycles, and expensive post-release rework.",
    howSynapseHelps: [
      "A target requirement revision is submitted for review through the project workspace.",
      "The system retrieves relevant contextual project knowledge (past requirements, versions, meeting transcripts, and tasks) via vector similarity search.",
      "Synapse's review model evaluates the requirement across 9 critical dimensions: Ambiguity, Incompleteness, Inconsistency, Conflicts, Missing Acceptance Criteria, Edge Cases, Unclear Actors, Unclear Behavior, and Testability.",
      "Findings are grounded with exact citations ([SOURCE: REQ-...] or [SOURCE: MTG-...]), assigned severity levels (Critical, High, Medium, Low), and paired with concrete recommendations.",
      "Engineers and product managers review the structured findings in a human-in-the-loop workflow, deciding whether to accept, modify, or dismiss each observation."
    ],
    practicalBenefit: "Catches specification defects at the earliest stage of development, preventing requirement-driven sprint rollbacks and misalignment.",
    connectedFeatureIds: ["ai-test-case-generator", "traceability-impact", "rag-knowledge-base", "meeting-intelligence"],
    ctaText: "Explore Requirements Workflow",
    ctaHref: "/projects",
  },
  {
    id: "ai-test-case-generator",
    name: "AI Test Case Generator",
    shortName: "Test Case AI",
    oneLiner: "Derives structured, multi-scenario test suites directly from validated requirements and acceptance criteria.",
    status: "implemented",
    statusLabel: "Implemented",
    statusEvidence: "Verified in backend app/testcases/service.py and AI_TEST_CASE_GENERATOR_PROMPT_V1 with Functional, Negative, Boundary, and Acceptance suite generation.",
    iconName: "TestTube2",
    category: "AI Core",
    problem: "Authoring manual test cases for complex requirements is time-consuming and inconsistent. Edge cases, authorization limits, and negative failure modes are frequently overlooked until bugs reach staging.",
    howSynapseHelps: [
      "Reads the validated requirement description, requirement type, priority, and acceptance criteria.",
      "Injects retrieved project context (prior requirement patterns, meeting decisions, and architecture constraints) to make test preconditions concrete.",
      "Generates 4 to 8 focused, high-value test cases systematically organized into Functional, Negative, Boundary, and Acceptance categories.",
      "Each generated case includes prerequisites, numbered step-by-step actions, realistic input payloads, and explicit expected outcomes.",
      "QA engineers review the generated suite in DRAFT status, approving or rejecting cases before adding them to test runs."
    ],
    practicalBenefit: "Accelerates QA test coverage from days to seconds while systematically validating critical boundary conditions.",
    connectedFeatureIds: ["ai-requirement-checker", "traceability-impact", "sprints-tasks"],
    ctaText: "Explore QA Test Cases",
    ctaHref: "/projects",
  },
  {
    id: "meeting-intelligence",
    name: "Meeting Intelligence",
    shortName: "Meeting AI",
    oneLiner: "Extracts grounded decisions, risks, action items, and software engineering tasks from team meeting transcripts.",
    status: "implemented",
    statusLabel: "Implemented",
    statusEvidence: "Verified in backend app/meetings/intelligence_service.py and MEETING_INTELLIGENCE_PROMPT_V1 with human decision review and backlog task conversion.",
    iconName: "MessageSquareCode",
    category: "Knowledge & Intelligence",
    problem: "Important architectural decisions, agreed deadlines, and individual commitments get lost in hours of recorded discussions and unstructured call transcripts.",
    howSynapseHelps: [
      "Processes uploaded or recorded meeting transcripts against existing project context.",
      "Generates an executive summary, catalog of explicit consensus decisions, and identified technical or timeline risks.",
      "Extracts concrete action items with assigned team members and suggested completion dates.",
      "Suggests structured software engineering tasks tagged with workstreams (Frontend, Backend, QA, DevOps) and story-point estimates.",
      "Team leads review suggestions in an interactive review panel, accepting, modifying, or rejecting them before they convert into real project tasks."
    ],
    practicalBenefit: "Converts spoken conversations into structured backlog items without manual transcription or lost action items.",
    connectedFeatureIds: ["sprints-tasks", "rag-knowledge-base", "traceability-impact", "ai-requirement-checker"],
    ctaText: "Inspect Meeting Intelligence",
    ctaHref: "/projects",
  },
  {
    id: "rag-knowledge-base",
    name: "RAG Semantic Search & Knowledge Base",
    shortName: "Knowledge Base",
    oneLiner: "Vector-powered semantic retrieval and contextual grounding across all project documents, discussions, and requirements.",
    status: "implemented",
    statusLabel: "Implemented",
    statusEvidence: "Verified in backend app/knowledge/service.py, provider.py, and chunker.py with multi-tenant company and project isolation.",
    iconName: "Database",
    category: "Knowledge & Intelligence",
    problem: "Project knowledge is fragmented across disparate documents, requirements, and meeting notes, making relevant information hard to locate through simple keyword matching.",
    howSynapseHelps: [
      "Normalizes and chunks project artifacts including requirements, versions, meeting transcripts, action items, and task comments.",
      "Generates vector embeddings and indexes them within strict multi-tenant project and company boundaries.",
      "Executes cosine similarity search to retrieve contextually relevant excerpts even when user queries use different terminology.",
      "Constructs formatted prompt context windows with traceable [SOURCE: ...] headers and maintains telemetry logs for auditable retrieval."
    ],
    practicalBenefit: "Eliminates information silos and ensures AI responses are grounded strictly in real project facts rather than model hallucination.",
    connectedFeatureIds: ["ai-requirement-checker", "meeting-intelligence", "traceability-impact", "delay-diagnostics"],
    ctaText: "Search Project Knowledge",
    ctaHref: "/projects",
  },
  {
    id: "traceability-impact",
    name: "Lifecycle Traceability & Impact Analysis",
    shortName: "Traceability",
    oneLiner: "Multi-directional graph mapping relationships across requirements, meeting decisions, tasks, and sprint deliverables.",
    status: "implemented",
    statusLabel: "Implemented",
    statusEvidence: "Verified in backend app/traceability/service.py and ProjectTraceabilityGraphResponse mapping Requirements <-> Action Items <-> Tasks <-> Sprints.",
    iconName: "GitBranch",
    category: "Agile Lifecycle",
    problem: "Modifying a requirement or delaying a task causes ripple effects across connected workstreams that remain invisible until release deadlines are missed.",
    howSynapseHelps: [
      "Maintains bi-directional linkages between requirements, meeting action items, tasks, and sprint deliverables.",
      "Enables upstream traceability (which meeting decision created this requirement?) and downstream impact analysis (which tasks and test cases depend on it?).",
      "Calculates project-level traceability coverage graphs, highlighting requirements lacking implementation tasks or verified test suites.",
      "Provides visual graph summaries showing the exact blast radius when a specification change is proposed."
    ],
    practicalBenefit: "Prevents orphaned requirements and gives teams total visibility into the downstream impact of scope changes.",
    connectedFeatureIds: ["ai-requirement-checker", "ai-test-case-generator", "sprints-tasks", "delay-diagnostics"],
    ctaText: "View Traceability Matrix",
    ctaHref: "/projects",
  },
  {
    id: "sprints-tasks",
    name: "Agile Boards, Sprints & Team Coordination",
    shortName: "Sprints & Boards",
    oneLiner: "Comprehensive agile execution workspace combining Kanban boards, sprint lifecycles, and role-based permissions.",
    status: "implemented",
    statusLabel: "Implemented",
    statusEvidence: "Verified in backend app/projects/, app/sprints/, app/tasks/, and frontend Kanban board and sprint management interfaces.",
    iconName: "Kanban",
    category: "Agile Lifecycle",
    problem: "Using isolated AI tools detached from real issue trackers creates copy-paste friction and leaves backlog execution out of sync with intelligence insights.",
    howSynapseHelps: [
      "Provides interactive Kanban boards with fluid status transitions (Backlog, Todo, In Progress, In Review, Done).",
      "Supports sprint planning, capacity tracking, story point estimations, and milestone date management.",
      "Enforces role-based permissions for Company Owners, Admins, Project Managers, Team Leads, Developers, and Viewers.",
      "Directly receives approved tasks from Meeting Intelligence and Requirement reviews into active sprint backlogs without manual data entry."
    ],
    practicalBenefit: "Unifies modern agile project management with native, contextual AI assistance in a single high-performance workspace.",
    connectedFeatureIds: ["meeting-intelligence", "traceability-impact", "sprint-summary", "delay-diagnostics"],
    ctaText: "Open Project Boards",
    ctaHref: "/projects",
  },
  {
    id: "delay-diagnostics",
    name: "Contextual Delay Diagnostics",
    shortName: "Delay Diagnostics",
    oneLiner: "Heuristic and context-driven bottleneck identification interpreting why tasks stall and where schedules face risk.",
    status: "partially_implemented",
    statusLabel: "Partially Implemented",
    statusEvidence: "Verified in backend app/dashboard/service.py (overdue/urgent task detection and sprint health scoring) and core plan entitlements; ML root-cause diagnostics in development.",
    iconName: "AlertTriangle",
    category: "Predictive Analytics",
    problem: "Teams often discover schedule slippage after deadlines have already passed, without understanding the root causes behind stalled workstreams.",
    howSynapseHelps: [
      "Continuously monitors task cycle times, active sprint progress percentages, and lingering in-progress items.",
      "Detects urgent tasks remaining in TODO or IN_PROGRESS states as sprint completion deadlines approach.",
      "Correlates delay indicators with linked requirement complexity, pending meeting action items, and task dependencies.",
      "Distinguishes between genuine execution blockers, scope additions, and capacity constraints to assist team leads in triage."
    ],
    practicalBenefit: "Surfaces early schedule friction while there is still time in the sprint cycle to realign resources or adjust scope.",
    connectedFeatureIds: ["sprints-tasks", "traceability-impact", "sprint-summary", "velocity-analytics"],
    ctaText: "Check Dashboard Telemetry",
    ctaHref: "/dashboard",
  },
  {
    id: "sprint-summary",
    name: "Sprint Summary Generator",
    shortName: "Sprint Summaries",
    oneLiner: "Aggregates sprint throughput, completed deliverables, and outstanding blockers into readable executive updates.",
    status: "partially_implemented",
    statusLabel: "Partially Implemented",
    statusEvidence: "Verified in backend app/dashboard/service.py sprint progress aggregation, story point tallies, and AI job queue definitions; narrative generation in active rollout.",
    iconName: "FileText",
    category: "Agile Lifecycle",
    problem: "Preparing sprint retrospective reports and executive progress updates manually consumes hours of valuable team lead time every sprint.",
    howSynapseHelps: [
      "Aggregates completed story points, tasks closed, and remaining work from the active sprint database.",
      "Tallies velocity metrics, workstream distribution, and unfinished tasks carried over across sprints.",
      "Synthesizes structured sprint health indicators and progress percentages for quick executive review.",
      "Formats clean summary updates ready for stakeholder demonstrations and retrospectives."
    ],
    practicalBenefit: "Eliminates repetitive status-report generation and keeps leadership aligned with real-time sprint data.",
    connectedFeatureIds: ["sprints-tasks", "delay-diagnostics", "velocity-analytics"],
    ctaText: "Inspect Sprint Tracking",
    ctaHref: "/sprints",
  },
  {
    id: "workflow-automation",
    name: "Workflow Assistance & Automations",
    shortName: "Workflow Assistance",
    oneLiner: "Event-driven workflow triggers and intelligent suggestions to eliminate manual handoffs between engineering stages.",
    status: "partially_implemented",
    statusLabel: "Partially Implemented",
    statusEvidence: "Verified in backend app/events/, notification dispatchers, meeting-to-task conversion, and status hooks; autonomous multi-agent triggers are planned.",
    iconName: "Workflow",
    category: "Knowledge & Intelligence",
    problem: "Manual handoffs between requirement specification, task creation, team notifications, and QA validation create coordination bottlenecks and dropped tasks.",
    howSynapseHelps: [
      "Listens to system lifecycle events such as requirement state updates, meeting transcript uploads, and task completions.",
      "Dispatches context-aware notifications and activity feed logs to relevant project collaborators.",
      "Suggests logical downstream steps, such as triggering test case generation once a requirement is approved.",
      "Allows team leads to approve automated suggestions with a single click before executing state changes."
    ],
    practicalBenefit: "Reduces administrative coordination overhead and ensures smooth transitions throughout the software development lifecycle.",
    connectedFeatureIds: ["ai-requirement-checker", "ai-test-case-generator", "meeting-intelligence", "sprints-tasks"],
    ctaText: "View Workflow Activities",
    ctaHref: "/tasks",
  },
  {
    id: "velocity-analytics",
    name: "Velocity Analytics & Historical Trends",
    shortName: "Velocity Analytics",
    oneLiner: "Analyzes historical delivery cadence, story point throughput, and workstream distributions to inform future sprint planning.",
    status: "partially_implemented",
    statusLabel: "Partially Implemented",
    statusEvidence: "Verified in backend app/admin/analytics/, task metrics, and platform telemetry; predictive machine-learning velocity forecasting models are in development.",
    iconName: "TrendingUp",
    category: "Predictive Analytics",
    problem: "Sprint capacity planning frequently relies on gut feeling rather than empirical delivery patterns, leading to chronic overcommitment and team fatigue.",
    howSynapseHelps: [
      "Tracks historical completed story points and cycle times across previous sprint milestones.",
      "Computes rolling team velocity baselines to provide objective benchmarks for upcoming sprint backlog commitments.",
      "Monitors workstream balance (Frontend, Backend, QA, DevOps) to surface skill bottlenecks.",
      "Builds baseline telemetry data to power upcoming predictive capacity and release forecasting models."
    ],
    practicalBenefit: "Grounds sprint planning in objective historical performance, leading to more predictable release dates and healthier team pacing.",
    connectedFeatureIds: ["sprints-tasks", "sprint-summary", "delay-diagnostics"],
    ctaText: "Explore Platform Analytics",
    ctaHref: "/admin/analytics",
  },
];
