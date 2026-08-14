/**
 * Utility functions for role and specialization formatting across the frontend UI.
 */

export const PROJECT_ROLE_OPTIONS = [
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "TEAM_LEAD", label: "Team Lead" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "VIEWER", label: "Viewer" },
] as const;

export const SPECIALIZATION_OPTIONS = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "AI_ML", label: "AI / ML" },
  { value: "QA_TESTING", label: "QA / Testing" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "DESIGN", label: "Design" },
  { value: "OTHER", label: "Other" },
] as const;

/**
 * Formats a raw role string for UI display.
 * Maps 'OWNER' to 'CTO' for visual display as per organization branding.
 */
export function formatRoleLabel(role?: string | null): string {
  if (!role) return "";
  const upper = role.toUpperCase();
  if (upper === "OWNER") {
    return "CTO";
  }
  if (upper === "PROJECT_MANAGER") return "Project Manager";
  if (upper === "TEAM_LEAD") return "Team Lead";
  if (upper === "DEVELOPER") return "Developer";
  if (upper === "VIEWER") return "Viewer";
  return role.replace(/_/g, " ");
}

/**
 * Formats a specialization string for UI display.
 */
export function formatSpecializationLabel(spec?: string | null): string {
  if (!spec) return "";
  const upper = spec.toUpperCase();
  switch (upper) {
    case "FRONTEND":
      return "Frontend";
    case "BACKEND":
      return "Backend";
    case "AI_ML":
      return "AI / ML";
    case "QA_TESTING":
      return "QA / Testing";
    case "DEVOPS":
      return "DevOps";
    case "DESIGN":
      return "Design";
    case "OTHER":
      return "Other";
    default:
      return spec.replace(/_/g, " ");
  }
}

/**
 * Returns CSS color classes for role badges.
 */
export function getRoleBadgeStyle(role?: string | null): string {
  if (!role) return "bg-gray-700/50 text-gray-300 border-gray-600";
  const upper = role.toUpperCase();
  switch (upper) {
    case "PROJECT_MANAGER":
      return "bg-purple-950/60 text-purple-300 border-purple-800/60";
    case "TEAM_LEAD":
      return "bg-amber-950/60 text-amber-300 border-amber-800/60";
    case "DEVELOPER":
      return "bg-blue-950/60 text-blue-300 border-blue-800/60";
    case "VIEWER":
      return "bg-slate-800/60 text-slate-300 border-slate-700/60";
    case "OWNER":
      return "bg-emerald-950/60 text-emerald-300 border-emerald-800/60";
    case "ADMIN":
      return "bg-indigo-950/60 text-indigo-300 border-indigo-800/60";
    default:
      return "bg-gray-800/60 text-gray-300 border-gray-700/60";
  }
}

/**
 * Returns CSS color classes for specialization badges.
 */
export function getSpecializationBadgeStyle(spec?: string | null): string {
  if (!spec) return "bg-gray-800/60 text-gray-400 border-gray-700/60";
  const upper = spec.toUpperCase();
  switch (upper) {
    case "FRONTEND":
      return "bg-cyan-950/60 text-cyan-300 border-cyan-800/60";
    case "BACKEND":
      return "bg-emerald-950/60 text-emerald-300 border-emerald-800/60";
    case "AI_ML":
      return "bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-800/60";
    case "QA_TESTING":
      return "bg-rose-950/60 text-rose-300 border-rose-800/60";
    case "DEVOPS":
      return "bg-orange-950/60 text-orange-300 border-orange-800/60";
    case "DESIGN":
      return "bg-pink-950/60 text-pink-300 border-pink-800/60";
    case "OTHER":
    default:
      return "bg-gray-800/60 text-gray-300 border-gray-700/60";
  }
}
