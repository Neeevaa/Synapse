/**
 * Utility functions for role formatting and CTO labeling across the frontend UI.
 */

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
  return role.replace(/_/g, " ");
}
