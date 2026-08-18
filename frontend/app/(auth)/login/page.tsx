"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";

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
      const { access_token, refresh_token, role, company_role, is_super_admin } = response.data.data;

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg dark:bg-card">
        <div className="flex flex-col items-center">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <span className="text-xl font-bold text-foreground">SYNAPSE</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Enter your credentials to access your projects and dashboard.
          </p>
        </div>

        {/* Google Sign-In */}
        <div className="mt-6">
          <GoogleSignInButton context="signin" />
        </div>

        {/* Divider */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or email sign in</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-6 flex items-center gap-2.5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
            <AlertCircle className="size-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email Address
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
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
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/join"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
