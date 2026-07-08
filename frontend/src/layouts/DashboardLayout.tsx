import {
  Activity,
  Bell,
  ClipboardList,
  Database,
  Gauge,
  LogOut,
  Menu,
  RadioTower,
  Settings,
  Sprout,
  Thermometer,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/user";

const navigation: Array<{ name: string; href: string; icon: typeof Activity; roles: Role[] }> = [
  { name: "Dashboard", href: "/dashboard", icon: Activity, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Farms", href: "/farms", icon: Sprout, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Stations", href: "/stations", icon: RadioTower, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Sensors", href: "/sensors", icon: Thermometer, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Measurements", href: "/measurements", icon: Gauge, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Alerts", href: "/alerts", icon: Bell, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Users", href: "/users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
  { name: "Import Logs", href: "/import-logs", icon: ClipboardList, roles: ["SUPER_ADMIN", "ADMIN", "TECHNICIAN", "VIEWER"] },
];

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNavigation = navigation.filter((item) => Boolean(user && item.roles.includes(user.role)));

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 border-r bg-card transition-transform duration-200 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide">NEXUS Platform</p>
            <p className="text-xs text-muted-foreground">Smart Agriculture</p>
          </div>
        </div>
        <div className="border-b p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Field Intelligence</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Monitor farms, weather stations, synchronized sensors and agricultural telemetry.
          </p>
        </div>
        <nav className="space-y-1 p-3">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                  )
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {isSidebarOpen ? (
        <button
          className="fixed inset-0 z-20 bg-foreground/20 lg:hidden"
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              className="lg:hidden"
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm font-semibold">NEXUS Smart Agriculture Platform</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Agricultural Monitoring & Decision Support System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex">
              <Database className="h-4 w-4 text-primary" aria-hidden="true" />
              {user ? `${user.fullName} · ${user.role}` : "Field network overview"}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
