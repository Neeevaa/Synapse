"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

interface GoogleSignInButtonProps {
  /** Context label for the button. */
  context?: "signin" | "signup";
  /**
   * Called when the backend returns a non-invitation error on the /join page.
   * The parent can show its own "you need to be invited" message.
   */
  onNoInvitation?: (message: string) => void;
  /**
   * If true, this is the /join page and we need special invitation handling.
   */
  isJoinPage?: boolean;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function GoogleSignInButton({
  context = "signin",
  onNoInvitation,
  isJoinPage = false,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---- Handle Google Auth Success ---- */
  const handleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    if (!idToken) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post("/auth/google", {
        id_token: idToken,
        is_join: isJoinPage,
      });
      const { access_token, refresh_token, role, company_role } =
        res.data.data;

      // Store tokens in localStorage
      localStorage.setItem("synapse_access_token", access_token);
      localStorage.setItem("synapse_refresh_token", refresh_token);

      // Role-based redirect: OWNER/ADMIN → /dashboard, others → /member-dashboard
      const effectiveRole = company_role || role;
      if (effectiveRole === "OWNER" || effectiveRole === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/member-dashboard");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Google sign-in failed. Please try again.";

      if (isJoinPage && onNoInvitation && err.response?.status === 400) {
        onNoInvitation(msg);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ---- Handle Google Auth Error ---- */
  const handleError = () => {
    setErrorMsg("Google Sign-In was not completed. Please try again.");
  };

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center py-2.5 rounded-lg border border-border bg-card">
          <Loader2 className="size-5 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-foreground">
            Authenticating with Google…
          </span>
        </div>
      ) : (
        <div className="flex justify-center w-full min-h-[44px]">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            text={context === "signup" ? "signup_with" : "continue_with"}
            theme="outline"
            size="large"
            shape="rectangular"
            width="350"
          />
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-center text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
