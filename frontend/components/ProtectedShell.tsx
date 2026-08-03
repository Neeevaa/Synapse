"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
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
} from "lucide-react";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  designation: string | null;
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
    const checkAuth = async () => {
      const token = localStorage.getItem("synapse_access_token");
      const refreshToken = localStorage.getItem("synapse_refresh_token");

      if (!token && !refreshToken) {
        router.push("/login");
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.data);
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("synapse_access_token");
        localStorage.removeItem("synapse_refresh_token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

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

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Sprints", href: "/sprints", icon: Zap },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
  ];

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-100"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold shadow-sm">
              S
            </div>
            <span className="text-xl font-bold tracking-wider text-sidebar-foreground">
              SYNAPSE
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground hover:opacity-80"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Platform Workspaces
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer AI Info */}
        <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-sidebar-accent/40 border border-sidebar-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground">
            <Bot className="size-4 text-sidebar-primary" />
            AI Agents Active
          </div>
          <p className="mt-1 text-[0.75rem] text-sidebar-foreground/70">
            Synapse AI Copilot is monitoring project dependencies.
          </p>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs">
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

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-foreground leading-tight">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-muted-foreground uppercase font-medium">
                  {user?.role}
                </div>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="inline-flex items-center justify-center size-9 rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-muted-foreground" />
              )}
            </button>

            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              title="Sign Out"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
            >
              {logoutLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
