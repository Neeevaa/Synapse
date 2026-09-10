"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Bell,
  CheckCheck,
  CheckSquare,
  Zap,
  FileText,
  Sparkles,
  UserPlus,
  ChevronDown,
  X,
  Loader2,
  ExternalLink,
  Layers,
} from "lucide-react";

interface NotificationItem {
  id: string;
  company_id: string;
  project_id: string | null;
  project_name: string | null;
  recipient_user_id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  type: string;
  title: string;
  message: string;
  deep_link: string;
  is_read: boolean;
  read_at: string | null;
  source_type: string | null;
  source_id: string | null;
  extra_data: Record<string, any> | null;
  created_at: string;
}

interface ProjectNotificationGroup {
  project_id: string | null;
  project_name: string;
  unread_count: number;
  notifications: NotificationItem[];
}

interface NotificationListResponse {
  total: number;
  unread_count: number;
  projects: ProjectNotificationGroup[];
  page: number;
  page_size: number;
}

// Relative time formatting helper
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return "yesterday";
    }
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// Icon selector based on notification type
function getNotificationIcon(type: string) {
  switch (type) {
    case "TASK_ASSIGNED":
    case "TASK_STATUS_CHANGED":
    case "TASK_PRIORITY_CHANGED":
    case "TASK_REASSIGNED":
      return <CheckSquare className="size-4 text-cyan-500 shrink-0" />;
    case "SPRINT_ACTIVATED":
    case "SPRINT_COMPLETED":
      return <Zap className="size-4 text-amber-500 shrink-0" />;
    case "REQUIREMENT_UPDATED":
    case "REQUIREMENT_STATUS_CHANGED":
      return <FileText className="size-4 text-blue-500 shrink-0" />;
    case "AI_REVIEW_COMPLETED":
      return <Sparkles className="size-4 text-purple-400 shrink-0" />;
    case "PROJECT_MEMBER_ADDED":
      return <UserPlus className="size-4 text-emerald-500 shrink-0" />;
    default:
      return <Bell className="size-4 text-primary shrink-0" />;
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevCount, setPrevCount] = useState<number | null>(null);
  const [groups, setGroups] = useState<ProjectNotificationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Live Toast State
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // 1. Fetch unread count (for polling)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      if (res.data?.success && typeof res.data.data?.unread_count === "number") {
        const count = res.data.data.unread_count;
        setUnreadCount((currentCount) => {
          // If count increased and not initial load, trigger toast alert
          if (prevCount !== null && count > currentCount) {
            // Fetch newest notification for the toast
            api.get("/notifications?limit=1&page_size=1").then((listRes) => {
              if (listRes.data?.success) {
                const projects: ProjectNotificationGroup[] = listRes.data.data.groups || listRes.data.data.projects || [];
                for (const g of projects) {
                  if (g.notifications && g.notifications.length > 0) {
                    const newest = g.notifications[0];
                    if (!newest.is_read) {
                      setToastNotification(newest);
                      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                      toastTimeoutRef.current = setTimeout(() => {
                        setToastNotification(null);
                      }, 5000);
                      break;
                    }
                  }
                }
              }
            }).catch(() => {});
          }
          return count;
        });
        setPrevCount(count);
      }
    } catch {
      // Silently ignore auth or network drops during polling
    }
  }, [prevCount]);

  // 2. Fetch full notification list
  const fetchNotifications = useCallback(async (projectIdFilter?: string) => {
    setLoading(true);
    try {
      let url = "/notifications?limit=50&page_size=50";
      const filterId = projectIdFilter !== undefined ? projectIdFilter : selectedProjectId;
      if (filterId && filterId !== "all") {
        url += `&project_id=${filterId}`;
      }
      const res = await api.get(url);
      if (res.data?.success && res.data.data) {
        const data: any = res.data.data;
        setGroups(data.groups || data.projects || []);
        setUnreadCount(data.unread_count);
        setPrevCount(data.unread_count);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // Initial load and 15-second polling interval
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Reload when popover is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Outside click handler to dismiss popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFilterDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setFilterDropdownOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read and navigate
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await api.patch(`/notifications/${item.id}/read`);
        // Optimistically mark as read in state
        setGroups((prevGroups) =>
          prevGroups.map((g) => ({
            ...g,
            notifications: g.notifications.map((n) =>
              n.id === item.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
            ),
            unread_count: Math.max(0, g.unread_count - (g.notifications.some((n) => n.id === item.id && !n.is_read) ? 1 : 0)),
          }))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
    setIsOpen(false);
    if (item.deep_link) {
      router.push(item.deep_link);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const payload: { project_id?: string } = {};
      if (selectedProjectId && selectedProjectId !== "all") {
        payload.project_id = selectedProjectId;
      }
      await api.post("/notifications/mark-all-read", payload);
      // Optimistic update
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (selectedProjectId === "all" || g.project_id === selectedProjectId) {
            return {
              ...g,
              unread_count: 0,
              notifications: g.notifications.map((n) => ({
                ...n,
                is_read: true,
                read_at: new Date().toISOString(),
              })),
            };
          }
          return g;
        })
      );
      if (selectedProjectId === "all") {
        setUnreadCount(0);
      } else {
        const remaining = groups
          .filter((g) => g.project_id !== selectedProjectId)
          .reduce((sum, g) => sum + g.unread_count, 0);
        setUnreadCount(remaining);
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Extract unique projects for filtering
  const availableProjects = groups
    .filter((g) => g.project_id !== null)
    .map((g) => ({ id: g.project_id as string, name: g.project_name }));

  const totalNotificationsInView = groups.reduce(
    (sum, g) => sum + g.notifications.length,
    0
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* 🔔 YouTube-style Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-label="Notifications"
        className={`relative inline-flex items-center justify-center size-9 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? "border-primary bg-primary/10 text-primary shadow-xs"
            : "border-border bg-background text-foreground hover:bg-muted/80 hover:text-foreground"
        }`}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-500 text-white text-[0.65rem] font-bold shadow-md ring-2 ring-card animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 📋 Popover Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card text-card-foreground shadow-2xl z-50 overflow-hidden flex flex-col max-h-[540px] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-border/80 bg-card/90 backdrop-blur-md flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[0.7rem] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/70 transition-colors cursor-pointer disabled:opacity-50"
                  title="Mark all notifications as read"
                >
                  {markingAll ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="size-3.5 text-emerald-500" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Project Filter Toolbar (shown if multiple projects exist) */}
          {availableProjects.length > 1 && (
            <div className="px-3.5 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Filter project:</span>
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card text-foreground hover:bg-muted/70 transition-colors cursor-pointer text-xs font-medium max-w-[180px] truncate"
                >
                  <span className="truncate">
                    {selectedProjectId === "all"
                      ? "All Projects"
                      : availableProjects.find((p) => p.id === selectedProjectId)?.name || "Project"}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                </button>

                {filterDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-lg z-55 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId("all");
                        setFilterDropdownOpen(false);
                        fetchNotifications("all");
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-muted/70 transition-colors font-medium ${
                        selectedProjectId === "all" ? "text-primary bg-primary/10" : "text-foreground"
                      }`}
                    >
                      All Projects
                    </button>
                    {availableProjects.map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setFilterDropdownOpen(false);
                          fetchNotifications(proj.id);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-muted/70 transition-colors truncate ${
                          selectedProjectId === proj.id ? "text-primary bg-primary/10" : "text-foreground"
                        }`}
                      >
                        {proj.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Body List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : totalNotificationsInView === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="size-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Bell className="size-6 opacity-60" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">All caught up!</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto">
                  You have no pending notifications. Updates on tasks, sprints, and requirements will appear here.
                </p>
              </div>
            ) : (
              groups.map((group) => {
                if (group.notifications.length === 0) return null;
                return (
                  <div key={group.project_id || "general"} className="py-1">
                    {/* Project Header */}
                    <div className="px-3.5 py-1.5 bg-muted/40 flex items-center justify-between text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <Layers className="size-3 text-primary/70 shrink-0" />
                        <span className="truncate">{group.project_name}</span>
                      </div>
                      {group.unread_count > 0 && (
                        <span className="text-primary font-semibold lowercase">
                          {group.unread_count} unread
                        </span>
                      )}
                    </div>

                    {/* Notification Items */}
                    <div className="divide-y divide-border/20">
                      {group.notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className={`px-3.5 py-3 hover:bg-muted/60 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                            !item.is_read ? "bg-primary/[0.03]" : ""
                          }`}
                        >
                          {/* Unread Indicator Dot */}
                          <div className="pt-1 shrink-0 flex items-center justify-center">
                            {!item.is_read ? (
                              <span className="size-2 rounded-full bg-primary shadow-xs ring-2 ring-primary/20" />
                            ) : (
                              <span className="size-2 rounded-full bg-transparent" />
                            )}
                          </div>

                          {/* Icon */}
                          <div className="p-1.5 rounded-lg bg-muted/60 border border-border/40 shrink-0 group-hover:border-primary/40 transition-colors">
                            {getNotificationIcon(item.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <p className={`text-xs leading-snug line-clamp-1 ${!item.is_read ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                                {item.title}
                              </p>
                              <span className="text-[0.65rem] text-muted-foreground/70 shrink-0 whitespace-nowrap ml-1">
                                {formatRelativeTime(item.created_at)}
                              </span>
                            </div>

                            <p className="text-[0.75rem] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>

                            {item.actor_name && (
                              <div className="mt-1 flex items-center gap-1 text-[0.68rem] text-muted-foreground/80">
                                <span>by {item.actor_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🚀 Real-time Floating Toast Alert */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-60 max-w-sm w-full bg-card border border-primary/30 rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Bell className="size-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-primary">New Notification</span>
              <button
                type="button"
                onClick={() => setToastNotification(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <h5 className="text-xs font-medium text-foreground mt-0.5 line-clamp-1">
              {toastNotification.title}
            </h5>
            <p className="text-[0.75rem] text-muted-foreground mt-0.5 line-clamp-2">
              {toastNotification.message}
            </p>
            {toastNotification.deep_link && (
              <button
                type="button"
                onClick={() => {
                  setToastNotification(null);
                  router.push(toastNotification.deep_link);
                }}
                className="mt-2 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-primary hover:underline cursor-pointer"
              >
                <span>View details</span>
                <ExternalLink className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
