"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import { PLANS_LIST, SubscriptionPlanId } from "@/lib/plans";
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

  // Profile Form state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Settings Form state
  const [visibility, setVisibility] = useState("PRIVATE");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Plan Update state
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: customResolver(profileSchema) as any,
  });

  const fetchCompanyData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, companyRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/companies/me"),
      ]);
      setUserRole(meRes.data.data.role);
      const compData: CompanyData = companyRes.data.data;
      setCompany(compData);
      setProfileValue("name", compData.name);
      setProfileValue("description", compData.description || "");
      setProfileValue("logo_url", compData.logo_url || "");
      setVisibility(compData.default_project_visibility || "PRIVATE");
    } catch (err: any) {
      console.error("Failed to load company settings", err);
    } finally {
      setLoading(false);
    }
  }, [setProfileValue]);

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

  const onSelectPlan = async (planId: string) => {
    if (company?.subscription_plan === planId) return;
    setUpdatingPlan(planId);
    setPlanSuccess(false);
    setPlanError(null);
    try {
      const res = await api.patch("/companies/me/plan", {
        subscription_plan: planId,
      });
      setCompany(res.data.data);
      setPlanSuccess(true);
      setTimeout(() => setPlanSuccess(false), 4000);
    } catch (err: any) {
      const msg =
        err.response?.status === 403
          ? "Permission Denied: Only Company Owners or Admins can change subscription plan."
          : err.response?.data?.message || "Failed to update subscription plan.";
      setPlanError(msg);
    } finally {
      setUpdatingPlan(null);
    }
  };

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <ProtectedShell pageTitle="Company Settings">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Company Administration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage organization profile, workspace parameters, and subscription tiers.
            </p>
          </div>
          {company && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
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
        {!loading && !isAdmin && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg mx-auto">
            <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Only Company Owners and Admins are authorized to view and modify company settings.
            </p>
          </div>
        )}

        {/* Content Tabs */}
        {!loading && isAdmin && company && (
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
                <CreditCard className="size-4" /> Plan & Subscription
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
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
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
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background resize-none"
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
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
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

            {/* TAB 3: PLAN & SUBSCRIPTION */}
            {activeTab === "plan" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Synapse Official Subscription Plans</h3>
                  <p className="text-xs text-muted-foreground">
                    Select the tier that matches your team scale and required AI project intelligence features.
                  </p>
                </div>

                {planSuccess && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3.5 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Subscription plan updated successfully!</span>
                  </div>
                )}

                {planError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{planError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                  {PLANS_LIST.map((plan) => {
                    const isCurrent = company.subscription_plan === plan.id;
                    const isUpdating = updatingPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
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
                                Active Tier
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="text-2xl font-extrabold text-foreground">{plan.price}</div>
                            <p className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                              {plan.description}
                            </p>
                          </div>

                          {/* Structured Entitlements & Limits */}
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

                        <div className="mt-6">
                          <button
                            onClick={() => onSelectPlan(plan.id)}
                            disabled={isCurrent || !!updatingPlan}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-muted text-muted-foreground cursor-default border border-border"
                                : plan.is_popular
                                ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md"
                                : "bg-primary/90 text-primary-foreground hover:bg-primary shadow-2xs"
                            } disabled:opacity-50`}
                          >
                            {isUpdating ? (
                              <Loader2 className="size-4 animate-spin mx-auto" />
                            ) : isCurrent ? (
                              "Current Tier"
                            ) : (
                              plan.cta_text
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
