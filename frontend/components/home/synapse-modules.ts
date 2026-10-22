export interface SynapseModuleConfig {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  category: "AI Core" | "Agile Lifecycle" | "Knowledge & Intelligence" | "Predictive Analytics";
  iconName: string;
  route: string;
  status: "implemented" | "partially_implemented" | "planned";
  statusLabel: string;
  description: string;
  // Position hints on normalized 800x600 stage (desktop)
  desktopPos: { x: number; y: number };
  nucleusPortAngle: number;
}

export const SYNAPSE_MODULES: SynapseModuleConfig[] = [
  {
    id: "requirements-intelligence",
    name: "Requirements Intelligence",
    shortName: "Requirements",
    tagline: "Automated audit & ambiguity smell detection",
    category: "AI Core",
    iconName: "FileCheck2",
    route: "/projects",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Evaluates specifications against real project context across 9 quality dimensions before coding.",
    desktopPos: { x: 210, y: 140 },
    nucleusPortAngle: 225,
  },
  {
    id: "meeting-intelligence",
    name: "Meeting Intelligence",
    shortName: "Meetings",
    tagline: "Dialogue parsing & action item extraction",
    category: "Knowledge & Intelligence",
    iconName: "MessageSquareCode",
    route: "/projects",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Converts meeting discussions into structured consensus decisions, risk flags, and backlog tasks.",
    desktopPos: { x: 130, y: 300 },
    nucleusPortAngle: 180,
  },
  {
    id: "task-workflow",
    name: "Task & Workflow",
    shortName: "Tasks & Kanban",
    tagline: "Fluid Kanban & role-governed execution",
    category: "Agile Lifecycle",
    iconName: "Kanban",
    route: "/tasks",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Connects real sprint backlogs directly with AI-approved tasks and role-based permissions.",
    desktopPos: { x: 210, y: 460 },
    nucleusPortAngle: 140,
  },
  {
    id: "ai-test-cases",
    name: "AI Test Case Generator",
    shortName: "Test Cases",
    tagline: "Multi-scenario functional & boundary suites",
    category: "AI Core",
    iconName: "TestTube2",
    route: "/projects",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Synthesizes Functional, Boundary, and Acceptance test suites directly from validated requirements.",
    desktopPos: { x: 340, y: 535 },
    nucleusPortAngle: 100,
  },
  {
    id: "rag-knowledge",
    name: "RAG Knowledge Base",
    shortName: "Knowledge Base",
    tagline: "Vector search & project-isolated context",
    category: "Knowledge & Intelligence",
    iconName: "Database",
    route: "/projects",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Multi-tenant vector retrieval grounding every answer with auditable artifact citations.",
    desktopPos: { x: 500, y: 515 },
    nucleusPortAngle: 65,
  },
  {
    id: "project-analytics",
    name: "Project Analytics",
    shortName: "Analytics",
    tagline: "Delay root-cause heuristics & telemetry",
    category: "Predictive Analytics",
    iconName: "AlertTriangle",
    route: "/dashboard",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Analyzes stalled tasks and throughput bottlenecks to help engineering leads triage risks early.",
    desktopPos: { x: 620, y: 430 },
    nucleusPortAngle: 30,
  },
  {
    id: "traceability-impact",
    name: "Traceability & Impact",
    shortName: "Traceability",
    tagline: "Bi-directional blast radius visualization",
    category: "Agile Lifecycle",
    iconName: "GitBranch",
    route: "/projects",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Maps upstream origins and downstream dependencies across requirements, tasks, and deliverables.",
    desktopPos: { x: 670, y: 280 },
    nucleusPortAngle: 0,
  },
  {
    id: "sprint-intelligence",
    name: "Sprint Intelligence",
    shortName: "Sprint Tracking",
    tagline: "Velocity forecasting & sprint health scoring",
    category: "Agile Lifecycle",
    iconName: "TrendingUp",
    route: "/sprints",
    status: "implemented",
    statusLabel: "Implemented",
    description: "Tracks active cycle progress, completed deliverables, and capacity trends across sprint milestones.",
    desktopPos: { x: 590, y: 140 },
    nucleusPortAngle: 315,
  },
];
