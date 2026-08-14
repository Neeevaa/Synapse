"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  LayoutDashboard,
  LogOut,
  Loader2,
  Moon,
  Sun,
  Server,
  Activity,
  User as UserIcon,
  BarChart3,
  History,
} from "lucide-react";

interface SuperAdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_super_admin: boolean;
  role: string | null;
  company_role?: string | null;
}

interface SuperAdminShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function SuperAdminShell({ children, pageTitle }: SuperAdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

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

    const checkSuperAdminAuth = async () => {
      const token = localStorage.getItem("synapse_access_token");
      const refreshToken = localStorage.getItem("synapse_refresh_token");

      if (!token && !refreshToken) {
        router.push("/login");
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data;

        if (!userData.is_super_admin) {
          // Strict Route Guard: redirect non-super-admins away immediately
          const effectiveRole = userData.company_role || userData.role;
          if (effectiveRole === "OWNER" || effectiveRole === "ADMIN") {
            router.push("/dashboard");
          } else {
            router.push("/member-dashboard");
          }
          return;
        }

        if (isMounted) {
          setUser(userData);
        }
      } catch {
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

    checkSuperAdminAuth();

    return () => {
      isMounted = false;
    };
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
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <Loader2 className="size-10 text-primary animate-spin mx-auto" />
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
            Verifying Super Admin Authorization...
          </h2>
        </div>
      </div>
    );
  }

  const adminNavItems = [
    { name: "Platform Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Company Management", href: "/admin/companies", icon: Building2 },
    { name: "Platform Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Platform Super Admin Header */}
      <header className="h-16 border-b-2 border-border bg-card/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-wider text-foreground block leading-none">
                SYNAPSE
              </span>
              <span className="text-[12px] font-bold tracking-widest text-primary uppercase block mt-0.5">
                Platform Admin Portal
              </span>
            </div>
          </Link>

          {/* Navigation Pills */}
          <nav className="hidden sm:flex items-center gap-1.5 ml-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-xl">
            <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              <UserIcon className="size-3.5" />
            </div>
            <div className="text-left leading-tight hidden md:block">
              <div className="text-xs font-bold text-foreground">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-[12px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                Super Admin
              </div>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-muted-foreground" />}
          </button>

          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {logoutLoading ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Administrative Container */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {pageTitle && (
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
              <Server className="size-6 text-primary" />
              {pageTitle}
            </h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Activity className="size-3.5 animate-pulse" /> Platform Active
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
