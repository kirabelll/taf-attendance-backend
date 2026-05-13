import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AttendanceMonitor from "./pages/AttendanceMonitor";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import DeviceStatus from "./pages/DeviceStatus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

<<<<<<< HEAD
const queryClient = new QueryClient();
=======
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
>>>>>>> e59b52a9ca54cce2f46bcd9901a6e01b514500b1

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
<<<<<<< HEAD
        <BrowserRouter>
=======
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
>>>>>>> e59b52a9ca54cce2f46bcd9901a6e01b514500b1
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitor" element={<AttendanceMonitor />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/devices" element={<DeviceStatus />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
