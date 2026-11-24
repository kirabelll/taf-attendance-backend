import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Clock, Users, BarChart3, MonitorSpeaker,
  Settings, LogOut, Menu, X, Bell, Sun, Moon, ChevronRight, ClipboardList, ClipboardCheck, CalendarDays, ScanLine,
  Fingerprint, Shield, UserCog
} from "lucide-react";
import { useState, useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { notifications } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import ConnectionStatus from "@/components/ConnectionStatus";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  hr: "HR",
  employee: "Employee",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  hr: "bg-green-100 text-green-800",
  employee: "bg-gray-100 text-gray-800",
  viewer: "bg-slate-100 text-slate-800",
};

const getBaseNavItems = () => [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["admin", "manager", "hr", "employee", "viewer"] },
  { label: "Attendance Monitor", icon: Clock, path: "/monitor", roles: ["admin", "manager", "hr", "employee"] },
  { label: "Employees", icon: Users, path: "/employees", roles: ["admin", "manager", "hr"] },
  { label: "Reports", icon: BarChart3, path: "/reports", roles: ["admin", "manager", "hr", "employee", "viewer"] },
  { label: "Attendance Report", icon: ClipboardList, path: "/attendance-report", roles: ["admin", "manager", "hr", "employee", "viewer"] },
  { label: "Monthly Report", icon: CalendarDays, path: "/monthly-report", roles: ["admin", "manager", "hr", "viewer"] },
  { label: "Daily Punches", icon: ScanLine, path: "/daily-punches", roles: ["admin", "manager", "hr", "employee"] },
  { label: "Attendance Entry", icon: ClipboardCheck, path: "/attendance-entry", roles: ["admin", "manager", "hr"] },
  { label: "Device Status", icon: MonitorSpeaker, path: "/devices", roles: ["admin", "manager", "hr"] },
  { label: "Settings", icon: Settings, path: "/settings", roles: ["admin", "manager", "hr", "employee", "viewer"] },
];

const getAdminNavItems = () => [
  { label: "User Management", icon: UserCog, path: "/users", roles: ["admin"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Get current user from localStorage
  const user = useMemo(() => {
    const userStr = localStorage.getItem("attendance_user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  const userRole = user?.role || "employee";
  const userName = user?.full_name || "User";
  const userEmail = user?.email || "user@company.com";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Filter nav items based on user role
  const baseNavItems = useMemo(() =>
    getBaseNavItems().filter(item => item.roles.includes(userRole)),
    [userRole]
  );

  const adminNavItems = useMemo(() =>
    getAdminNavItems().filter(item => item.roles.includes(userRole)),
    [userRole]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static z-30 h-full flex flex-col bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarOpen ? "w-64" : "w-16"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${sidebarOpen ? "" : "justify-center"}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary flex-shrink-0 shadow-primary">
            <Fingerprint className="w-5 h-5 text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-bold text-sidebar-accent-foreground leading-none">AttendMS</p>
              <p className="text-xs text-sidebar-foreground mt-0.5">Management System</p>
            </div>
          )}
        </div>

        {/* Nav - Main Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {baseNavItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
                  ${active
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                  ${!sidebarOpen ? "justify-center" : ""}
                `}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {sidebarOpen && active && (
                  <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                )}
              </Link>
            );
          })}

          {/* Admin section separator */}
          {adminNavItems.length > 0 && sidebarOpen && (
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">Administration</p>
            </div>
          )}

          {/* Nav - Admin Items */}
          {adminNavItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
                  ${active
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                  ${!sidebarOpen ? "justify-center" : ""}
                `}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {sidebarOpen && active && (
                  <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Role Badge */}
        {sidebarOpen && (
          <div className="px-4 py-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <Badge
                variant="outline"
                className={`${ROLE_COLORS[userRole] || ROLE_COLORS.employee} text-xs font-medium`}
              >
                {ROLE_LABELS[userRole] || userRole}
              </Badge>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="px-2 py-4 border-t border-sidebar-border">
          <Link
            to="/login"
            onClick={() => {
              localStorage.removeItem("attendance_access_token");
              localStorage.removeItem("attendance_user");
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all ${!sidebarOpen ? "justify-center" : ""}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </Link>
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex items-center justify-center w-full py-3 border-t border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {baseNavItems.find(n => n.path === location.pathname)?.label ??
                 adminNavItems.find(n => n.path === location.pathname)?.label ??
                 "Attendance Management"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="ml-4">
              <ConnectionStatus />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4 text-foreground" />
                : <Moon className="w-4 h-4 text-foreground" />}
            </button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                  <Bell className="w-4 h-4 text-foreground" />
                  {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full"></span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">{notifications.length} new alerts</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map(n => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 px-4 py-3 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          n.type === "error" ? "bg-danger" : n.type === "warning" ? "bg-warning" : n.type === "success" ? "bg-success" : "bg-info"
                        }`} />
                        <span className="text-sm font-medium text-foreground truncate">{n.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-4">{n.message}</p>
                    </DropdownMenuItem>
                  ))}
                  {notifications.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">No new alerts</p>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">
                {userInitials || "HR"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              {sidebarOpen && (
                <Badge
                  variant="outline"
                  className={`${ROLE_COLORS[userRole] || ROLE_COLORS.employee} text-xs hidden sm:inline-flex`}
                >
                  {ROLE_LABELS[userRole] || userRole}
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
