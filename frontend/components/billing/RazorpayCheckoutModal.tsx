"use client";

import { useState } from "react";
import { AuthoritativePlan } from "@/lib/plans";
import { api } from "@/lib/api";
import {
  X,
  ShieldCheck,
  Zap,
  Check,
  Loader2,
  AlertCircle,
  CreditCard,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: AuthoritativePlan | null;
  currentPlan: string;
  onSuccess: (result: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  targetPlan,
  currentPlan,
  onSuccess,
}: RazorpayCheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !targetPlan) return null;

  // Dynamically load Razorpay checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleStartPayment = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load secure checkout service. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // 1. Request server to create Order
      // STRICT SECURITY: Client only sends target plan code. Never client-supplied amount.
      const orderRes = await api.post("/subscriptions/create-order", {
        plan: targetPlan.code,
      });

      const orderData = orderRes.data.data;
      const razorpayKey = orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        setError("Payment service is temporarily unavailable. Please try again later.");
        setLoading(false);
        return;
      }

      // 2. Configure Razorpay Checkout Options
      const options = {
        key: razorpayKey,
        amount: orderData.amount, // in paise
        currency: orderData.currency || "INR",
        name: "Synapse",
        description: `Synapse ${targetPlan.name} Plan (30-Day Entitlement)`,
        order_id: orderData.order_id,
        prefill: {
          name: orderData.user_name,
          email: orderData.user_email,
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setLoading(true);
          try {
            // 3. Cryptographic server-side signature verification
            const verifyRes = await api.post("/subscriptions/verify-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccessMsg(
              `Payment verified! Subscription upgraded to ${targetPlan.name}.`
            );
            setTimeout(() => {
              onSuccess(verifyRes.data.data);
              onClose();
            }, 1800);
          } catch (err: any) {
            console.error("Verification error:", err);
            const msg =
              err.response?.data?.message ||
              "Payment could not be verified. Your subscription has not been changed.";
            setError(msg);
          } finally {
            setLoading(false);
          }
        },
      };

      // 3. Launch Checkout Popup
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setError(
          `Payment failed: ${resp.error?.description || "Transaction declined."}`
        );
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Order creation failed:", err);
      const msg =
        err.response?.data?.message ||
        "Failed to initiate payment order with backend.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 text-foreground animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Zap className="size-4" /> Subscription Upgrade
          </div>
          <h3 className="text-xl font-extrabold text-foreground">
            Upgrade to Synapse {targetPlan.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Review the plan terms below and proceed with secure payment.
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20 leading-relaxed">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Upgrade Summary Card */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <span className="text-xs text-muted-foreground">Tier Transition</span>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                {currentPlan}
              </span>
              <ArrowRight className="size-3.5 text-primary" />
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {targetPlan.name}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Authoritative Price</span>
              <div className="text-2xl font-black text-foreground mt-0.5">
                {targetPlan.price_display}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">30-Day Entitlement</span>
              <span className="block text-[0.7rem]">Billed in INR</span>
            </div>
          </div>

          {/* Key limits preview */}
          <div className="pt-2 text-xs text-muted-foreground grid grid-cols-2 gap-2">
            <div>
              <span className="text-[0.7rem] uppercase text-muted-foreground/70 block">Team Members</span>
              <span className="font-semibold text-foreground">
                {targetPlan.limits.max_team_members < 0 ? "Unlimited" : `Up to ${targetPlan.limits.max_team_members}`}
              </span>
            </div>
            <div>
              <span className="text-[0.7rem] uppercase text-muted-foreground/70 block">Active Projects</span>
              <span className="font-semibold text-foreground">
                {targetPlan.limits.max_active_projects < 0 ? "Unlimited" : `Up to ${targetPlan.limits.max_active_projects}`}
              </span>
            </div>
            <div>
              <span className="text-[0.7rem] uppercase text-muted-foreground/70 block">AI Executions</span>
              <span className="font-semibold text-foreground">
                {targetPlan.limits.max_ai_executions_monthly < 0 ? "Unlimited" : `${targetPlan.limits.max_ai_executions_monthly} / mo`}
              </span>
            </div>
            <div>
              <span className="text-[0.7rem] uppercase text-muted-foreground/70 block">Storage Quota</span>
              <span className="font-semibold text-foreground">{targetPlan.limits.max_storage_display}</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2">
          <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground block">
            Included in {targetPlan.name}
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {targetPlan.included_features.slice(0, 5).map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-foreground">
                <Check className="size-3.5 text-emerald-500 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
            {targetPlan.included_features.length > 5 && (
              <p className="text-[0.7rem] text-muted-foreground pl-5">
                + {targetPlan.included_features.length - 5} more advanced features
              </p>
            )}
          </div>
        </div>

        {/* Secure Checkout Notice */}
        <div className="flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3 text-[0.7rem] text-foreground">
          <ShieldCheck className="size-4 shrink-0 mt-0.5 text-primary" />
          <span>
            <strong>Secure Checkout:</strong> Transactions are encrypted and processed securely.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStartPayment}
            disabled={loading || !!successMsg}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                Continue to Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
