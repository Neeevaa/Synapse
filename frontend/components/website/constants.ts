/**
 * Synapse Website Constants & Centralized Asset Paths
 * Single source of truth for marketing content, navigation, and image assets.
 */

export const WEBSITE_IMAGES = {
  HERO_BACKGROUND_IMAGE: "/images/website/HERO_BACKGROUND_IMAGE.jpg",
  HERO_PRODUCT_MOCKUP_01: "/images/website/HERO_PRODUCT_MOCKUP_01.png",
  HERO_PRODUCT_MOCKUP_02: "/images/website/HERO_PRODUCT_MOCKUP_02.png",
  HERO_PRODUCT_MOCKUP_03: "/images/website/HERO_PRODUCT_MOCKUP_03.png",
  FEATURE_SHOWCASE_01: "/images/website/FEATURE_SHOWCASE_01.png",
  FEATURE_SHOWCASE_02: "/images/website/FEATURE_SHOWCASE_02.png",
  FEATURE_SHOWCASE_03: "/images/website/FEATURE_SHOWCASE_03.png",
  FEATURE_SHOWCASE_04: "/images/website/FEATURE_SHOWCASE_04.png",
  PROJECT_PLANNING_IMAGE: "/images/website/PROJECT_PLANNING_IMAGE.png",
  REQUIREMENT_INTELLIGENCE_IMAGE: "/images/website/REQUIREMENT_INTELLIGENCE_IMAGE.png",
  MEETING_INTELLIGENCE_IMAGE: "/images/website/MEETING_INTELLIGENCE_IMAGE.png",
  AI_TEST_CASE_IMAGE: "/images/website/AI_TEST_CASE_IMAGE.png",
  PROJECT_INTELLIGENCE_DASHBOARD: "/images/website/PROJECT_INTELLIGENCE_DASHBOARD.png",
  PROJECT_SIGNAL_CARD: "/images/website/PROJECT_SIGNAL_CARD.png",
  RISK_INSIGHT_CARD: "/images/website/RISK_INSIGHT_CARD.png",
  REQUIREMENT_SIGNAL_CARD: "/images/website/REQUIREMENT_SIGNAL_CARD.png",
  AI_INTELLIGENCE_SCREEN: "/images/website/AI_INTELLIGENCE_SCREEN.png",
  COLLAGE_DASHBOARD: "/images/website/COLLAGE_DASHBOARD.png",
  COLLAGE_REQUIREMENTS: "/images/website/COLLAGE_REQUIREMENTS.png",
  COLLAGE_SPRINT: "/images/website/COLLAGE_SPRINT.png",
  COLLAGE_MEETING: "/images/website/COLLAGE_MEETING.png",
  COLLAGE_AI: "/images/website/COLLAGE_AI.png",
  WORKFLOW_IMAGE: "/images/website/WORKFLOW_IMAGE.png",
  KNOWLEDGE_SEARCH_IMAGE: "/images/website/KNOWLEDGE_SEARCH_IMAGE.png",
} as const;

export type WebsiteImageKey = keyof typeof WEBSITE_IMAGES;

export const NAV_DROPDOWNS = {
  product: [
    { name: "Project Management", desc: "Backlogs, milestones, task pipelines & team capacity.", href: "#features" },
    { name: "Requirements", desc: "Review criteria and full traceability across sprints.", href: "#features" },
    { name: "Sprint Planning", desc: "Predictable iteration tracking and velocity metrics.", href: "#showcase" },
    { name: "Meeting Intelligence", desc: "Convert transcripts into actionable tickets & decisions.", href: "#ai" },
    { name: "AI Test Case Generator", desc: "Generate structured test cases from requirements.", href: "#ai" },
    { name: "Knowledge Base", desc: "Semantic graph connecting team docs, decisions & tasks.", href: "#search" },
    { name: "Analytics", desc: "Operational velocity and delivery risk signals.", href: "#stats" },
  ],
  solutions: [
    { name: "Project Managers", desc: "High-level milestones, dependency maps & timeline clarity.", href: "#roles" },
    { name: "Development Teams", desc: "Contextual task cards with direct links to specs & criteria.", href: "#roles" },
    { name: "Engineering Leads", desc: "Balance team load, unblock PR bottlenecks & reduce friction.", href: "#roles" },
    { name: "CTOs", desc: "System-wide delivery oversight and resource utilization.", href: "#roles" },
    { name: "Growing Software Teams", desc: "Scale engineering practices from seed to enterprise.", href: "#roles" },
  ],
  resources: [
    { name: "Documentation", desc: "Guides, API integrations, and workflow tutorials.", href: "#resources" },
    { name: "Product Overview", desc: "Detailed walkthrough of the Synapse platform.", href: "#features" },
    { name: "Research", desc: "Architectural insights on AI-assisted engineering.", href: "#resources" },
    { name: "FAQ", desc: "Answers to common questions about security & setup.", href: "#faq" },
    { name: "Contact", desc: "Get in touch with the Synapse engineering team.", href: "#footer" },
  ],
};

