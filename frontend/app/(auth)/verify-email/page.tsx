"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing. Please check your verification link.");
      return;
    }

    const verifyToken = async () => {
      try {
        await api.post("/auth/verify-email", { token });
        setStatus("success");
        setMessage("Your email address has been successfully verified!");
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err.response?.data?.message ||
            "Verification failed. The link may have expired or is invalid."
        );
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex flex-col items-center text-center">
      {status === "loading" && (
        <>
          <Loader2 className="size-16 text-primary animate-spin" />
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Verifying email...
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="size-16 text-secondary animate-bounce" />
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Email Verified!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-8 w-full">
            <Link
              href="/login"
              className="flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              Sign In
            </Link>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="size-16 text-destructive animate-pulse" />
          <h2 className="mt-6 text-2xl font-bold text-foreground">
            Verification Failed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-8 w-full space-y-3">
            <Link
              href="/register"
              className="flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              Register Again
            </Link>
            <Link
              href="/login"
              className="block text-sm font-medium text-primary hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg dark:bg-card">
        <Suspense
          fallback={
            <div className="flex flex-col items-center text-center">
              <Loader2 className="size-16 text-primary animate-spin" />
              <h2 className="mt-6 text-2xl font-bold text-foreground font-sans">
                Loading verification helper...
              </h2>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
