"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { AuthBackgroundLayout } from "@/components/auth/auth-background-layout";

const loginSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation_token");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: customResolver(loginSchema) as any,
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post("/auth/login", data);
      const { access_token, refresh_token, role, company_role, is_super_admin } =
        response.data.data;

      // Store tokens in local storage
      localStorage.setItem("synapse_access_token", access_token);
      localStorage.setItem("synapse_refresh_token", refresh_token);

      // If logging in with a pending invitation token, redirect to /join?token=... to allow explicit acceptance
      if (invitationToken) {
        router.push(`/join?token=${encodeURIComponent(invitationToken)}`);
        return;
      }

      // Super Admin priority redirect -> /admin
      if (is_super_admin) {
        router.push("/admin");
      } else {
        const effectiveRole = company_role || role;
        if (effectiveRole === "OWNER" || effectiveRole === "ADMIN") {
          router.push("/dashboard");
        } else {
          router.push("/member-dashboard");
        }
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Invalid email or password.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackgroundLayout cardMaxWidth="md">
      <div className="flex flex-col items-center text-center">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="size-10 rounded-2xl bg-white dark:bg-card border border-border flex items-center justify-center shadow-xs overflow-hidden p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Synapse" className="size-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-mono">
            SYNAPSE
          </span>
        </div>

        {/* Welcome Heading & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-xs">
          Enter your credentials to access your projects and workspace.
        </p>
      </div>

      {/* Google Sign-In */}
      <div className="mt-6">
        <GoogleSignInButton context="signin" />
      </div>

      {/* Divider */}
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/80" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground font-mono text-[11px]">
            or sign in with email
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20 animate-in fade-in duration-200">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Work Email Address
          </label>
          <input
            type="email"
            {...register("email")}
            placeholder="name@company.com"
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-md shadow-primary/20 mt-6"
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Sign In to Synapse
        </button>
      </form>

      {/* Sign-up Navigation */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          Create an organization account
        </Link>
      </p>
    </AuthBackgroundLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-8 text-primary animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
