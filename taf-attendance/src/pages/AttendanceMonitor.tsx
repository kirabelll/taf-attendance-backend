import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useRealTimeAttendance, useAttendanceByDate, useToday } from "@/hooks/useAttendanceData";
import { LogIn, LogOut, RefreshCw, Wifi, Clock, Loader2, AlertCircle } from "lucide-react";

export default function AttendanceMonitor() {
  const today = useToday();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch real-time data with auto-refresh
  const { 
    data: realTimeData, 
    isLoading: isRealTimeLoading, 
    error: realTimeError,
    refetch: refetchRealTime
  } = useRealTimeAttendance(5000); // Refresh every 5 seconds

  // Fetch today's attendance data
  const { 
    data: todayData, 
    isLoading: isTodayLoading, 
    error: todayError,
    refetch: refetchToday
  } = useAttendanceByDate({ date: today });

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const manualRefresh = () => {
    refetchRealTime();
    refetchToday();
    setLastRefresh(new Date());
  };

  // Loading state
  if (isRealTimeLoading || isTodayLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading attendance monitor...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (realTimeError || todayError) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span>Error loading attendance data. Please check your backend connection.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const stats = todayData?.statistics;
  const recentActivity = realTimeData?.attendance?.slice(0, 20) || [];
  const todayAttendance = todayData?.attendance || [];

  // Calculate stats for header cards
  const checkedIn = todayAttendance.filter(r => r.clock_in).length;
  const checkedOut = todayAttendance.filter(r => r.clock_out).length;
  const stillWorking = todayAttendance.filter(r => r.clock_in && !r.clock_out).length;
  const absent = stats?.absent || 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Checked In", value: checkedIn, color: "text-success", bg: "bg-success-subtle" },
            { label: "Checked Out", value: checkedOut, color: "text-primary", bg: "bg-primary-subtle" },
            { label: "Still Working", value: stillWorking, color: "text-warning", bg: "bg-warning-subtle" },
            { label: "Absent", value: absent, color: "text-danger", bg: "bg-danger-subtle" },
          ].map(s => (
            <div key={s.label} className="stat-card text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Live feed */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Live Attendance Feed</p>
                  <div className="flex items-center gap-1.5">
                    <span className="pulse-dot online" />
                    <span className="text-xs text-success font-medium">Live</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={manualRefresh}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {recentActivity.map((item, i) => {
                const isCheckIn = item.clock_in && !item.clock_out;
                const isCheckOut = item.clock_in && item.clock_out;
                const type = isCheckOut ? 'checkout' : 'checkin';
                const time = isCheckOut ? item.clock_out : item.clock_in;
                
                return (
                  <div
                    key={`${item.employee_id}-${i}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 ${i === 0 ? "animate-fade-up" : ""}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-subtle flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                      {item.full_name.split(" ").map(n => n?.[0] || '').join("").slice(0, 2) || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> {item.device_id}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        type === "checkin"
                          ? "bg-success-subtle text-success"
                          : "bg-primary-subtle text-primary"
                      }`}>
                        {type === "checkin"
                          ? <LogIn className="w-3 h-3" />
                          : <LogOut className="w-3 h-3" />}
                        {type === "checkin" ? "Check In" : "Check Out"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{time || "—"}</p>
                    </div>
                  </div>
                );
              })}
              {recentActivity.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's full attendance */}
          <div className="stat-card">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Today's Attendance Log</p>
              <p className="text-xs text-muted-foreground mt-0.5">All employee check-in/out times</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Employee", "Check In", "Check Out", "Hours", "Status", "Device"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground py-2 px-2 first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.slice(0, 15).map((r, index) => (
                    <tr key={`${r.employee_id}-${index}`} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 first:pl-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary-subtle flex items-center justify-center text-primary text-[10px] font-semibold flex-shrink-0">
                            {r.full_name.split(" ").map(n => n?.[0] || '').join("").slice(0, 2) || '??'}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate max-w-[80px]">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-xs text-foreground">{r.clock_in ?? "—"}</td>
                      <td className="py-2.5 px-2 font-mono text-xs text-foreground">{r.clock_out ?? "—"}</td>
                      <td className="py-2.5 px-2 font-mono text-xs text-foreground">
                        {r.working_hours ? `${r.working_hours}h` : "—"}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={
                          r.status === "On Time" ? "badge-present text-[10px]" :
                          r.status === "Absent" ? "badge-absent text-[10px]" : "badge-late text-[10px]"
                        }>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-muted-foreground">{r.device_id}</td>
                    </tr>
                  ))}
                  {todayAttendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No attendance records for today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}