export const CAPABILITY_CATEGORIES = [
  { id: "planning", label: "Planning", slideIndex: 0 },
  { id: "requirements", label: "Requirements", slideIndex: 1 },
  { id: "sprints", label: "Sprints", slideIndex: 0 },
  { id: "collaboration", label: "Collaboration", slideIndex: 2 },
  { id: "ai", label: "AI Intelligence", slideIndex: 3 },
  { id: "knowledge", label: "Knowledge", slideIndex: 1 },
  { id: "analytics", label: "Analytics", slideIndex: 0 },
];

export const FEATURE_SLIDES = [
  {
    id: 1,
    title: "Plan with clarity",
    subtitle: "Connected Execution",
    description: "Connect backlog, sprints, tasks and team capacity in one workspace without scattered spreadsheets.",
    imageKey: "FEATURE_SHOWCASE_01" as WebsiteImageKey,
    tag: "Planning & Sprints",
    metrics: "Real-time Capacity Mapping",
  },
  {
    id: 2,
    title: "Turn requirements into action",
    subtitle: "Specification Traceability",
    description: "Review requirements, acceptance criteria and traceability across every task without losing context.",
    imageKey: "FEATURE_SHOWCASE_02" as WebsiteImageKey,
    tag: "Requirement Engine",
    metrics: "100% Context Linked",
  },
  {
    id: 3,
    title: "Make meetings actionable",
    subtitle: "Meeting Intelligence",
    description: "Turn meeting intelligence into concrete decisions, surfaced risks, and auto-linked trackable tasks.",
    imageKey: "FEATURE_SHOWCASE_03" as WebsiteImageKey,
    tag: "Collaboration Intelligence",
    metrics: "Instant Action Items",
  },
  {
    id: 4,
    title: "Let AI assist the workflow",
    subtitle: "Contextual Guidance",
    description: "Use full project context to generate insights, test cases, and actionable recommendations before blockers compound.",
    imageKey: "FEATURE_SHOWCASE_04" as WebsiteImageKey,
    tag: "Intelligent Signals",
    metrics: "Proactive Risk Detection",
  },
];

export const CORE_FEATURES = [
  {
    id: "planning",
    title: "Project Planning",
    tagline: "Agile Orchestration",
    description: "Manage backlogs, sprints, tasks, priorities and team assignments in a unified workspace.",
    imageKey: "PROJECT_PLANNING_IMAGE" as WebsiteImageKey,
    icon: "Kanban",
  },
  {
    id: "requirements",
    title: "Requirement Intelligence",
    tagline: "Clarity & Criteria",
    description: "Review requirements, acceptance criteria and project context with AI-assisted clarity checks.",
    imageKey: "REQUIREMENT_INTELLIGENCE_IMAGE" as WebsiteImageKey,
    icon: "FileCheck2",
  },
  {
    id: "meetings",
    title: "Meeting Intelligence",
    tagline: "Conversations to Code",
    description: "Capture decisions, risks and action items and connect them directly back to the project board.",
    imageKey: "MEETING_INTELLIGENCE_IMAGE" as WebsiteImageKey,
    icon: "Video",
  },
  {
    id: "testcases",
    title: "AI Test Cases",
    tagline: "Automated QA Matrices",
    description: "Generate structured, reproducible test cases from requirements and project context instantly.",
    imageKey: "AI_TEST_CASE_IMAGE" as WebsiteImageKey,
    icon: "Sparkles",
  },
];

