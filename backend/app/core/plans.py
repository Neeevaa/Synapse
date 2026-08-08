"""
Centralized Synapse Subscription Plan Configuration and Entitlement Definitions.
Single source of truth for backend quota logic, API responses, and feature gating.
"""

from app.models.enums import SubscriptionPlan

PLAN_DEFINITIONS = {
    SubscriptionPlan.FREE: {
        "id": SubscriptionPlan.FREE,
        "name": "Free",
        "price": "$0 / month",
        "description": "For individuals and small teams exploring Synapse",
        "cta_text": "Select Free",
        "is_popular": False,
        "limits": {
            "max_team_members": 3,
            "max_active_projects": 2,
            "max_ai_executions_monthly": 50,
            "max_storage_bytes": 500 * 1024 * 1024,  # 500 MB
            "max_storage_display": "500 MB",
            "max_automation_workflows": 0,
        },
        "included_features": [
            "Basic task & sprint management",
            "Basic AI assistance",
            "Basic project analytics",
        ],
        "unavailable_features": [
            "Advanced task & sprint management",
            "AI task & requirement assistance",
            "AI test-case generation",
            "Meeting summaries",
            "Semantic project search",
            "Predictive delay detection",
            "Contextual delay diagnostics",
            "Requirement vulnerability scanning",
            "RAG-powered knowledge search",
            "Knowledge graph",
            "AI agents",
            "Unlimited automation",
            "API & webhooks",
        ],
    },
    SubscriptionPlan.STARTER: {
        "id": SubscriptionPlan.STARTER,
        "name": "Starter",
        "price": "$19 / month",
        "description": "For growing teams managing multiple projects",
        "cta_text": "Select Starter",
        "is_popular": False,
        "limits": {
            "max_team_members": 10,
            "max_active_projects": 10,
            "max_ai_executions_monthly": 300,
            "max_storage_bytes": 5 * 1024 * 1024 * 1024,  # 5 GB
            "max_storage_display": "5 GB",
            "max_automation_workflows": 10,
        },
        "included_features": [
            "Advanced task & sprint management",
            "AI task & requirement assistance",
            "AI test-case generation",
            "Meeting summaries",
            "Semantic project search",
        ],
        "unavailable_features": [
            "Predictive delay detection",
            "Contextual delay diagnostics",
            "Requirement vulnerability scanning",
            "RAG-powered knowledge search",
            "Knowledge graph",
            "AI agents",
            "Unlimited automation",
            "API & webhooks",
            "Advanced project analytics",
        ],
    },
    SubscriptionPlan.PRO: {
        "id": SubscriptionPlan.PRO,
        "name": "Pro",
        "price": "$49 / month",
        "description": "For teams that want AI-driven project intelligence",
        "cta_text": "Select Pro",
        "is_popular": True,
        "limits": {
            "max_team_members": 50,
            "max_active_projects": -1,  # Unlimited
            "max_ai_executions_monthly": -1,  # Unlimited
            "max_storage_bytes": 25 * 1024 * 1024 * 1024,  # 25 GB
            "max_storage_display": "25 GB",
            "max_automation_workflows": -1,  # Unlimited
        },
        "included_features": [
            "Predictive delay detection",
            "Contextual delay diagnostics",
            "Requirement vulnerability scanning",
            "AI test-case generation",
            "Meeting intelligence",
            "RAG-powered knowledge search",
            "Knowledge graph",
            "Advanced project analytics",
            "AI agents",
            "Unlimited automation",
            "API & webhooks",
        ],
        "unavailable_features": [
            "Dedicated infrastructure",
            "Custom AI governance & SSO",
        ],
    },
    SubscriptionPlan.ENTERPRISE: {
        "id": SubscriptionPlan.ENTERPRISE,
        "name": "Enterprise",
        "price": "Custom",
        "description": "For organizations operating Synapse at scale",
        "cta_text": "Contact Sales",
        "is_popular": False,
        "limits": {
            "max_team_members": -1,  # Unlimited
            "max_active_projects": -1,  # Unlimited
            "max_ai_executions_monthly": -1,  # Custom according to contract
            "max_storage_bytes": -1,  # Subject to contract
            "max_storage_display": "Custom SLA",
            "max_automation_workflows": -1,  # Unlimited
        },
        "included_features": [
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
        "unavailable_features": [],
    },
}


def get_plan_definition(plan: SubscriptionPlan | str) -> dict:
    """Retrieves full structured configuration for a given subscription plan."""
    plan_key = SubscriptionPlan(plan) if isinstance(plan, str) else plan
    return PLAN_DEFINITIONS.get(plan_key, PLAN_DEFINITIONS[SubscriptionPlan.FREE])
