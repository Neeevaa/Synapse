"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const registerSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters."),
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email format."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  designation: z.string().optional(),
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

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: customResolver(registerSchema) as any,
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post("/auth/register", data);
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Registration failed. Please check your inputs.";
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
            <CheckCircle2 className="size-16 text-secondary animate-bounce" />
            <h2 className="mt-6 text-2xl font-bold text-foreground">
              Registration Successful!
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Your organization account is active and verified. You can log in immediately to complete your setup.
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
        </div>
      </div>
    );
  }

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
            Create your organization account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Synapse helps you manage project workflows with AI agents.
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
              Company Name
            </label>
            <input
              type="text"
              {...register("company_name")}
              placeholder="e.g. Acme Corporation"
              suppressHydrationWarning
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
            />
            {errors.company_name && (
              <p className="mt-1 text-xs text-destructive">
                {errors.company_name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <input
                type="text"
                {...register("first_name")}
                placeholder="Jane"
                suppressHydrationWarning
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
                suppressHydrationWarning
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
              Work Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="jane.doe@acme.com"
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
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
              Designation / Job Title (Optional)
            </label>
            <input
              type="text"
              {...register("designation")}
              placeholder="e.g. Chief Operations Officer"
              suppressHydrationWarning
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-background"
            />
            {errors.designation && (
              <p className="mt-1 text-xs text-destructive">
                {errors.designation.message}
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
            Register Organization
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
