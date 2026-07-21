import {
  Activity,
  Bell,
  ClipboardList,
  CloudSun,
  Database,
  Gauge,
  Layers,
  LogOut,
  Menu,
  Moon,
  RadioTower,
  Sprout,
  Sun,
  UserCircle,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { navigationAccess } from "@/lib/navigationAccess";
import {
  applyThemePreference,
  getResolvedThemePreference,
  getStoredThemePreference,
  storeThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { graphService } from "@/services/graphService";
import type { StationCategory } from "@/types/graph";
import type { Role } from "@/types/user";

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof Activity;
  roles: Role[];
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: "Field Management",
    items: [
      { name: "Farms", href: "/farms", icon: Sprout, roles: navigationAccess.farms },
      { name: "Stations", href: "/stations", icon: RadioTower, roles: navigationAccess.stations },
      { name: "Variables", href: "/variables", icon: Database, roles: navigationAccess.variables },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { name: "Measurements", href: "/measurements", icon: Gauge, roles: navigationAccess.measurements },
      { name: "Meteo Stations", href: "/meteo-stations", icon: CloudSun, roles: navigationAccess.restrictedStations },
      { name: "FOS Stations", href: "/fos-stations", icon: Layers, roles: navigationAccess.restrictedStations },
      { name: "Alerts", href: "/alerts", icon: Bell, roles: navigationAccess.alerts },
      { name: "Import Monitoring", href: "/import-monitoring", icon: ClipboardList, roles: navigationAccess.importMonitoring },
    ],
  },
  {
    title: "Administration",
    items: [{ name: "Users", href: "/users", icon: Users, roles: navigationAccess.users }],
  },
];

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => getResolvedThemePreference());
  const [stationCategories, setStationCategories] = useState<StationCategory[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const restrictedRole = user?.role === "TECHNICIAN" || user?.role === "VIEWER";
  const allowedCategorySet = useMemo(() => new Set(stationCategories), [stationCategories]);
  const visibleNavigationSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!user || !item.roles.includes(user.role)) {
          return false;
        }
        if (restrictedRole && item.href === "/measurements") {
          return false;
        }
        if (item.href === "/meteo-stations") {
          return allowedCategorySet.has("METEO");
        }
        if (item.href === "/fos-stations") {
          return allowedCategorySet.has("FOS");
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = async () => {
    await logout();
    setIsLogoutDialogOpen(false);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    applyThemePreference(themePreference);
  }, [themePreference]);

  useEffect(() => {
    let ignore = false;

    async function loadRestrictedCategories() {
      if (!restrictedRole) {
        setStationCategories([]);
        return;
      }
      try {
        const categories = await graphService.currentCategories();
        if (!ignore) {
          setStationCategories(categories);
        }
      } catch {
        if (!ignore) {
          setStationCategories([]);
        }
      }
    }

    void loadRestrictedCategories();

    return () => {
      ignore = true;
    };
  }, [restrictedRole]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (!getStoredThemePreference()) {
        const nextTheme = mediaQuery.matches ? "dark" : "light";
        setThemePreference(nextTheme);
        applyThemePreference(nextTheme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = themePreference === "dark" ? "light" : "dark";
    storeThemePreference(nextTheme);
    setThemePreference(nextTheme);
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 border-r bg-card transition-transform duration-200 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
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
              Monitor farms, weather stations, measurement variables and agricultural telemetry.
            </p>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto p-3">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground shadow-sm",
                )
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
              Dashboard
            </NavLink>

            {visibleNavigationSections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground/75">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent text-accent-foreground shadow-sm",
                          )
                        }
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {item.name}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t p-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
              onClick={() => {
                setIsSidebarOpen(false);
                navigate("/settings");
              }}
            >
              <UserCircle className="h-9 w-9 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{user?.fullName ?? "Account"}</span>
                <span className="block truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {user?.role.replace("_", " ") ?? "Authenticated"}
                </span>
              </span>
            </button>
            <div className="mt-2">
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => setIsLogoutDialogOpen(true)}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </Button>
            </div>
          </div>
        </div>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={themePreference === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
            >
              {themePreference === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
            <div className="hidden items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex">
              <Database className="h-4 w-4 text-primary" aria-hidden="true" />
              {user ? `${user.fullName} · ${user.role}` : "Field network overview"}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={isLogoutDialogOpen}
        title="Confirm logout"
        description="Are you sure you want to sign out?"
        confirmLabel="Logout"
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
