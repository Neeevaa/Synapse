"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: customResolver(resetPasswordSchema) as any,
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setErrorMsg("Reset token is missing. Please check your verification link.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: data.password,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Failed to reset password. The token may have expired or is invalid.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center text-center">
        <AlertCircle className="size-16 text-destructive animate-pulse" />
        <h2 className="mt-6 text-2xl font-bold text-foreground">
          Missing Reset Token
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The password reset token is missing. Please click the link in your email again.
        </p>
        <div className="mt-8 w-full">
          <Link
            href="/login"
            className="flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/95"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="size-16 text-secondary animate-bounce" />
        <h2 className="mt-6 text-2xl font-bold text-foreground">
          Password Updated!
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Your credentials have been successfully updated. You can now log in using your new password.
        </p>
        <div className="mt-8 w-full">
          <Link
            href="/login"
            className="flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            S
            </div>
          <span className="text-xl font-bold text-foreground">SYNAPSE</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Choose a new password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Enter and confirm your brand new password below.
        </p>
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
            New Password
          </label>
          <input
            type="password"
            {...register("password")}
            placeholder="••••••••"
            suppressHydrationWarning
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            {...register("confirm_password")}
            placeholder="••••••••"
            suppressHydrationWarning
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
          />
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          suppressHydrationWarning
          className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer mt-6"
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Reset Password
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg dark:bg-card">
        <Suspense
          fallback={
            <div className="flex flex-col items-center text-center">
              <Loader2 className="size-16 text-primary animate-spin" />
              <h2 className="mt-6 text-2xl font-bold text-foreground">
                Loading password reset...
              </h2>
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
