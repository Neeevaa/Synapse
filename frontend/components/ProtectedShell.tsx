"use client";

import { useEffect, useState } from "react";
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

export default function ProtectedShell({ children, pageTitle }: ProtectedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Sprints", href: "/sprints", icon: Zap },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
  ];

  if (user?.is_super_admin) {
    navItems = [
      { name: "Platform Admin", href: "/admin", icon: ShieldAlert },
    ];
  } else if (user?.role === "OWNER" || user?.role === "ADMIN") {
    navItems.push({ name: "Company Settings", href: "/company/settings", icon: Building2 });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex dark:bg-background">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar/95 backdrop-blur-md border-r border-sidebar-border text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col justify-between select-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-100"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex h-14 items-center justify-between px-5 border-b border-sidebar-border/80 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="size-7 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold shadow-xs text-xs">
                S
              </div>
              <span className="text-base font-extrabold tracking-wider text-sidebar-foreground group-hover:text-primary transition-colors">
                SYNAPSE
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground hover:opacity-80 p-1"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              Platform Workspaces
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isProjectsTab = item.href === "/projects";
              const isActive = pathname === item.href || (isProjectsTab && pathname.startsWith("/projects/"));
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold ring-1 ring-primary/30 shadow-xs"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                    {isProjectsTab && currentProjectId && (
                      <button
                        type="button"
                        onClick={() => setProjectsExpanded(!projectsExpanded)}
                        className="p-1.5 text-muted-foreground hover:text-sidebar-foreground cursor-pointer rounded-md hover:bg-sidebar-accent/50"
                      >
                        {projectsExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Grouped Project Workspace Sub-navigation */}
                  {isProjectsTab && currentProjectId && projectsExpanded && (
                    <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border/70 space-y-2.5 py-1">
                      {/* Active Project Context Badge */}
                      <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 truncate px-1">
                        <FolderKanban className="size-3.5 shrink-0" />
                        <span className="truncate">{activeProject?.name || "Active Project"}</span>
                      </div>

                      {/* PLAN */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5">
                          Plan
                        </div>
                        <Link
                          href={`/projects/${currentProjectId}/board`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === `/projects/${currentProjectId}/board`
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Kanban className="size-3.5 shrink-0 text-primary" />
                            <span className="truncate">Sprint Board</span>
                          </span>
                          {hasActiveSprint && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/20 shrink-0">
                              Active
                            </span>
                          )}
                        </Link>
                        <Link
                          href={`/projects/${currentProjectId}/backlog`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === `/projects/${currentProjectId}/backlog`
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <Layers className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate">Backlog Stream</span>
                        </Link>
                      </div>

                      {/* WORK */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5">
                          Work
                        </div>
                        <Link
                          href={`/projects/${currentProjectId}/requirements`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === `/projects/${currentProjectId}/requirements`
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <FileText className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate">Requirements & Review</span>
                        </Link>
                      </div>

                      {/* COLLABORATE */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5">
                          Collaborate
                        </div>
                        <Link
                          href={`/projects/${currentProjectId}/meetings`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname.startsWith(`/projects/${currentProjectId}/meetings`)
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <Video className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate">Meetings & Notes</span>
                        </Link>
                        <Link
                          href={`/projects/${currentProjectId}?tab=members`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === `/projects/${currentProjectId}`
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <Users className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate">Team & Members</span>
                        </Link>
                      </div>

                      {/* INTELLIGENCE */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5">
                          Intelligence
                        </div>
                        <Link
                          href={`/projects/${currentProjectId}/knowledge`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === `/projects/${currentProjectId}/knowledge`
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <Database className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate">Knowledge Base</span>
                        </Link>
                        <Link
                          href={`/projects/${currentProjectId}/traceability`}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            pathname === `/projects/${currentProjectId}/traceability`
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary font-bold"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          }`}
                        >
                          <GitFork className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate">Traceability Matrix</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer AI Info */}
        <div className="p-3 m-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/80 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-sidebar-foreground">
            <Bot className="size-3.5 text-primary" />
            AI Agents Active
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Synapse AI Copilot is monitoring project dependencies.
          </p>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-border/80 bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-foreground hover:opacity-80 p-1"
            >
              <Menu className="size-6" />
            </button>
            <h1 className="text-lg font-bold text-foreground">
              {pageTitle || navItems.find((item) => item.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>

          {/* Header Controls: NotificationBell, Theme Toggle, Profile, Logout */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <Link
              href="/profile"
              title="View & Edit My Profile"
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
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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
