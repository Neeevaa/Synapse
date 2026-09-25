"""
Centralized Authoritative Enterprise Pricing Engine.
Computes authoritative dynamic pricing for custom Enterprise subscriptions:
Base Platform Fee + Approved Capability Charges + Resource Limit Charges.
Never exposes underlying infrastructure or model providers to client/UI.
"""

from typing import Any

PRICING_VERSION = "v1.0"
ENTERPRISE_BASE_PRICE = 5000  # ₹5,000 / month base platform fee

# Authoritative Monthly Pricing per Capability (INR)
ENTERPRISE_CAPABILITIES_CATALOG: list[dict[str, Any]] = [
    {
        "key": "AI Agents",
        "name": "AI Agents",
        "category": "Autonomous Intelligence",
        "description": "Autonomous workflow agents for backlog management, automated sprint planning, and task coordination.",
        "monthly_price_inr": 4000,
    },
    {
        "key": "Project Knowledge Search",
        "name": "Project Knowledge Search",
        "category": "Knowledge & Context",
        "description": "Deep contextual semantic search across all team project documents, requirements, and discussions.",
        "monthly_price_inr": 2500,
    },
    {
        "key": "Knowledge Graph",
        "name": "Knowledge Graph",
        "category": "Knowledge & Context",
        "description": "Automated entity-relationship graph mapping cross-project dependencies, assets, and concepts.",
        "monthly_price_inr": 2500,
    },
    {
        "key": "Predictive Delay Detection",
        "name": "Predictive Delay Detection",
        "category": "Project Intelligence",
        "description": "Machine-learning driven foresight anticipating sprint blockers and deadline slippages.",
        "monthly_price_inr": 3000,
    },
    {
        "key": "Contextual Delay Diagnostics",
        "name": "Contextual Delay Diagnostics",
        "category": "Project Intelligence",
        "description": "Root-cause diagnostics pinpointing engineering bottlenecks and workload friction points.",
        "monthly_price_inr": 3000,
    },
    {
        "key": "Requirement Vulnerability Scanning",
        "name": "Requirement Vulnerability Scanning",
        "category": "Quality & Security",
        "description": "Automated ambiguity and compliance vulnerability scanner for PRDs and technical specs.",
        "monthly_price_inr": 2500,
    },
    {
        "key": "API Access",
        "name": "API Access",
        "category": "Integration & Developer",
        "description": "High-throughput REST API access with custom rate limits and developer keys.",
        "monthly_price_inr": 2000,
    },
    {
        "key": "Webhooks",
        "name": "Webhooks",
        "category": "Integration & Developer",
        "description": "Real-time webhook subscriptions for task state transitions, reviews, and intelligence events.",
        "monthly_price_inr": 1500,
    },
    {
        "key": "SSO / SAML",
        "name": "SSO / SAML",
        "category": "Enterprise Security",
        "description": "Enterprise single sign-on supporting Okta, Azure AD, Google Workspace, and SAML 2.0.",
        "monthly_price_inr": 3500,
    },
    {
        "key": "Advanced RBAC",
        "name": "Advanced RBAC",
        "category": "Enterprise Security",
        "description": "Custom organizational roles, fine-grained project permissions, and domain segregation.",
        "monthly_price_inr": 2000,
    },
    {
        "key": "Advanced AI Governance",
        "name": "Advanced AI Governance",
        "category": "Compliance & Governance",
        "description": "Audit logging of all AI queries, prompt review controls, and strict compliance boundaries.",
        "monthly_price_inr": 3000,
    },
    {
        "key": "Custom Integrations",
        "name": "Custom Integrations",
        "category": "Integration & Developer",
        "description": "Dedicated custom pipeline connectors for Jira, GitHub, Slack, and internal tools.",
        "monthly_price_inr": 3000,
    },
]

CAPABILITY_PRICE_MAP = {
    item["key"]: item["monthly_price_inr"] for item in ENTERPRISE_CAPABILITIES_CATALOG
}


def calculate_resource_charges(limits: dict[str, int]) -> tuple[dict[str, int], int]:
    """
    Computes surcharges for resource limits beyond the base allocation:
    - -1 indicates Unlimited
    - Positive integers represent explicit limits
    """
    charges: dict[str, int] = {}
    total = 0

    # Users
    user_limit = limits.get("max_users", -1)
    if user_limit == -1:
        charges["Unlimited Users"] = 5000
    elif user_limit > 50:
        charges[f"Users ({user_limit})"] = (user_limit - 50) * 50
    else:
        charges["Users (Standard)"] = 0

    # Active Projects
    project_limit = limits.get("max_active_projects", -1)
    if project_limit == -1:
        charges["Unlimited Active Projects"] = 3000
    elif project_limit > 10:
        charges[f"Projects ({project_limit})"] = (project_limit - 10) * 100
    else:
        charges["Projects (Standard)"] = 0

    # Storage (GB)
    storage_gb = limits.get("max_storage_gb", -1)
    if storage_gb == -1:
        charges["Unlimited Storage"] = 5000
    elif storage_gb > 25:
        charges[f"Storage ({storage_gb} GB)"] = (storage_gb - 25) * 20
    else:
        charges["Storage (Standard)"] = 0

    # Monthly AI Executions
    ai_execs = limits.get("max_ai_executions", -1)
    if ai_execs == -1:
        charges["Unlimited AI Executions"] = 6000
    elif ai_execs > 500:
        charges[f"AI Executions ({ai_execs})"] = ((ai_execs - 500) // 100) * 10
    else:
        charges["AI Executions (Standard)"] = 0

    # Automation Workflows
    workflows = limits.get("max_automation_workflows", -1)
    if workflows == -1:
        charges["Unlimited Automation Workflows"] = 3000
    elif workflows > 10:
        charges[f"Automations ({workflows})"] = (workflows - 10) * 100
    else:
        charges["Automations (Standard)"] = 0

    total = sum(charges.values())
    return charges, total


def calculate_capability_charges(capabilities: list[str]) -> tuple[dict[str, int], int, list[dict]]:
    """Computes authoritative charges for approved Enterprise capabilities."""
    charges: dict[str, int] = {}
    items: list[dict] = []
    for cap in capabilities:
        price = CAPABILITY_PRICE_MAP.get(cap, 2500)
        charges[cap] = price
        items.append({"key": cap, "name": cap, "monthly_rate": price})
    total = sum(charges.values())
    return charges, total, items


def calculate_enterprise_pricing(
    limits: dict[str, int],
    capabilities: list[str],
) -> dict[str, Any]:
    """
    Computes complete, authoritative dynamic Enterprise pricing breakdown.
    Final Price = Enterprise Base Fee + Capability Charges + Resource Surcharges.
    """
    resource_charges, resource_total = calculate_resource_charges(limits)
    capability_charges, capability_total, capability_items = calculate_capability_charges(capabilities)

    resource_items = [
        {"key": k, "label": k, "surcharge": v}
        for k, v in resource_charges.items()
        if v > 0
    ]

    total_price = ENTERPRISE_BASE_PRICE + resource_total + capability_total

    return {
        "base_fee": ENTERPRISE_BASE_PRICE,
        "capability_charges": capability_charges,
        "capability_total": capability_total,
        "capabilities_subtotal": capability_total,
        "capabilities_items": capability_items,
        "resource_charges": resource_charges,
        "resource_total": resource_total,
        "resources_subtotal": resource_total,
        "resource_items": resource_items,
        "total_monthly_price": total_price,
        "currency": "INR",
        "pricing_version": PRICING_VERSION,
    }
