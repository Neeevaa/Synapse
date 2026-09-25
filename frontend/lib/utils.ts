import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes technical error messages to prevent disclosing internal models,
 * infrastructure, databases, local URLs, or third-party provider details.
 */
export function sanitizeErrorMessage(message?: string | null): string {
  if (!message || typeof message !== "string") {
    return "An unexpected error occurred. Please try again.";
  }

  const lower = message.toLowerCase();

  // 1. AI Model & Local Provider terms
  if (
    lower.includes("ollama") ||
    lower.includes("qwen") ||
    lower.includes("nomic") ||
    lower.includes("embed") ||
    lower.includes("11434") ||
    lower.includes("11435") ||
    lower.includes("llm")
  ) {
    return "AI analysis is temporarily unavailable. Please try again.";
  }

  // 2. Database & SQL leakage
  if (
    lower.includes("pgvector") ||
    lower.includes("postgresql") ||
    lower.includes("postgres") ||
    lower.includes("sqlalchemy") ||
    lower.includes("alembic") ||
    lower.includes("sqlite") ||
    lower.includes("databaseerror") ||
    lower.includes("integrityerror") ||
    lower.includes("statementerror")
  ) {
    return "A system error occurred. Please try again later.";
  }

  // 3. Payment provider disclosure
  if (lower.includes("razorpay")) {
    return "Payment processing encountered an error. Please try again.";
  }

  // 4. Localhost, ports, or raw internal paths
  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes(":8000") ||
    lower.includes(":3000") ||
    lower.includes("traceback") ||
    lower.includes("internal server error")
  ) {
    return "Service is temporarily unavailable. Please try again.";
  }

  return message;
}
