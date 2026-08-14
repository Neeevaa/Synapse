"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Activity,
  LogIn,
  UserPlus,
  CheckCircle2,
  UserCheck,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ActivityItem {
  id: string;
  user_id: string;
  company_id: string | null;
  action: string;
  description: string;
  details: string | null;
  created_at: string;
}

interface PaginatedActivityData {
  items: ActivityItem[];
  total: number;
  page: number;
  pages: number;
}

interface UserActivityFeedProps {
  targetUserId?: string;
  title?: string;
  pageSize?: number;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityIcon(action: string) {
  switch (action) {
    case "USER_LOGGED_IN":
      return <LogIn className="size-4 text-emerald-500" />;
    case "USER_REGISTERED":
      return <UserPlus className="size-4 text-indigo-500" />;
    case "USER_VERIFIED":
      return <CheckCircle2 className="size-4 text-blue-500" />;
    case "PROFILE_UPDATED":
      return <UserCheck className="size-4 text-purple-500" />;
    case "PASSWORD_CHANGED":
    case "PASSWORD_RESET_COMPLETED":
      return <KeyRound className="size-4 text-amber-500" />;
    default:
      return <Activity className="size-4 text-primary" />;
  }
}

function getActivityBadgeStyle(action: string): string {
  switch (action) {
    case "USER_LOGGED_IN":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "USER_REGISTERED":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    case "USER_VERIFIED":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "PROFILE_UPDATED":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "PASSWORD_CHANGED":
    case "PASSWORD_RESET_COMPLETED":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

export default function UserActivityFeed({
  targetUserId,
  title = "Recent Activity Log",
  pageSize = 5,
}: UserActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };
      if (targetUserId) {
        params.user_id = targetUserId;
      }

      const res = await api.get("/activities", { params });
      const data: PaginatedActivityData = res.data.data;

      setActivities(data.items);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  }, [targetUserId, pageSize]);

  useEffect(() => {
    fetchActivities(page);
  }, [fetchActivities, page]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="size-5 text-primary" /> {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit history of your account actions & security updates.
          </p>
        </div>
        <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {total} {total === 1 ? "Event" : "Events"}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 text-primary animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <Clock className="size-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">No recorded activities yet.</p>
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <div className="space-y-4">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {activities.map((item) => (
              <div key={item.id} className="relative group">
                {/* Bullet Node */}
                <div className="absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full bg-card border border-border shadow-2xs">
                  {getActivityIcon(item.action)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-foreground">
                      {item.description}
                    </span>
                    <span className="text-[0.68rem] text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${getActivityBadgeStyle(
                        item.action
                      )}`}
                    >
                      {item.action.replace(/_/g, " ")}
                    </span>
                    {item.details && (
                      <span className="text-[0.7rem] text-muted-foreground truncate">
                        • {item.details}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
