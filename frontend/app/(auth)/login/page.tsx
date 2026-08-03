"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
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
      const { access_token, refresh_token, role } = response.data.data;

      // Store tokens in local storage
      localStorage.setItem("synapse_access_token", access_token);
      localStorage.setItem("synapse_refresh_token", refresh_token);

      // Unified dashboard redirection
      router.push("/dashboard");
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
          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your organization dashboard.
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
              Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="you@example.com"
              suppressHydrationWarning
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
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

          <button
            type="submit"
            disabled={isLoading}
            suppressHydrationWarning
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer mt-6"
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Synapse?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
