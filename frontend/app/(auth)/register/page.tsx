"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Check,
  Zap,
} from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import RazorpayCheckoutModal from "@/components/billing/RazorpayCheckoutModal";
import EnterpriseConfigModal from "@/components/billing/EnterpriseConfigModal";
import {
  PLANS_LIST,
  PLAN_DEFINITIONS,
  toAuthoritativePlan,
  SubscriptionPlanId,
  PlanDefinition,
  AuthoritativePlan,
} from "@/lib/plans";

const nameRegex = /^[a-zA-Z\s'\-\.]+$/;

const registerSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters."),
  first_name: z
    .string()
    .min(1, "First name is required.")
    .regex(nameRegex, "First name can only contain letters, spaces, hyphens, and apostrophes."),
  last_name: z
    .string()
    .min(1, "Last name is required.")
    .regex(nameRegex, "Last name can only contain letters, spaces, hyphens, and apostrophes."),
  email: z.string().email("Invalid email format."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  designation: z.string().optional(),
  subscription_plan: z.enum(["FREE", "STARTER", "PRO", "ENTERPRISE"]).default("FREE"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const customResolver = (schema: z.ZodSchema) => async (data: any) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const issues = result.error.issues || (result.error as any).errors || [];
  const errors = issues.reduce((acc: any, err: any) => {
    const path = err.path.join(".") || "form";
    acc[path] = {
      message: err.message,
      type: "validation",
    };
    return acc;
  }, {});
  return { values: {}, errors };
};

interface RegistrationResult {
  completed: boolean;
  plan: SubscriptionPlanId;
  paymentPreference: "PROCEED" | "PAY_LATER" | null;
  paymentPaid: boolean;
  reminderSent: boolean;
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Plan Selection & Payment States
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>("FREE");
  const [paymentPreference, setPaymentPreference] = useState<"PROCEED" | "PAY_LATER" | null>(null);

  // Plan Choice Modal (Proceed vs Pay Later)
  const [planPopupOpen, setPlanPopupOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanDefinition | null>(null);

  // Checkout Modal States
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTargetPlan, setCheckoutTargetPlan] = useState<AuthoritativePlan | null>(null);

  // Enterprise Configuration State
  const [enterpriseConfig, setEnterpriseConfig] = useState<any | null>(null);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);

  // Successful Registration State
  const [registrationSuccess, setRegistrationSuccess] = useState<RegistrationResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: customResolver(registerSchema) as any,
    defaultValues: {
      subscription_plan: "FREE",
    },
  });

  const handlePlanCardClick = (plan: PlanDefinition) => {
    if (plan.id === "FREE") {
      setSelectedPlan("FREE");
      setPaymentPreference(null);
      setEnterpriseConfig(null);
      setValue("subscription_plan", "FREE");
    } else if (plan.id === "ENTERPRISE") {
      setEnterpriseModalOpen(true);
    } else {
      setPendingPlan(plan);
      setEnterpriseConfig(null);
      setPlanPopupOpen(true);
    }
  };

  const handleEnterpriseConfigSubmit = (config: any) => {
    setEnterpriseConfig(config);
    setSelectedPlan("ENTERPRISE");
    setPaymentPreference(null);
    setValue("subscription_plan", "ENTERPRISE");
    setEnterpriseModalOpen(false);
  };

  const handleChooseProceedPayment = () => {
    if (!pendingPlan) return;
    setSelectedPlan(pendingPlan.id);
    setPaymentPreference("PROCEED");
    setEnterpriseConfig(null);
    setValue("subscription_plan", pendingPlan.id);
    setPlanPopupOpen(false);
  };

  const handleChoosePayLater = () => {
    if (!pendingPlan) return;
    setSelectedPlan(pendingPlan.id);
    setPaymentPreference("PAY_LATER");
    setEnterpriseConfig(null);
    setValue("subscription_plan", pendingPlan.id);
    setPlanPopupOpen(false);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    // If Enterprise is selected but config hasn't been created yet, open modal
    if (selectedPlan === "ENTERPRISE" && !enterpriseConfig) {
      setEnterpriseModalOpen(true);
      return;
    }

    // If a paid plan is selected but preference hasn't been chosen yet, open modal
    if (selectedPlan !== "FREE" && selectedPlan !== "ENTERPRISE" && !paymentPreference) {
      setPendingPlan(PLAN_DEFINITIONS[selectedPlan]);
      setPlanPopupOpen(true);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...data,
        subscription_plan: selectedPlan,
        payment_preference: selectedPlan === "ENTERPRISE" ? null : paymentPreference,
        enterprise_config: selectedPlan === "ENTERPRISE" ? enterpriseConfig : undefined,
      };

      const res = await api.post("/auth/register", payload);
      const resData = res.data?.data || {};

      // If an access token was issued, store it for authenticated requests
      if (resData.access_token) {
        localStorage.setItem("synapse_access_token", resData.access_token);
      }

      if (selectedPlan === "ENTERPRISE") {
        setRegistrationSuccess({
          completed: true,
          plan: "ENTERPRISE",
          paymentPreference: null,
          paymentPaid: false,
          reminderSent: false,
        });
      } else if (paymentPreference === "PROCEED" && selectedPlan !== "FREE") {
        // Open Razorpay Checkout modal for immediate payment
        const target = toAuthoritativePlan(PLAN_DEFINITIONS[selectedPlan]);
        setCheckoutTargetPlan(target);
        setCheckoutOpen(true);
      } else {
        // Free tier or Pay Later
        setRegistrationSuccess({
          completed: true,
          plan: selectedPlan,
          paymentPreference: paymentPreference,
          paymentPaid: false,
          reminderSent: resData.payment_reminder_sent || paymentPreference === "PAY_LATER",
        });
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Registration failed. Please check your inputs.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setRegistrationSuccess({
      completed: true,
      plan: selectedPlan,
      paymentPreference: "PROCEED",
      paymentPaid: true,
      reminderSent: false,
    });
    setCheckoutOpen(false);
  };

  const handlePaymentDismiss = () => {
    setCheckoutOpen(false);
    // User already registered; treat as Pay Later with reminder
    setRegistrationSuccess({
      completed: true,
      plan: selectedPlan,
      paymentPreference: "PAY_LATER",
      paymentPaid: false,
      reminderSent: true,
    });
  };

  // 1. REGISTRATION SUCCESS VIEW
  if (registrationSuccess?.completed) {
    const isPaid = registrationSuccess.paymentPaid;
    const isPayLater = registrationSuccess.paymentPreference === "PAY_LATER";
    const planName = PLAN_DEFINITIONS[registrationSuccess.plan]?.name || registrationSuccess.plan;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-6">
          <div className="flex justify-center">
            {isPaid ? (
              <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="size-10" />
              </div>
            ) : isPayLater ? (
              <div className="size-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 relative">
                <Bell className="size-8" />
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 border-2 border-card" />
              </div>
            ) : (
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <CheckCircle2 className="size-10" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              {isPaid
                ? "Registration & Payment Complete!"
                : "Organization Registered Successfully!"}
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <Zap className="size-3.5" /> {planName} Plan
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed text-left space-y-2">
            {registrationSuccess.plan === "ENTERPRISE" ? (
              <div className="space-y-2">
                <p>
                  Your organization account is created! Your <strong>Enterprise Custom Plan</strong> request has been submitted to Super Admin for dynamic pricing review.
                </p>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-foreground">
                  <Sparkles className="size-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong>Under Review:</strong> Our team is calculating your authoritative monthly rate based on your customized quotas and capabilities. Once approved, you can complete payment and activate your dedicated enterprise tier directly from your dashboard.
                  </span>
                </div>
              </div>
            ) : isPaid ? (
              <p>
                Your payment has been cryptographically verified and your <strong>{planName}</strong> plan entitlement is active. Your organization has full access to all premium intelligence and workflow features.
              </p>
            ) : isPayLater ? (
              <div className="space-y-2">
                <p>
                  Your organization account is created under the <strong>{planName}</strong> plan.
                </p>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <Bell className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Payment Reminder Sent:</strong> A notification has been placed on your account. You can complete your subscription payment anytime in Organization Settings.
                  </span>
                </div>
              </div>
            ) : (
              <p>
                Your organization account is active and operating on the <strong>Free tier</strong>. You can invite your team and start managing projects immediately.
              </p>
            )}
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/95 shadow-md"
            >
              <span>Go to Login</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-xl dark:bg-card">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-xs">
              S
            </div>
            <span className="text-xl font-extrabold tracking-wider text-foreground">SYNAPSE</span>
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">
            Create your organization account
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Empower your engineering team with autonomous AI workflows & project intelligence.
          </p>
        </div>

        {/* Google Sign-Up */}
        <div className="mt-6">
          <GoogleSignInButton context="signup" />
        </div>

        {/* Divider */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground font-medium">or register with email</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20 leading-relaxed">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Company / Organization Name
            </label>
            <input
              type="text"
              {...register("company_name")}
              placeholder="e.g. Acme Technologies"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.company_name && (
              <p className="mt-1 text-xs text-destructive">
                {errors.company_name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                First Name
              </label>
              <input
                type="text"
                {...register("first_name")}
                placeholder="Jane"
                suppressHydrationWarning
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Last Name
              </label>
              <input
                type="text"
                {...register("last_name")}
                placeholder="Doe"
                suppressHydrationWarning
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="jane.doe@acme.com"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Designation / Job Title (Optional)
            </label>
            <input
              type="text"
              {...register("designation")}
              placeholder="e.g. Chief Technology Officer (CTO)"
              suppressHydrationWarning
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.designation && (
              <p className="mt-1 text-xs text-destructive">
                {errors.designation.message}
              </p>
            )}
          </div>

          {/* 2. SUBSCRIPTION PLAN SELECTION */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Select Subscription Plan
                </label>
                <span className="text-[0.7rem] text-muted-foreground">
                  Choose a tier for your organization. You can pay now or pay later.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PLANS_LIST.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handlePlanCardClick(plan)}
                    className={`relative flex flex-col items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    {plan.is_popular && (
                      <span className="absolute -top-2.5 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider bg-primary text-primary-foreground rounded-full shadow-xs">
                        Popular
                      </span>
                    )}
                    <div className="text-center w-full">
                      <span className="text-xs font-extrabold text-foreground block">
                        {plan.name}
                      </span>
                      <span className="text-[0.75rem] font-black text-primary block mt-0.5">
                        {plan.price}
                      </span>
                    </div>
                    <span className="text-[0.65rem] text-muted-foreground text-center mt-1.5 line-clamp-2 leading-tight">
                      {plan.description}
                    </span>
                    {isSelected && (
                      <div className="mt-2 size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="size-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Plan Status & Payment Mode Indicator */}
            {selectedPlan === "ENTERPRISE" && enterpriseConfig && (
              <div className="mt-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground">
                      Enterprise Custom Plan Configured
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                      Custom Quotas
                    </span>
                  </div>
                  <div className="text-[0.7rem] text-muted-foreground flex flex-wrap gap-x-2.5 gap-y-0.5">
                    <span>
                      Seats:{" "}
                      <strong>
                        {enterpriseConfig.requested_resources?.max_users === -1
                          ? "Unlimited"
                          : enterpriseConfig.requested_resources?.max_users}
                      </strong>
                    </span>
                    <span>
                      Storage:{" "}
                      <strong>
                        {enterpriseConfig.requested_resources?.max_storage_bytes === -1
                          ? "Unlimited"
                          : `${Math.round(
                              (enterpriseConfig.requested_resources?.max_storage_bytes || 0) /
                                (1024 * 1024 * 1024)
                            )} GB`}
                      </strong>
                    </span>
                    <span>
                      Capabilities:{" "}
                      <strong>{enterpriseConfig.requested_capabilities?.length || 0} active</strong>
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-primary font-medium">
                    No immediate payment required. Super Admin will review and provide dynamic pricing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnterpriseModalOpen(true)}
                  className="shrink-0 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}

            {selectedPlan !== "FREE" && selectedPlan !== "ENTERPRISE" && (
              <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-foreground">
                      {PLAN_DEFINITIONS[selectedPlan].name} Plan Selected
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                      {paymentPreference === "PROCEED" ? "Pay Now" : "Pay Later"}
                    </span>
                  </div>
                  <p className="text-[0.7rem] text-muted-foreground">
                    {paymentPreference === "PROCEED"
                      ? "Secure payment checkout will launch upon registration."
                      : "A reminder notification will be sent to your account to pay subscription fee later."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPlan(PLAN_DEFINITIONS[selectedPlan]);
                    setPlanPopupOpen(true);
                  }}
                  className="shrink-0 text-[0.7rem] font-bold text-primary hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            suppressHydrationWarning
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-md mt-6"
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            <span>
              {selectedPlan === "ENTERPRISE"
                ? "Register & Submit Enterprise Request"
                : selectedPlan !== "FREE" && paymentPreference === "PROCEED"
                ? "Register & Proceed to Payment"
                : "Register Organization"}
            </span>
            {!isLoading && <ArrowRight className="size-4" />}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>

      {/* 3. POPUP MODAL: PROCEED WITH PAYMENT OR PAY LATER */}
      {planPopupOpen && pendingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-foreground animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setPlanPopupOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div>
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="size-3.5" /> Plan Selection
              </div>
              <h3 className="text-xl font-extrabold text-foreground">
                {pendingPlan.name} Plan ({pendingPlan.price})
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingPlan.description}
              </p>
            </div>

            {/* Key Features Preview */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-foreground block mb-1">
                Included in this plan:
              </span>
              {pendingPlan.included_features.slice(0, 3).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-foreground">
                  <Check className="size-3.5 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Payment Decision Prompt */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-bold text-foreground block">
                How would you like to proceed with the subscription fee?
              </span>

              {/* Option 1: Proceed with Payment */}
              <div
                onClick={handleChooseProceedPayment}
                className="group p-4 rounded-xl border border-border hover:border-primary bg-card hover:bg-primary/5 transition-all cursor-pointer flex items-start gap-3.5"
              >
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <CreditCard className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">
                      Proceed with Payment
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-black uppercase bg-primary/10 text-primary">
                      Instant Access
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Complete your checkout right away when you register. Full entitlement is instantly verified.
                  </p>
                </div>
              </div>

              {/* Option 2: Pay Later */}
              <div
                onClick={handleChoosePayLater}
                className="group p-4 rounded-xl border border-border hover:border-amber-500 bg-card hover:bg-amber-500/5 transition-all cursor-pointer flex items-start gap-3.5"
              >
                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Bell className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">
                      Pay Later
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Reminder Notification
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Register now and pay later. A reminder notification will be dispatched to your account dashboard to complete your subscription fee.
                  </p>
                </div>
              </div>
            </div>

            {/* Cancel / Keep Free Tier Option */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("FREE");
                  setPaymentPreference(null);
                  setValue("subscription_plan", "FREE");
                  setPlanPopupOpen(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
              >
                Keep Free Plan instead
              </button>
              <button
                type="button"
                onClick={() => setPlanPopupOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. RAZORPAY CHECKOUT MODAL */}
      <RazorpayCheckoutModal
        isOpen={checkoutOpen}
        onClose={handlePaymentDismiss}
        targetPlan={checkoutTargetPlan}
        currentPlan="FREE"
        onSuccess={handlePaymentSuccess}
      />

      {/* 5. ENTERPRISE CUSTOM PLAN CONFIGURATION MODAL */}
      <EnterpriseConfigModal
        isOpen={enterpriseModalOpen}
        onClose={() => setEnterpriseModalOpen(false)}
        onSubmit={handleEnterpriseConfigSubmit}
        initialValues={
          enterpriseConfig
            ? {
                max_users: enterpriseConfig.requested_resources?.max_users,
                max_projects: enterpriseConfig.requested_resources?.max_projects,
                max_storage_bytes: enterpriseConfig.requested_resources?.max_storage_bytes,
                max_ai_executions: enterpriseConfig.requested_resources?.max_ai_executions,
                max_automation_workflows: enterpriseConfig.requested_resources?.max_automation_workflows,
                capabilities: enterpriseConfig.requested_capabilities,
                business_justification: enterpriseConfig.business_justification,
              }
            : undefined
        }
      />
    </div>
  );
}
