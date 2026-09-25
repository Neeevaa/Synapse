"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  PLANS_LIST,
  SubscriptionPlanId,
  AuthoritativePlan,
  CurrentSubscription,
} from "@/lib/plans";
import RazorpayCheckoutModal from "@/components/billing/RazorpayCheckoutModal";
import EnterpriseConfigModal from "@/components/billing/EnterpriseConfigModal";
import {
  Building2,
  Sliders,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Check,
  Zap,
  Globe,
  Lock,
  Eye,
  X,
  Users,
  FolderKanban,
  Bot,
  HardDrive,
  Workflow,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

/* ─── Interfaces ─── */
interface CompanyData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  default_project_visibility: string;
  subscription_plan: SubscriptionPlanId;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const profileSchema = z.object({
  name: z.string().min(1, "Company name is required.").max(150),
  description: z.string().max(2000).optional().or(z.literal("")),
  logo_url: z.string().max(500).optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const customResolver = (schema: z.ZodSchema) => async (data: any) => {
  const result = schema.safeParse(data);
  if (result.success) return { values: result.data, errors: {} };
  const issues = result.error.issues || (result.error as any).errors || [];
  const errors = issues.reduce((acc: any, err: any) => {
    const path = err.path.join(".") || "form";
    acc[path] = { message: err.message, type: "validation" };
    return acc;
  }, {});
  return { values: {}, errors };
};

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "plan">("profile");

  // Subscription State
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [authoritativePlans, setAuthoritativePlans] = useState<AuthoritativePlan[]>([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<AuthoritativePlan | null>(null);
  const [downgradingToFree, setDowngradingToFree] = useState(false);
  const [enterpriseRequest, setEnterpriseRequest] = useState<any | null>(null);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);

  // Profile Form state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Settings Form state
  const [visibility, setVisibility] = useState("PRIVATE");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Plan Update feedback state
  const [planSuccess, setPlanSuccess] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: customResolver(profileSchema) as any,
  });

  // Check URL query parameter on mount (e.g. ?tab=plan)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "plan") {
        setActiveTab("plan");
      }
    }
  }, []);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const [subRes, plansRes, entReqRes] = await Promise.all([
        api.get("/subscriptions/current").catch(() => null),
        api.get("/subscriptions/plans").catch(() => null),
        api.get("/subscriptions/enterprise-request/current").catch(() => null),
      ]);
      if (subRes?.data?.data) {
        setCurrentSubscription(subRes.data.data);
      }
      if (plansRes?.data?.data?.plans) {
        setAuthoritativePlans(plansRes.data.data.plans);
      }
      if (entReqRes?.data?.data) {
        setEnterpriseRequest(entReqRes.data.data);
      } else {
        setEnterpriseRequest(null);
      }
    } catch (err) {
      console.error("Failed to load subscription details", err);
    }
  }, []);

  const handleEnterpriseSubmit = async (config: {
    requested_resources: {
      max_users: number;
      max_projects: number;
      max_storage_bytes: number;
      max_ai_executions: number;
      max_automation_workflows: number;
    };
    requested_capabilities: string[];
    business_justification?: string;
  }) => {
    setPlanError(null);
    setPlanSuccess(null);
    try {
      await api.post("/subscriptions/enterprise-request", config);
      setEnterpriseModalOpen(false);
      setPlanSuccess(
        "Custom Enterprise request submitted! Super Admin will review and provide custom pricing. You will receive a notification once approved."
      );
      await fetchSubscriptionData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to submit Enterprise request.";
      setPlanError(msg);
    }
  };

  const fetchCompanyData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, companyRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/companies/me"),
      ]);
      const role = meRes.data.data.role;
      setUserRole(role);
      const compData: CompanyData = companyRes.data.data;
      setCompany(compData);
      setProfileValue("name", compData.name);
      setProfileValue("description", compData.description || "");
      setProfileValue("logo_url", compData.logo_url || "");
      setVisibility(compData.default_project_visibility || "PRIVATE");

      // Load subscription details if user is authorized CTO / Owner
      if (role === "OWNER") {
        await fetchSubscriptionData();
      }
    } catch (err: any) {
      console.error("Failed to load company settings", err);
    } finally {
      setLoading(false);
    }
  }, [setProfileValue, fetchSubscriptionData]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const res = await api.patch("/companies/me", {
        name: data.name.trim(),
        description: data.description || null,
        logo_url: data.logo_url || null,
      });
      setCompany(res.data.data);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: Only Company Owners or Admins can update profile."
          : err.response?.data?.message || "Failed to update profile.";
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const onSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(false);
    setSettingsError(null);
    try {
      const res = await api.patch("/companies/me/settings", {
        default_project_visibility: visibility,
      });
      setCompany(res.data.data);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: Only Company Owners or Admins can update settings."
          : err.response?.data?.message || "Failed to update settings.";
      setSettingsError(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  // Plan Selection Handler
  const onInitiatePlanChange = (plan: AuthoritativePlan) => {
    if (company?.subscription_plan === plan.code) return;

    if (plan.code === "ENTERPRISE") {
      if (enterpriseRequest?.status === "PAYMENT_PENDING") {
        const approvedPrice = enterpriseRequest.calculated_price || 5000;
        const enterprisePlanObj: AuthoritativePlan = {
          code: "ENTERPRISE",
          name: "Enterprise Custom",
          price: approvedPrice,
          price_display: `₹${approvedPrice.toLocaleString("en-IN")} / month`,
          currency: "INR",
          billing_period: "monthly",
          description: "Approved custom enterprise plan with tailored resource quotas and capabilities.",
          cta_text: "Proceed to Payment",
          is_popular: false,
          limits: {
            max_team_members: enterpriseRequest.approved_resources?.max_users ?? -1,
            max_active_projects: enterpriseRequest.approved_resources?.max_projects ?? -1,
            max_storage_bytes: enterpriseRequest.approved_resources?.max_storage_bytes ?? -1,
            max_storage_display:
              enterpriseRequest.approved_resources?.max_storage_bytes === -1
                ? "Unlimited"
                : `${Math.round((enterpriseRequest.approved_resources?.max_storage_bytes || 0) / (1024 * 1024 * 1024))} GB`,
            max_ai_executions_monthly: enterpriseRequest.approved_resources?.max_ai_executions ?? -1,
            max_automation_workflows: enterpriseRequest.approved_resources?.max_automation_workflows ?? -1,
          },
          included_features: enterpriseRequest.approved_capabilities || [],
          unavailable_features: [],
        };
        setSelectedUpgradePlan(enterprisePlanObj);
        setCheckoutModalOpen(true);
        return;
      }
      setEnterpriseModalOpen(true);
      return;
    }

    if (plan.code === "FREE") {
      handleDowngradeToFree();
      return;
    }

    // Paid Tier (STARTER or PRO) -> Launch Razorpay Checkout Flow
    setSelectedUpgradePlan(plan);
    setCheckoutModalOpen(true);
  };

  const handleDowngradeToFree = async () => {
    if (!confirm("Are you sure you want to switch to the Free tier? Advanced AI and capacity limits will revert to Free allowances.")) {
      return;
    }
    setDowngradingToFree(true);
    setPlanError(null);
    setPlanSuccess(null);
    try {
      const res = await api.post("/subscriptions/free", { plan: "FREE" });
      setPlanSuccess(res.data.data.message || "Your organization plan has been updated to Free.");
      await fetchCompanyData();
      await fetchSubscriptionData();
      setTimeout(() => setPlanSuccess(null), 5000);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to switch to Free plan.";
      setPlanError(msg);
    } finally {
      setDowngradingToFree(false);
    }
  };

  const handlePaymentSuccess = async (result: any) => {
    setPlanSuccess(result.message || "Payment verified and subscription activated successfully!");
    await fetchCompanyData();
    await fetchSubscriptionData();
    setTimeout(() => setPlanSuccess(null), 6000);
  };

  // RBAC permissions
  const isOwner = userRole === "OWNER";
  const isAdminOrOwner = userRole === "OWNER" || userRole === "ADMIN";

  // Active plans list: use backend authoritative if loaded, otherwise fallback to local definitions
  const displayedPlans: AuthoritativePlan[] =
    authoritativePlans.length > 0
      ? authoritativePlans
      : PLANS_LIST.map((p) => ({
          code: p.id,
          name: p.name,
          price: p.price_inr,
          price_display: p.price,
          currency: p.currency,
          billing_period: p.billing_period,
          description: p.description,
          cta_text: p.cta_text,
          is_popular: p.is_popular,
          limits: p.limits,
          included_features: p.included_features,
          unavailable_features: p.unavailable_features,
        }));

  return (
    <ProtectedShell pageTitle="Company Settings">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Company Administration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage organization profile, workspace parameters, and subscription billing.
            </p>
          </div>
          {company && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-2xs">
                <Zap className="size-3.5" />
                {company.subscription_plan} Plan
              </span>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {/* Access Restricted for non-admins */}
        {!loading && !isAdminOrOwner && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg mx-auto">
            <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Only Company Owners and Admins are authorized to view and modify company settings.
            </p>
          </div>
        )}

        {/* Content Tabs */}
        {!loading && isAdminOrOwner && company && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "profile"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="size-4" /> Profile
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "settings"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sliders className="size-4" /> Workspace Settings
              </button>
              <button
                onClick={() => setActiveTab("plan")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "plan"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="size-4" /> Subscription / Billing
              </button>
            </div>

            {/* TAB 1: PROFILE */}
            {activeTab === "profile" && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Company Profile</h3>
                  <p className="text-xs text-muted-foreground">
                    Public branding and organizational details.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3.5 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Company profile updated successfully.</span>
                  </div>
                )}

                {profileError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      {...registerProfile("name")}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {profileErrors.name && (
                      <p className="mt-1 text-xs text-destructive">{profileErrors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Company Description
                    </label>
                    <textarea
                      {...registerProfile("description")}
                      rows={4}
                      placeholder="Brief overview of your company or organization..."
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Company Logo URL
                    </label>
                    <input
                      type="url"
                      {...registerProfile("logo_url")}
                      placeholder="https://example.com/logo.png"
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Profile Changes
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: WORKSPACE SETTINGS */}
            {activeTab === "settings" && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Default Project Visibility</h3>
                  <p className="text-xs text-muted-foreground">
                    Set baseline access defaults for newly created project boards.
                  </p>
                </div>

                {settingsSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3.5 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Company settings saved successfully.</span>
                  </div>
                )}

                {settingsError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{settingsError}</span>
                  </div>
                )}

                <div className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        id: "PRIVATE",
                        title: "Private (Restricted)",
                        desc: "Only explicitly assigned project members can view and access boards.",
                        icon: Lock,
                      },
                      {
                        id: "INTERNAL",
                        title: "Internal (Company Members)",
                        desc: "All authenticated team members inside your company can view projects.",
                        icon: Eye,
                      },
                      {
                        id: "PUBLIC",
                        title: "Public (Organization Wide)",
                        desc: "Fully accessible workspace boards for open cross-team collaboration.",
                        icon: Globe,
                      },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = visibility === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setVisibility(opt.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-2xs"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-foreground flex items-center justify-between">
                              <span>{opt.title}</span>
                              {isSelected && <Check className="size-4 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={onSaveSettings}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Workspace Settings
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: SUBSCRIPTION / BILLING */}
            {activeTab === "plan" && (
              <div className="space-y-8">
                {/* CTO Authorization Guard Banner */}
                {!isOwner && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs">
                    <ShieldCheck className="size-5 shrink-0 text-amber-500" />
                    <span>
                      <strong>View-Only Mode:</strong> Only the Organization CTO / Owner possesses authority to initiate upgrades or modify company billing.
                    </span>
                  </div>
                )}

                {/* Notifications */}
                {planSuccess && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span>{planSuccess}</span>
                  </div>
                )}

                {planError && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 font-medium">
                    <AlertCircle className="size-5 shrink-0" />
                    <span>{planError}</span>
                  </div>
                )}

                {/* 1. CURRENT PLAN SECTION */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
                    <div>
                      <span className="text-[0.7rem] font-black uppercase tracking-wider text-primary block">
                        Organization Billing Status
                      </span>
                      <h3 className="text-xl font-extrabold text-foreground mt-0.5">
                        Current Subscription: {currentSubscription?.plan_name || company.subscription_plan}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentSubscription?.plan === "FREE"
                          ? "Your organization is operating on the Free tier."
                          : "Your active paid entitlement is verified and active."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        {currentSubscription?.status || "ACTIVE"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-[0.7rem] uppercase font-bold text-muted-foreground block">
                        Price Rate
                      </span>
                      <div className="text-lg font-black text-foreground mt-1">
                        {currentSubscription?.price_display || (company.subscription_plan === "PRO" ? "₹1,999 / month" : company.subscription_plan === "STARTER" ? "₹799 / month" : "₹0 / month")}
                      </div>
                      <span className="text-[0.7rem] text-muted-foreground">Billed in INR</span>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-[0.7rem] uppercase font-bold text-muted-foreground block">
                        Billing Period
                      </span>
                      <div className="text-lg font-black text-foreground mt-1 flex items-center gap-1.5">
                        <Calendar className="size-4 text-primary" /> Monthly
                      </div>
                      <span className="text-[0.7rem] text-muted-foreground">30-Day Entitlement</span>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-[0.7rem] uppercase font-bold text-muted-foreground block">
                        Active Since
                      </span>
                      <div className="text-sm font-bold text-foreground mt-1.5 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary" />
                        {currentSubscription?.current_period_start
                          ? new Date(currentSubscription.current_period_start).toLocaleDateString()
                          : new Date(company.created_at).toLocaleDateString()}
                      </div>
                      <span className="text-[0.7rem] text-muted-foreground">Organization inception</span>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-[0.7rem] uppercase font-bold text-muted-foreground block">
                        Renewal / Expiry
                      </span>
                      <div className="text-sm font-bold text-foreground mt-1.5">
                        {currentSubscription?.current_period_end ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Continuous (Free Tier)</span>
                        )}
                      </div>
                      <span className="text-[0.7rem] text-muted-foreground">
                        {currentSubscription?.current_period_end ? "Local entitlement period" : "No expiry on Free"}
                      </span>
                    </div>
                  </div>

                  {/* Active Limits Bar */}
                  {currentSubscription?.limits && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-primary block">
                        Current Active Plan Limits
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <div>
                          <span className="text-[0.7rem] text-muted-foreground block">Team Members</span>
                          <span className="font-bold text-foreground">
                            {currentSubscription.limits.max_team_members < 0 ? "Unlimited" : `Up to ${currentSubscription.limits.max_team_members}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[0.7rem] text-muted-foreground block">Active Projects</span>
                          <span className="font-bold text-foreground">
                            {currentSubscription.limits.max_active_projects < 0 ? "Unlimited" : `Up to ${currentSubscription.limits.max_active_projects}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[0.7rem] text-muted-foreground block">AI Executions</span>
                          <span className="font-bold text-foreground">
                            {currentSubscription.limits.max_ai_executions_monthly < 0 ? "Unlimited" : `${currentSubscription.limits.max_ai_executions_monthly} / mo`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[0.7rem] text-muted-foreground block">Storage</span>
                          <span className="font-bold text-foreground">{currentSubscription.limits.max_storage_display}</span>
                        </div>
                        <div>
                          <span className="text-[0.7rem] text-muted-foreground block">Automations</span>
                          <span className="font-bold text-foreground">
                            {currentSubscription.limits.max_automation_workflows < 0 ? "Unlimited" : currentSubscription.limits.max_automation_workflows === 0 ? "None" : `Up to ${currentSubscription.limits.max_automation_workflows}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ENTERPRISE CUSTOM REQUEST STATUS BANNER */}
                {enterpriseRequest && (
                  <>
                    {(enterpriseRequest.status === "PENDING" || enterpriseRequest.status === "UNDER_REVIEW") && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-amber-500/20">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                              <Clock className="size-5" />
                            </span>
                            <div>
                              <h4 className="text-base font-bold text-foreground">
                                Custom Enterprise Request Under Review
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Submitted on {new Date(enterpriseRequest.created_at).toLocaleDateString()}. Super Admin review in progress.
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 self-start sm:self-auto">
                            Pending Super Admin Review
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                          <div>
                            <span className="text-[0.7rem] text-muted-foreground block">Requested Seats</span>
                            <span className="font-bold text-foreground">
                              {enterpriseRequest.requested_resources?.max_users === -1 ? "Unlimited" : enterpriseRequest.requested_resources?.max_users}
                            </span>
                          </div>
                          <div>
                            <span className="text-[0.7rem] text-muted-foreground block">Requested Projects</span>
                            <span className="font-bold text-foreground">
                              {enterpriseRequest.requested_resources?.max_projects === -1 ? "Unlimited" : enterpriseRequest.requested_resources?.max_projects}
                            </span>
                          </div>
                          <div>
                            <span className="text-[0.7rem] text-muted-foreground block">Cloud Storage</span>
                            <span className="font-bold text-foreground">
                              {enterpriseRequest.requested_resources?.max_storage_bytes === -1
                                ? "Unlimited"
                                : `${Math.round((enterpriseRequest.requested_resources?.max_storage_bytes || 0) / (1024 * 1024 * 1024))} GB`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[0.7rem] text-muted-foreground block">AI Executions</span>
                            <span className="font-bold text-foreground">
                              {enterpriseRequest.requested_resources?.max_ai_executions === -1
                                ? "Unlimited"
                                : `${enterpriseRequest.requested_resources?.max_ai_executions} / mo`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[0.7rem] text-muted-foreground block">Workflows</span>
                            <span className="font-bold text-foreground">
                              {enterpriseRequest.requested_resources?.max_automation_workflows === -1
                                ? "Unlimited"
                                : enterpriseRequest.requested_resources?.max_automation_workflows}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          Our team is calculating dynamic pricing tailored to your requested quotas and capabilities. You will receive a notification when your plan is approved and ready for payment.
                        </p>
                      </div>
                    )}

                    {enterpriseRequest.status === "PAYMENT_PENDING" && (
                      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-primary/20">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-lg bg-primary/10 text-primary">
                              <Sparkles className="size-5" />
                            </span>
                            <div>
                              <h4 className="text-base font-bold text-foreground">
                                Enterprise Custom Plan Approved!
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Approved on {new Date(enterpriseRequest.approved_at || enterpriseRequest.updated_at).toLocaleDateString()}. Proceed to payment to activate your custom tier.
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 self-start sm:self-auto">
                            Payment Required
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-card border border-border">
                          <div>
                            <span className="text-xs text-muted-foreground block">Authoritative Monthly Rate</span>
                            <div className="text-2xl font-black text-foreground">
                              ₹{(enterpriseRequest.calculated_price || 5000).toLocaleString("en-IN")}{" "}
                              <span className="text-xs font-normal text-muted-foreground">/ month</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              Includes {enterpriseRequest.approved_capabilities?.length || 0} dedicated enterprise capabilities
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              onInitiatePlanChange({
                                code: "ENTERPRISE",
                                name: "Enterprise Custom",
                                price: enterpriseRequest.calculated_price || 5000,
                                price_display: `₹${(enterpriseRequest.calculated_price || 5000).toLocaleString("en-IN")} / month`,
                                currency: "INR",
                                billing_period: "monthly",
                                description: "Approved custom enterprise tier.",
                                cta_text: "Proceed to Payment",
                                is_popular: false,
                                limits: {
                                  max_team_members: enterpriseRequest.approved_resources?.max_users ?? -1,
                                  max_active_projects: enterpriseRequest.approved_resources?.max_projects ?? -1,
                                  max_storage_bytes: enterpriseRequest.approved_resources?.max_storage_bytes ?? -1,
                                  max_storage_display:
                                    enterpriseRequest.approved_resources?.max_storage_bytes === -1
                                      ? "Unlimited"
                                      : `${Math.round((enterpriseRequest.approved_resources?.max_storage_bytes || 0) / (1024 * 1024 * 1024))} GB`,
                                  max_ai_executions_monthly: enterpriseRequest.approved_resources?.max_ai_executions ?? -1,
                                  max_automation_workflows: enterpriseRequest.approved_resources?.max_automation_workflows ?? -1,
                                },
                                included_features: enterpriseRequest.approved_capabilities || [],
                                unavailable_features: [],
                              })
                            }
                            disabled={!isOwner}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <CreditCard className="size-4" />
                            Review & Proceed to Payment
                          </button>
                        </div>
                      </div>
                    )}

                    {enterpriseRequest.status === "REJECTED" && (
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                            <AlertCircle className="size-4" /> Custom Enterprise Request Declined
                          </div>
                          <button
                            onClick={() => setEnterpriseModalOpen(true)}
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Submit New Request
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {enterpriseRequest.rejection_reason ||
                            "Your request could not be approved at this time. You can submit a revised configuration."}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* 2. PLAN COMPARISON SECTION */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Available Subscription Plans</h3>
                    <p className="text-xs text-muted-foreground">
                      Authoritative prices in INR. All payments are encrypted and securely verified.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                    {displayedPlans.map((plan) => {
                      const isCurrent = company.subscription_plan === plan.code;
                      const isPaidTier = plan.code === "STARTER" || plan.code === "PRO";
                      const isEnterprise = plan.code === "ENTERPRISE";
                      const isFree = plan.code === "FREE";

                      return (
                        <div
                          key={plan.code}
                          className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                            plan.is_popular
                              ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                              : isCurrent
                              ? "border-primary/60 bg-card shadow-sm"
                              : "border-border bg-card shadow-2xs hover:border-primary/40"
                          }`}
                        >
                          {/* Most Popular Badge */}
                          {plan.is_popular && (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[0.65rem] font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-sm flex items-center gap-1">
                              <Sparkles className="size-3" /> Most Popular
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                                {plan.name}
                              </span>
                              {isCurrent && (
                                <span className="px-2.5 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                                  Current Plan
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="text-2xl font-black text-foreground">
                                {plan.price_display}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                                {plan.description}
                              </p>
                            </div>

                            {/* Limits Preview */}
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-foreground">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Users className="size-3.5 text-primary" /> Members:
                                </span>
                                <span className="font-semibold">
                                  {plan.limits.max_team_members < 0 ? "Unlimited" : `Up to ${plan.limits.max_team_members}`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-foreground">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <FolderKanban className="size-3.5 text-primary" /> Projects:
                                </span>
                                <span className="font-semibold">
                                  {plan.limits.max_active_projects < 0 ? "Unlimited" : `Up to ${plan.limits.max_active_projects}`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-foreground">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Bot className="size-3.5 text-primary" /> AI Quota:
                                </span>
                                <span className="font-semibold">
                                  {plan.limits.max_ai_executions_monthly < 0 ? "Unlimited" : `${plan.limits.max_ai_executions_monthly} / mo`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-foreground">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <HardDrive className="size-3.5 text-primary" /> Storage:
                                </span>
                                <span className="font-semibold">{plan.limits.max_storage_display}</span>
                              </div>

                              <div className="flex items-center justify-between text-foreground">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Workflow className="size-3.5 text-primary" /> Automations:
                                </span>
                                <span className="font-semibold">
                                  {plan.limits.max_automation_workflows < 0
                                    ? "Unlimited"
                                    : plan.limits.max_automation_workflows === 0
                                    ? "None"
                                    : `Up to ${plan.limits.max_automation_workflows}`}
                                </span>
                              </div>
                            </div>

                            {/* Included Features */}
                            <div className="pt-3 border-t border-border space-y-2">
                              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground block">
                                Included Features
                              </span>
                              {plan.included_features.map((feat, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                                  <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </div>
                              ))}
                            </div>

                            {/* Unavailable Features */}
                            {plan.unavailable_features.length > 0 && (
                              <div className="pt-3 border-t border-border/50 space-y-1.5">
                                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground/60 block">
                                  Not Included
                                </span>
                                {plan.unavailable_features.map((feat, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground/50 line-through">
                                    <X className="size-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                                    <span>{feat}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="mt-6">
                            {isCurrent ? (
                              <button
                                disabled
                                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground cursor-default border border-border"
                              >
                                Current Plan
                              </button>
                            ) : isPaidTier ? (
                              <button
                                onClick={() => onInitiatePlanChange(plan)}
                                disabled={!isOwner}
                                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                                  plan.is_popular
                                    ? "bg-primary text-primary-foreground hover:bg-primary/95"
                                    : "bg-primary/90 text-primary-foreground hover:bg-primary"
                                } disabled:opacity-50`}
                              >
                                Upgrade to {plan.name}
                              </button>
                            ) : isFree ? (
                              <button
                                onClick={() => onInitiatePlanChange(plan)}
                                disabled={!isOwner || downgradingToFree}
                                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-border hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50"
                              >
                                {downgradingToFree ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Downgrade to Free"}
                              </button>
                              ) : isEnterprise ? (
                                <button
                                  onClick={() => onInitiatePlanChange(plan)}
                                  disabled={
                                    !isOwner ||
                                    enterpriseRequest?.status === "PENDING" ||
                                    enterpriseRequest?.status === "UNDER_REVIEW"
                                  }
                                  className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                    enterpriseRequest?.status === "PAYMENT_PENDING"
                                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
                                      : enterpriseRequest?.status === "PENDING" ||
                                        enterpriseRequest?.status === "UNDER_REVIEW"
                                      ? "border-amber-500/40 text-amber-500 bg-amber-500/5 cursor-default opacity-80"
                                      : "border-primary/40 text-primary hover:bg-primary/10"
                                  }`}
                                >
                                  {enterpriseRequest?.status === "PAYMENT_PENDING"
                                    ? `Pay & Activate (₹${(enterpriseRequest.calculated_price || 5000).toLocaleString("en-IN")})`
                                    : enterpriseRequest?.status === "PENDING" ||
                                      enterpriseRequest?.status === "UNDER_REVIEW"
                                    ? "Under Review"
                                    : "Configure Enterprise Plan"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => onInitiatePlanChange(plan)}
                                  className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-primary/40 text-primary hover:bg-primary/10 transition-all cursor-pointer"
                                >
                                  Contact Sales
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. RECENT BILLING TRANSACTIONS */}
                {currentSubscription?.recent_payments && currentSubscription.recent_payments.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-5 text-primary" />
                      <h4 className="text-base font-bold text-foreground">Recent Billing Transactions</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[0.7rem] uppercase bg-muted/40 text-muted-foreground border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Payment Reference</th>
                            <th className="py-2.5 px-3">Transaction ID</th>
                            <th className="py-2.5 px-3">Amount (INR)</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {currentSubscription.recent_payments.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-3 text-muted-foreground">
                                {new Date(p.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-3 font-mono text-foreground font-medium">
                                {p.razorpay_order_id}
                              </td>
                              <td className="py-3 px-3 font-mono text-muted-foreground">
                                {p.razorpay_payment_id || "—"}
                              </td>
                              <td className="py-3 px-3 font-bold text-foreground">
                                ₹{p.amount_inr.toLocaleString()}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Razorpay Checkout Modal */}
        <RazorpayCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          targetPlan={selectedUpgradePlan}
          currentPlan={company?.subscription_plan || "FREE"}
          onSuccess={handlePaymentSuccess}
        />

        {/* Enterprise Custom Plan Configuration Modal */}
        <EnterpriseConfigModal
          isOpen={enterpriseModalOpen}
          onClose={() => setEnterpriseModalOpen(false)}
          onSubmit={handleEnterpriseSubmit}
          initialValues={
            enterpriseRequest?.requested_resources
              ? {
                  max_users: enterpriseRequest.requested_resources.max_users,
                  max_projects: enterpriseRequest.requested_resources.max_projects,
                  max_storage_bytes: enterpriseRequest.requested_resources.max_storage_bytes,
                  max_ai_executions: enterpriseRequest.requested_resources.max_ai_executions,
                  max_automation_workflows: enterpriseRequest.requested_resources.max_automation_workflows,
                  capabilities: enterpriseRequest.requested_capabilities,
                  business_justification: enterpriseRequest.business_justification,
                }
              : undefined
          }
        />
      </div>
    </ProtectedShell>
  );
}