export const WORKFLOW_STAGES = [
  {
    step: "01",
    label: "REQUIREMENTS",
    title: "Define What Matters",
    description: "Define what needs to be built with clear acceptance criteria and synchronized stakeholder intent.",
  },
  {
    step: "02",
    label: "PLANNING",
    title: "Structured Backlog",
    description: "Turn requirements into actionable work, realistic sprint cadences, and balanced assignments.",
  },
  {
    step: "03",
    label: "EXECUTION",
    title: "Velocity in Motion",
    description: "Track tasks, sprints and delivery progress with continuous dependency visibility.",
  },
  {
    step: "04",
    label: "COLLABORATION",
    title: "Synced Decisions",
    description: "Keep syncs, architecture decisions, and action items tightly coupled to execution cards.",
  },
  {
    step: "05",
    label: "INTELLIGENCE",
    title: "Continuous Signals",
    description: "Surface proactive project signals, generate automated QA, and highlight delivery blockers.",
  },
];

export const PROJECT_ROLES = [
  {
    role: "CTO",
    tagline: "Architecture & Delivery Pace",
    description: "Full visibility into engineering velocity, architectural alignment, and delivery risk across all company initiatives.",
    badge: "Executive Oversight",
    icon: "Compass",
  },
  {
    role: "Project Manager",
    tagline: "Scope & Timeline Integrity",
    description: "Predictable sprint cadences, automated meeting takeaways, and synchronized requirements without manual reporting.",
    badge: "Milestone Tracking",
    icon: "CalendarCheck2",
  },
  {
    role: "Team Lead",
    tagline: "Capacity & Blockers",
    description: "Balanced workloads, transparent PR/task flows, and rapid identification of bottlenecks before they derail sprints.",
    badge: "Team Orchestration",
    icon: "Users2",
  },
  {
    role: "Developer",
    tagline: "Focus & Complete Specs",
    description: "Every ticket contains exact acceptance criteria, test expectations, and design links so coding stays uninterrupted.",
    badge: "Direct Execution",
    icon: "Terminal",
  },
  {
    role: "Viewer / Stakeholder",
    tagline: "Real-time Transparency",
    description: "Clean, read-only roadmap previews that eliminate unnecessary status check meetings and email chains.",
    badge: "Clear Visibility",
    icon: "Eye",
  },
];

export const FAQ_ITEMS = [
  {
    q: "What is Synapse?",
    a: "Synapse is an AI-powered project management platform built specifically for modern software engineering teams. It unites task planning, requirement management, meeting intelligence, and context-aware QA into one cohesive workspace.",
  },
  {
    q: "Who is Synapse designed for?",
    a: "Synapse is built for product managers, software engineers, tech leads, and engineering leaders who want to spend less time manually updating spreadsheets and more time delivering high-quality software.",
  },
  {
    q: "How does AI assist project management?",
    a: "Instead of acting as a disconnected chatbot, Synapse's AI works behind the scenes on your project context. It evaluates requirements for ambiguities, extracts structured action items and decisions from meetings, generates comprehensive test cases, and surfaces delivery bottlenecks early.",
  },
  {
    q: "Can teams manage requirements and sprints in Synapse?",
    a: "Yes. Synapse treats requirements and sprint execution as connected twins. Requirements link directly to backlog tasks, test cases, and commits, providing full traceability from idea to deployment.",
  },
  {
    q: "How does Synapse handle project data?",
    a: "Your project data is strictly isolated by organization. We enforce robust role-based access control (RBAC), end-to-end security best practices, and your proprietary project IP is never used to train external public models.",
  },
  {
    q: "Can I start with a free plan?",
    a: "Yes. Synapse offers a generous Free tier that includes core task management, sprint planning, and essential AI assistance so teams can get started immediately without a credit card.",
  },
  {
    q: "Does Synapse support multiple team members?",
    a: "Yes. Synapse is built from the ground up for seamless team collaboration, with distinct role-based permissions (Admins, Team Leads, Members, Viewers) and unlimited collaboration across your projects.",
  },
];
