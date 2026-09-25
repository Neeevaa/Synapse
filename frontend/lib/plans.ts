/**
 * Centralized Synapse Subscription Plan Configuration and Entitlements.
 * Single source of truth consumed by Pricing UI, Registration Onboarding,
 * Company Settings, and Frontend Feature Gates.
 */

export type SubscriptionPlanId = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanLimits {
  max_team_members: number;
  max_active_projects: number;
  max_ai_executions_monthly: number;
  max_storage_bytes: number;
  max_storage_display: string;
  max_automation_workflows: number;
}

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  price: string;
  price_inr: number | null;
  currency: string;
  billing_period: string;
  description: string;
  cta_text: string;
  is_popular: boolean;
  limits: PlanLimits;
  included_features: string[];
  unavailable_features: string[];
}

export interface AuthoritativePlan {
  code: SubscriptionPlanId;
  name: string;
  price: number | null;
  price_display: string;
  currency: string;
  billing_period: string;
  description: string;
  cta_text: string;
  is_popular: boolean;
  limits: PlanLimits;
  included_features: string[];
  unavailable_features: string[];
}

export interface RecentPayment {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number; // in paise
  amount_inr: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface CurrentSubscription {
  company_id: string;
  company_name: string;
  plan: SubscriptionPlanId;
  plan_name: string;
  status: string;
  price: number | null;
  price_display: string;
  currency: string;
  billing_period: string;
  current_period_start: string | null;
  current_period_end: string | null;
  limits: PlanLimits;
  included_features: string[];
  warnings: string[];
  recent_payments: RecentPayment[];
}

export interface RazorpayOrderResponse {
  order_id: string;
  key_id: string;
  amount: number; // paise
  currency: string;
  plan: SubscriptionPlanId;
  company_name: string;
  user_email: string;
  user_name: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  plan: SubscriptionPlanId;
  status: string;
  current_period_end: string | null;
}

export const PLAN_DEFINITIONS: Record<SubscriptionPlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: "₹0 / month",
    price_inr: 0,
    currency: "INR",
    billing_period: "month",
    description: "For individuals and small teams exploring Synapse",
    cta_text: "Select Free",
    is_popular: false,
    limits: {
      max_team_members: 3,
      max_active_projects: 2,
      max_ai_executions_monthly: 50,
      max_storage_bytes: 500 * 1024 * 1024, // 500 MB
      max_storage_display: "500 MB",
      max_automation_workflows: 0,
    },
    included_features: [
      "Basic task & sprint management",
      "Basic AI assistance",
      "Basic project analytics",
    ],
    unavailable_features: [
      "Advanced task & sprint management",
      "AI task & requirement assistance",
      "AI test-case generation",
      "Meeting summaries",
      "Semantic project search",
      "Predictive delay detection",
      "Contextual delay diagnostics",
      "Requirement vulnerability scanning",
      "Project knowledge search",
      "Knowledge graph",
      "AI agents",
      "Unlimited automation",
      "API & webhooks",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: "₹799 / month",
    price_inr: 799,
    currency: "INR",
    billing_period: "month",
    description: "For growing teams managing multiple projects",
    cta_text: "Select Starter",
    is_popular: false,
    limits: {
      max_team_members: 10,
      max_active_projects: 10,
      max_ai_executions_monthly: 300,
      max_storage_bytes: 5 * 1024 * 1024 * 1024, // 5 GB
      max_storage_display: "5 GB",
      max_automation_workflows: 10,
    },
    included_features: [
      "Advanced task & sprint management",
      "AI task & requirement assistance",
      "AI test-case generation",
      "Meeting summaries",
      "Semantic project search",
    ],
    unavailable_features: [
      "Predictive delay detection",
      "Contextual delay diagnostics",
      "Requirement vulnerability scanning",
      "Project knowledge search",
      "Knowledge graph",
      "AI agents",
      "Unlimited automation",
      "API & webhooks",
      "Advanced project analytics",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: "₹1,999 / month",
    price_inr: 1999,
    currency: "INR",
    billing_period: "month",
    description: "For teams that want AI-driven project intelligence",
    cta_text: "Select Pro",
    is_popular: true, // Most Popular
    limits: {
      max_team_members: 50,
      max_active_projects: -1, // Unlimited
      max_ai_executions_monthly: -1, // Unlimited
      max_storage_bytes: 25 * 1024 * 1024 * 1024, // 25 GB
      max_storage_display: "25 GB",
      max_automation_workflows: -1, // Unlimited
    },
    included_features: [
      "Predictive delay detection",
      "Contextual delay diagnostics",
      "Requirement vulnerability scanning",
      "AI test-case generation",
      "Meeting intelligence",
      "Project knowledge search",
      "Knowledge graph",
      "Advanced project analytics",
      "AI agents",
      "Unlimited automation",
      "API & webhooks",
    ],
    unavailable_features: [
      "Dedicated infrastructure",
      "Custom AI governance & SSO",
    ],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    price_inr: null,
    currency: "INR",
    billing_period: "month",
    description: "For organizations operating Synapse at scale",
    cta_text: "Contact Sales",
    is_popular: false,
    limits: {
      max_team_members: -1, // Unlimited
      max_active_projects: -1, // Unlimited
      max_ai_executions_monthly: -1, // Custom according to contract
      max_storage_bytes: -1, // Subject to contract
      max_storage_display: "Custom SLA",
      max_automation_workflows: -1, // Unlimited
    },
    included_features: [
      "Dedicated infrastructure",
      "Dedicated database",
      "Organization-wide knowledge graph",
      "Custom AI agents",
      "Advanced AI governance",
      "SSO / SAML",
      "Advanced RBAC",
      "Audit & security controls",
      "Custom integrations",
      "API access",
      "Custom data retention",
      "SLA & dedicated support",
      "Custom deployment options",
    ],
    unavailable_features: [],
  },
};

export const PLANS_LIST = [
  PLAN_DEFINITIONS.FREE,
  PLAN_DEFINITIONS.STARTER,
  PLAN_DEFINITIONS.PRO,
  PLAN_DEFINITIONS.ENTERPRISE,
];

export function toAuthoritativePlan(plan: PlanDefinition): AuthoritativePlan {
  return {
    code: plan.id,
    name: plan.name,
    price: plan.price_inr,
    price_display: plan.price,
    currency: plan.currency,
    billing_period: plan.billing_period,
    description: plan.description,
    cta_text: plan.cta_text,
    is_popular: plan.is_popular,
    limits: plan.limits,
    included_features: plan.included_features,
    unavailable_features: plan.unavailable_features,
  };
}
