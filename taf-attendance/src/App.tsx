import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AttendanceMonitor from "./pages/AttendanceMonitor";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import AttendanceReport from "./pages/AttendanceReport";
import AttendanceEntry from "./pages/AttendanceEntry";
import MonthlyReport from "./pages/MonthlyReport";
import DailyPunches from "./pages/DailyPunches";
import DeviceStatus from "./pages/DeviceStatus";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: JSX.Element }) {
  return localStorage.getItem("attendance_access_token")
    ? children
    : <Navigate to="/login" replace />;
}

function RequireRole({ children, allowedRoles }: { children: JSX.Element; allowedRoles: string[] }) {
  const userStr = localStorage.getItem("attendance_user");
  if (!userStr) return <Navigate to="/login" replace />;

  try {
    const user = JSON.parse(userStr);
    if (allowedRoles.includes(user.role)) {
      return children;
    }
    return <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/monitor" element={<RequireAuth><AttendanceMonitor /></RequireAuth>} />
            <Route path="/employees" element={<RequireAuth><Employees /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
            <Route path="/attendance-report" element={<RequireAuth><AttendanceReport /></RequireAuth>} />
            <Route path="/attendance-entry" element={<RequireAuth><AttendanceEntry /></RequireAuth>} />
            <Route path="/monthly-report" element={<RequireAuth><MonthlyReport /></RequireAuth>} />
            <Route path="/daily-punches" element={<RequireAuth><DailyPunches /></RequireAuth>} />
            <Route path="/devices" element={<RequireAuth><DeviceStatus /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route
              path="/users"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["admin"]}>
                    <UserManagement />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
