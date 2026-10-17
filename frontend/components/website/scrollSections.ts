import { ScrollFXSection } from "@/components/ui/full-screen-scroll-fx";

/**
 * Navigation items for the Synapse Homepage header & mobile navigation,
 * directly linked to the FullScreenScrollFX section stages.
 */
export const HOMEPAGE_NAV_ITEMS = [
  {
    name: "Intelligence",
    href: "#intelligence",
    desc: "AI workspace connecting projects, people, and requirements.",
  },
  {
    name: "Visibility",
    href: "#visibility",
    desc: "Proactive risk detection and multi-sprint dependency graphs.",
  },
  {
    name: "Requirements",
    href: "#clarity",
    desc: "Contextual specification review analyzing ambiguities & criteria.",
  },
  {
    name: "Workflow",
    href: "#workflow",
    desc: "Connected sprint backlogs, tasks, and development pipelines.",
  },
  {
    name: "Insights",
    href: "#collaboration",
    desc: "Meeting takeaways, semantic search, and human-in-the-loop decisions.",
  },
];

/**
 * Synapse Landing Page Cinematic Full-Screen Scroll Sections
 * Each section introduces a key aspect of the platform with dedicated background images,
 * dual labels, center headlines, and supporting context.
 */
export const SYNAPSE_SCROLL_SECTIONS: ScrollFXSection[] = [
  {
    id: "intelligence",
    num: "01",
    leftLabel: "INTELLIGENCE",
    centerHeadline: "Manage Smarter.",
    rightLabel: "SYNAPSE",
    eyebrow: "AI-POWERED WORKSPACE",
    badge: "FOUNDATION // 01",
    supportingMessage:
      "An AI-powered workspace that connects your projects, people, requirements, and decisions.",
    backgroundImage: "/images/scroll-fx/section-1-intelligence.jpg",
    metric: {
      label: "System State",
      value: "Fully Connected",
    },
    tags: ["Workspace", "Context", "Intelligence"],
  },
  {
    id: "visibility",
    num: "02",
    leftLabel: "VISIBILITY",
    centerHeadline: "See What's Next.",
    rightLabel: "PREDICTION",
    eyebrow: "PROACTIVE RISK INTELLIGENCE",
    badge: "INSIGHT // 02",
    supportingMessage:
      "Identify risks early, understand complex dependencies, and recognize potential delays before they become major problems.",
    backgroundImage: "/images/scroll-fx/section-2-visibility.jpg",
    metric: {
      label: "Risk Horizon",
      value: "Multi-Sprint Forecast",
    },
    tags: ["Dependencies", "Early Warnings", "Blockers"],
  },
  {
    id: "clarity",
    num: "03",
    leftLabel: "CLARITY",
    centerHeadline: "Build With Context.",
    rightLabel: "AI REVIEW",
    eyebrow: "REQUIREMENT CHECKER",
    badge: "SPECIFICATION // 03",
    supportingMessage:
      "The AI-assisted Requirement Checker analyzes requirements against relevant project context and helps identify ambiguity, missing details, and potentially unsupported assumptions.",
    backgroundImage: "/images/scroll-fx/section-3-clarity.jpg",
    metric: {
      label: "Criteria Coverage",
      value: "Traceable & Verified",
    },
    tags: ["Acceptance Criteria", "Context Review", "Assumptions"],
  },
  {
    id: "workflow",
    num: "04",
    leftLabel: "WORKFLOW",
    centerHeadline: "Every Task Connects.",
    rightLabel: "DEPENDENCIES",
    eyebrow: "LIFECYCLE CONTINUITY",
    badge: "EXECUTION // 04",
    supportingMessage:
      "Connect product backlogs, sprint planning, tasks, team responsibilities, project documentation, meetings, and dependencies into an unbroken chain of delivery.",
    backgroundImage: "/images/scroll-fx/section-4-workflow.jpg",
    metric: {
      label: "Task Linkage",
      value: "End-to-End Traceable",
    },
    tags: ["Sprints", "Backlog", "Task Graphs"],
  },
  {
    id: "collaboration",
    num: "05",
    leftLabel: "COLLABORATION",
    centerHeadline: "Decisions With Context.",
    rightLabel: "INSIGHTS",
    eyebrow: "COLLABORATIVE INTELLIGENCE",
    badge: "ASSISTANCE // 05",
    supportingMessage:
      "Extract decisions from meetings, synthesize sprint summaries, and retrieve semantic knowledge across your company — with AI designed to assist human decisions, keeping teams in complete control.",
    backgroundImage: "/images/scroll-fx/section-5-collaboration.jpg",
    metric: {
      label: "Human Control",
      value: "Always Verified",
    },
    tags: ["Meetings", "Semantic Search", "Decision Logs"],
  },
  {
    id: "get-started",
    num: "06",
    leftLabel: "GET STARTED",
    centerHeadline: "Think Ahead.",
    rightLabel: "SYNAPSE",
    eyebrow: "EMBARK ON INTELLIGENT DELIVERY",
    badge: "LAUNCH // 06",
    supportingMessage:
      "Bring your project context together. Make better-informed decisions. Move forward with clarity.",
    backgroundImage: "/images/scroll-fx/section-6-get-started.jpg",
    primaryCta: {
      text: "Get Started Free",
      href: "/register",
    },
    secondaryCta: {
      text: "Sign In to Workspace",
      href: "/login",
    },
    metric: {
      label: "Onboarding",
      value: "Instant Setup",
    },
    tags: ["Sign Up", "Deploy", "Scale"],
  },
];
