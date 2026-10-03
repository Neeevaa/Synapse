"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatRoleLabel } from "@/lib/roleUtils";
import {
  LayoutDashboard,
  FolderKanban,
  Zap,
  CheckSquare,
  LogOut,
  User as UserIcon,
  Loader2,
  Menu,
  X,
  Bot,
  Moon,
  Sun,
  Building2,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Kanban,
  Layers,
  FileText,
  Video,
  Users,
  Database,
  GitFork,
} from "lucide-react";

import CompleteProfileModal from "@/components/CompleteProfileModal";
import NotificationBell from "@/components/NotificationBell";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  company_role?: string | null;
  is_super_admin?: boolean;
  designation: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  profile_completed: boolean;
  is_active: boolean;
  is_verified: boolean;
}

interface ProtectedShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

// Shared pinned state to preserve user preference across navigation
let sharedPinnedState = false;

export default function ProtectedShell({ children, pageTitle }: ProtectedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Pinned expanded state (toggled via double-click on sidebar)
  const [isPinned, setIsPinned] = useState(false);

  // Hover & Keyboard Focus expansion state with 150ms leave delay
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with shared state on mount
  useEffect(() => {
    if (sharedPinnedState) {
      setIsPinned(true);
    }
  }, []);

  const handleDoubleClick = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsPinned((prev) => {
      const next = !prev;
      sharedPinnedState = next;
      if (!next) {
        setIsHovered(false);
      }
      return next;
    });
  };

  const handleMouseEnter = () => {
    if (isPinned) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  const handleFocus = () => {
    if (isPinned) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (isPinned) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
    }
  };

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const isExpanded = isPinned || isHovered || isFocused || sidebarOpen;

  // Active Project Context State
  const [activeProject, setActiveProject] = useState<{ id: string; name: string } | null>(null);
  const [hasActiveSprint, setHasActiveSprint] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // Extract projectId if on /projects/[id]...
  const match = pathname ? pathname.match(/^\/projects\/([^\/]+)/) : null;
  const currentProjectId = match && match[1] !== "new" ? match[1] : null;

  useEffect(() => {
    if (!currentProjectId) {
      setActiveProject(null);
      setHasActiveSprint(false);
      return;
    }

    let isMounted = true;
    const fetchActiveProjectContext = async () => {
      try {
        const [projRes, sprintRes] = await Promise.allSettled([
          api.get(`/projects/${currentProjectId}`),
          api.get(`/projects/${currentProjectId}/sprints/active`),
        ]);

        if (isMounted) {
          if (projRes.status === "fulfilled" && projRes.value?.data?.data) {
            setActiveProject({
              id: currentProjectId,
              name: projRes.value.data.data.name,
            });
          }
          if (sprintRes.status === "fulfilled" && sprintRes.value?.data?.data) {
            setHasActiveSprint(true);
          } else {
            setHasActiveSprint(false);
          }
        }
      } catch {
        // fallback
      }
    };

    fetchActiveProjectContext();

    return () => {
      isMounted = false;
    };
  }, [currentProjectId]);

  // Sync dark mode state from DOM on mount (set by layout.tsx inline script)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("synapse_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("synapse_theme", "light");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const token = localStorage.getItem("synapse_access_token");
      const refreshToken = localStorage.getItem("synapse_refresh_token");

      if (!token && !refreshToken) {
        router.push("/login");
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (isMounted) {
          setUser(response.data.data);
        }
      } catch (err: any) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("synapse_access_token");
          localStorage.removeItem("synapse_refresh_token");
        }
        router.push("/login");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    if (user.is_super_admin) {
      if (!pathname.startsWith("/admin")) {
        router.push("/admin");
      }
    } else if (pathname.startsWith("/admin")) {
      const effectiveRole = user.company_role || user.role;
      if (effectiveRole === "OWNER" || effectiveRole === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push("/member-dashboard");
      }
    }
  }, [user, pathname, router]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    const refreshToken = localStorage.getItem("synapse_refresh_token");
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error("Logout API call failed", err);
    } finally {
      localStorage.removeItem("synapse_access_token");
      localStorage.removeItem("synapse_refresh_token");
      setLogoutLoading(false);
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground dark:bg-background">
        <div className="text-center">
          <Loader2 className="size-12 text-primary animate-spin mx-auto" />
          <h2 className="mt-4 text-base font-medium text-foreground">
            Authenticating session...
          </h2>
        </div>
      </div>
    );
  }

  let navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
      isActive:
        pathname === "/projects" ||
        (pathname.startsWith("/projects/") && !currentProjectId),
    },
    {
      name: "Sprints",
      href: "/sprints",
      icon: Zap,
      isActive: pathname === "/sprints" || pathname.startsWith("/sprints/"),
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
      isActive: pathname === "/tasks" || pathname.startsWith("/tasks/"),
    },
  ];

  if (user?.is_super_admin) {
    navItems = [
      {
        name: "Platform Admin",
        href: "/admin",
        icon: ShieldAlert,
        isActive: pathname.startsWith("/admin"),
      },
    ];
  } else if (user?.role === "OWNER" || user?.role === "ADMIN") {
    navItems.push({
      name: "Company Settings",
      href: "/company/settings",
      icon: Building2,
      isActive: pathname.startsWith("/company"),
    });
  }

  const projectNavItems = currentProjectId
    ? [
      {
        name: "Sprint Board",
        href: `/projects/${currentProjectId}/board`,
        icon: Kanban,
        isActive: pathname === `/projects/${currentProjectId}/board`,
        badge: hasActiveSprint ? "Active" : undefined,
      },
      {
        name: "Backlog Stream",
        href: `/projects/${currentProjectId}/backlog`,
        icon: Layers,
        isActive: pathname === `/projects/${currentProjectId}/backlog`,
      },
      {
        name: "Requirements",
        href: `/projects/${currentProjectId}/requirements`,
        icon: FileText,
        isActive: pathname.startsWith(`/projects/${currentProjectId}/requirements`),
      },
      {
        name: "Meetings",
        href: `/projects/${currentProjectId}/meetings`,
        icon: Video,
        isActive: pathname.startsWith(`/projects/${currentProjectId}/meetings`),
      },
      {
        name: "Team & Members",
        href: `/projects/${currentProjectId}?tab=members`,
        icon: Users,
        isActive: pathname === `/projects/${currentProjectId}`,
      },
      {
        name: "Knowledge Base",
        href: `/projects/${currentProjectId}/knowledge`,
        icon: Database,
        isActive: pathname === `/projects/${currentProjectId}/knowledge`,
      },
      {
        name: "Traceability",
        href: `/projects/${currentProjectId}/traceability`,
        icon: GitFork,
        isActive: pathname === `/projects/${currentProjectId}/traceability`,
      },
    ]
    : [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Floating Pill Sidebar Rail */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
        onDoubleClick={handleDoubleClick}
        className={`fixed left-3 top-3 bottom-3 z-50 rounded-[34px] border border-sidebar-border/80 bg-sidebar/95 backdrop-blur-md shadow-xl lg:shadow-2xl flex flex-col justify-between select-none transition-[width,transform] duration-200 ease-in-out ${isExpanded ? "w-[212px]" : "w-[68px]"
          } ${sidebarOpen
            ? "translate-x-0"
            : "-translate-x-[calc(100%+24px)] lg:translate-x-0"
          }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Logo Circular Badge */}
          <div className="flex items-center p-2 py-3 border-b border-sidebar-border/60 shrink-0">
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            >
              <div className="w-[52px] flex items-center justify-center shrink-0">
                <div className="size-10 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform overflow-hidden p-1 border border-sidebar-border/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Synapse" className="size-full object-contain" />
                </div>
              </div>
              <div
                className={`flex flex-col overflow-hidden transition-all duration-200 ${isExpanded
                  ? "opacity-100 max-w-[140px] ml-1"
                  : "opacity-0 max-w-0 ml-0 pointer-events-none"
                  }`}
              >
                <span className="text-sm font-extrabold tracking-wider text-sidebar-foreground group-hover:text-primary transition-colors">
                  SYNAPSE
                </span>
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
                  Workspace
                </span>
              </div>
            </Link>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden ml-auto text-sidebar-foreground hover:opacity-80 p-1 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Navigation Links List */}
          <nav className="p-2 space-y-1 overflow-y-auto flex-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={!isExpanded ? item.name : undefined}
                  className={`group relative flex items-center h-10 w-full rounded-xl text-xs transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary ${item.isActive
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground font-medium"
                    }`}
                >
                  <div className="w-[52px] h-10 flex items-center justify-center shrink-0">
                    <Icon className="size-4.5 shrink-0" />
                  </div>

                  <div
                    className={`flex items-center justify-between flex-1 overflow-hidden transition-all duration-200 ${isExpanded
                      ? "opacity-100 max-w-[140px] pr-2"
                      : "opacity-0 max-w-0 ml-0 pointer-events-none"
                      }`}
                  >
                    <span className="truncate whitespace-nowrap">{item.name}</span>
                  </div>
                </Link>
              );
            })}

            {/* Project Sub-navigation Section when inside active project */}
            {projectNavItems.length > 0 && (
              <>
                <div className="my-2 border-t border-sidebar-border/60 mx-1 shrink-0" />

                {isExpanded && (
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 truncate">
                    <FolderKanban className="size-3 shrink-0 text-primary" />
                    <span className="truncate">{activeProject?.name || "Project Workspace"}</span>
                  </div>
                )}

                {projectNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={!isExpanded ? item.name : undefined}
                      className={`group relative flex items-center h-10 w-full rounded-xl text-xs transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary ${item.isActive
                        ? "bg-primary text-primary-foreground shadow-md font-bold"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground font-medium"
                        }`}
                    >
                      <div className="w-[52px] h-10 flex items-center justify-center shrink-0">
                        <Icon className="size-4.5 shrink-0" />
                      </div>

                      <div
                        className={`flex items-center justify-between flex-1 overflow-hidden transition-all duration-200 ${isExpanded
                          ? "opacity-100 max-w-[140px] pr-2"
                          : "opacity-0 max-w-0 ml-0 pointer-events-none"
                          }`}
                      >
                        <span className="truncate whitespace-nowrap">{item.name}</span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-foreground font-bold border border-primary-foreground/20 ml-1.5 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Footer AI Pill (workspace monitor) */}
        <div
          className={`transition-all duration-200 overflow-hidden shrink-0 ${
            isExpanded
              ? "p-2 border-t border-sidebar-border/60 opacity-100 max-h-24"
              : "max-h-0 opacity-0 pointer-events-none p-0 border-0"
          }`}
        >
          <div className="p-2 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sidebar-foreground">
              <Bot className="size-3.5 text-primary shrink-0" />
              <span className="truncate">AI Copilot</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight truncate">
              Monitoring dependencies
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col h-screen min-w-0 overflow-hidden transition-[padding] duration-200 ease-in-out ${
          isPinned ? "lg:pl-[236px]" : "lg:pl-[92px]"
        }`}
      >
        {/* Top Bar Header */}
        <header className="h-14 shrink-0 border-b border-border/80 bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-foreground hover:opacity-80 p-1 cursor-pointer"
            >
              <Menu className="size-6" />
            </button>
            <h1 className="text-lg font-bold text-foreground">
              {pageTitle ||
                projectNavItems.find((item) => item.isActive)?.name ||
                navItems.find((item) => item.isActive)?.name ||
                "Dashboard"}
            </h1>
          </div>

          {/* Header Controls: NotificationBell, Theme Toggle, Profile, Logout */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <Link
              href="/profile"
              title="View Profile"
              className="flex items-center gap-2.5 p-1 rounded-xl transition-all hover:bg-muted/70 border border-transparent hover:border-border/60 group"
            >
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="size-7 rounded-full object-cover border border-primary/40 group-hover:border-primary ring-1 ring-border/40"
                />
              ) : (
                <div className="size-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs border border-primary/25 group-hover:border-primary">
                  {user?.first_name?.[0]}
                  {user?.last_name?.[0]}
                </div>
              )}
              <div className="hidden sm:block text-left pr-1">
                <div className="text-xs font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  {formatRoleLabel(user?.role)}
                </div>
              </div>
            </Link>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="inline-flex items-center justify-center size-8 rounded-lg border border-border/80 bg-card text-foreground transition-all hover:bg-muted cursor-pointer shadow-2xs"
            >
              {isDark ? (
                <Sun className="size-3.5 text-amber-400" />
              ) : (
                <Moon className="size-3.5 text-muted-foreground" />
              )}
            </button>

            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              title="Sign Out"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {logoutLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <LogOut className="size-3.5 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-6 overflow-y-auto min-h-0 w-full">
          {children}
        </main>

        {/* Complete Profile Onboarding Modal Overlay */}
        {user && !user.profile_completed && (
          <CompleteProfileModal
            initialDesignation={user.designation}
            initialBio={user.bio}
            initialAvatarUrl={user.avatar_url}
            userName={`${user.first_name} ${user.last_name}`}
            onProfileCompleted={async () => {
              try {
                const res = await api.get("/auth/me");
                setUser(res.data.data);
              } catch (err) {
                console.error("Failed to refresh user profile", err);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
