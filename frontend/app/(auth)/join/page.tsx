"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";
import * as z from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight, LogOut } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const joinSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email format."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type JoinFormValues = z.infer<typeof joinSchema>;

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

interface InvitationDetails {
  id: string;
  company_id: string;
  company_name: string;
  project_id: string;
  project_name: string;
  email: string;
  project_role: string;
  specialization: string | null;
  personal_message: string | null;
  inviter_name: string;
  status: string;
  is_valid: boolean;
}

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawToken = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invitation & Authenticated User Validation State
  const [validatingToken, setValidatingToken] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; first_name: string } | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: customResolver(joinSchema) as any,
  });

  const checkInvitationAndUser = useCallback(async () => {
    if (!rawToken) return;
    setValidatingToken(true);
    setErrorMsg(null);
    try {
      // 1. Validate token
      const valRes = await api.get(`/projects/invitations/validate?token=${encodeURIComponent(rawToken)}`);
      const invData = valRes.data.data;
      setInvitation(invData);
      if (invData?.email) {
        setValue("email", invData.email);
      }

      // 2. Check if user is already authenticated
      const token = localStorage.getItem("synapse_access_token");
      if (token) {
        try {
          const meRes = await api.get("/auth/me");
          setCurrentUser(meRes.data.data);
        } catch {
          setCurrentUser(null);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Invalid or expired invitation link.");
    } finally {
      setValidatingToken(false);
    }
  }, [rawToken, setValue]);

  useEffect(() => {
    checkInvitationAndUser();
  }, [checkInvitationAndUser]);

  const handleExplicitAccept = async () => {
    if (!rawToken && !invitation) return;
    setAcceptingInvite(true);
    setErrorMsg(null);
    try {
      const payload = rawToken ? { token: rawToken } : { invitation_id: invitation?.id };
      const res = await api.post("/projects/invitations/accept", payload);
      const projId = res.data.data.project_id;
      setSuccess(true);
      setTimeout(() => {
        router.push(`/projects/${projId}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to accept invitation.");
    } finally {
      setAcceptingInvite(false);
    }
  };

  const handleLogoutAndSwitch = () => {
    localStorage.removeItem("synapse_access_token");
    localStorage.removeItem("synapse_refresh_token");
    setCurrentUser(null);
    router.push(`/login?invitation_token=${encodeURIComponent(rawToken || "")}`);
  };

  const onSubmit = async (data: JoinFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post("/auth/register/member", {
        ...data,
        invitation_token: rawToken || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Registration failed. Make sure you have been invited by a project owner or administrator.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg transition-all dark:bg-card">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="size-16 text-emerald-500 animate-bounce" />
            <h2 className="mt-6 text-2xl font-bold text-foreground">
              Invitation Accepted!
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              You have successfully joined <span className="font-semibold text-foreground">{invitation?.project_name || "the project"}</span>. Redirecting to workspace...
            </p>
            <div className="mt-8 w-full">
              <Link
                href={invitation?.project_id ? `/projects/${invitation.project_id}` : "/projects"}
                className="flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/95"
              >
                Go to Project Workspace <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State: Token Validation Loading
  if (validatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Validating project invitation token...</p>
        </div>
      </div>
    );
  }

  // State: Authenticated User with Valid Invitation Token
  if (invitation && invitation.is_valid && currentUser) {
    const isEmailMatching = currentUser.email.trim().toLowerCase() === invitation.email.trim().toLowerCase();

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-lg dark:bg-card space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <CheckCircle2 className="size-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Project Invitation Received</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{invitation.inviter_name}</span> invited you to join <span className="font-semibold text-foreground">{invitation.project_name}</span> at <span className="font-semibold text-foreground">{invitation.company_name}</span>.
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2 text-xs text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project Role:</span>
              <span className="font-bold">{invitation.project_role}</span>
            </div>
            {invitation.specialization && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Specialization:</span>
                <span className="font-bold">{invitation.specialization}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Addressed To:</span>
              <span className="font-bold">{invitation.email}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isEmailMatching ? (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                You are currently signed in as <strong className="text-foreground">{currentUser.email}</strong>. Click below to explicitly accept and join this workspace.
              </p>
              <button
                type="button"
                disabled={acceptingInvite}
                onClick={handleExplicitAccept}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/95 shadow-md cursor-pointer disabled:opacity-50"
              >
                {acceptingInvite ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                Accept Project Invitation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 rounded-lg bg-amber-500/10 p-4 text-xs text-amber-700 border border-amber-500/20">
                <ShieldAlert className="size-5 shrink-0 text-amber-600" />
                <span>
                  You are signed in as <strong>{currentUser.email}</strong>, but this invitation was issued to <strong>{invitation.email}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogoutAndSwitch}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                <LogOut className="size-4 text-muted-foreground" /> Log Out & Switch Account
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // State: Standard Registration / Invitation Onboarding Flow
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-lg dark:bg-card">
        <div className="flex flex-col items-center">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <span className="text-xl font-bold text-foreground">SYNAPSE</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Join your project team
          </h2>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {invitation?.project_name
              ? `You have been invited to join ${invitation.project_name} at ${invitation.company_name}.`
              : "Set up your account to accept your project invitation and start collaborating."}
          </p>
        </div>

        {/* Google Sign-In for Join */}
        <div className="mt-6">
          <GoogleSignInButton
            context="signup"
            isJoinPage={true}
            onNoInvitation={(msg) => setErrorMsg(msg)}
          />
        </div>

        {/* Divider */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or join with email</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20 border border-destructive/20">
              <AlertCircle className="size-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {errorMsg.toLowerCase().includes("already registered") && (
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Account already exists for this email address. Please log in to accept your invitation.
                </p>
                <Link
                  href={`/login?invitation_token=${encodeURIComponent(rawToken || "")}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/95"
                >
                  Log In to Accept Invitation <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <input
                type="text"
                {...register("first_name")}
                placeholder="Jane"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <input
                type="text"
                {...register("last_name")}
                placeholder="Doe"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Invited Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="jane.doe@acme.com"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer mt-6"
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Join Team Workspace
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href={rawToken ? `/login?invitation_token=${encodeURIComponent(rawToken)}` : "/login"}
            className="font-medium text-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
