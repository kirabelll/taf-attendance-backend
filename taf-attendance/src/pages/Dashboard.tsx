import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useDailyAttendanceSummary, useRealTimeAttendance, useEmployees, useToday } from "@/hooks/useAttendanceData";
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown, ChevronRight, AlertCircle, Loader2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { Link } from "react-router-dom";

const PIE_COLORS = ["hsl(142 71% 45%)", "hsl(0 84% 60%)", "hsl(38 92% 50%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-elevated text-sm">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-medium text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Mock weekly trend data (you can replace this with real API data later)
const weeklyTrend = [
  { day: "Mon", present: 9, absent: 2, late: 1 },
  { day: "Tue", present: 10, absent: 1, late: 1 },
  { day: "Wed", present: 8, absent: 3, late: 1 },
  { day: "Thu", present: 11, absent: 0, late: 1 },
  { day: "Fri", present: 7, absent: 2, late: 3 },
  { day: "Sat", present: 4, absent: 7, late: 1 },
  { day: "Sun", present: 2, absent: 9, late: 1 },
];

export default function Dashboard() {
  const today = useToday();
  
  // Fetch real-time data
  const { 
    data: dailySummary, 
    isLoading: isDailySummaryLoading, 
    error: dailySummaryError 
  } = useDailyAttendanceSummary(today);
  
  const { 
    data: realTimeData, 
    isLoading: isRealTimeLoading, 
    error: realTimeError 
  } = useRealTimeAttendance();

  // Fetch employees for department data
  const { 
    data: employeesData, 
    isLoading: isEmployeesLoading, 
    error: employeesError 
  } = useEmployees();

  // Helper function to get department name
  const getDepartmentName = (department: any): string => {
    if (typeof department === 'string') {
      return department;
    } else if (department && typeof department === 'object' && 'dept_name' in department) {
      return department.dept_name;
    }
    return 'Unknown';
  };

  // Loading state
  if (isDailySummaryLoading || isRealTimeLoading || isEmployeesLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading dashboard data...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (dailySummaryError || realTimeError || employeesError) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span>Error loading dashboard data. Please check your backend connection.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const summary = dailySummary?.summary;
  const recentAttendance = realTimeData?.attendance?.slice(0, 6) || [];
  const employees = employeesData?.employees || [];

  // Calculate real department stats from employee and attendance data
  const calculateDepartmentStats = () => {
    if (!employees.length || !dailySummary?.breakdown) return [];

    // Group employees by department
    const departmentGroups: Record<string, { total: number; present: number }> = {};
    
    employees.forEach(emp => {
      const deptName = getDepartmentName(emp.department);
      if (!departmentGroups[deptName]) {
        departmentGroups[deptName] = { total: 0, present: 0 };
      }
      departmentGroups[deptName].total++;
    });

    // Count present employees by department
    const presentEmployees = [
      ...(dailySummary.breakdown.on_time_employees || []),
      ...(dailySummary.breakdown.late_employees || [])
    ];

    presentEmployees.forEach(attendanceRecord => {
      const employee = employees.find(emp => emp.employee_id === attendanceRecord.employee_id);
      if (employee) {
        const deptName = getDepartmentName(employee.department);
        if (departmentGroups[deptName]) {
          departmentGroups[deptName].present++;
        }
      }
    });

    // Convert to array and sort by total employees (largest departments first)
    return Object.entries(departmentGroups)
      .map(([dept, stats]) => ({
        dept,
        present: stats.present,
        total: stats.total
      }))
      .filter(dept => dept.total > 0) // Only show departments with employees
      .sort((a, b) => b.total - a.total); // Sort by total employees descending
  };

  const departmentStats = calculateDepartmentStats();

  const statsData = summary ? [
    {
      label: "Total Employees",
      value: summary.total_employees,
      icon: Users,
      color: "bg-primary-subtle text-primary",
      trend: "+2 this month",
      positive: true,
    },
    {
      label: "Present Today",
      value: summary.present,
      icon: UserCheck,
      color: "bg-success-subtle text-success",
      trend: `${summary.attendance_rate?.toFixed(1)}% attendance rate`,
      positive: true,
    },
    {
      label: "Absent Today",
      value: summary.absent,
      icon: UserX,
      color: "bg-danger-subtle text-danger",
      trend: `${((summary.absent / summary.total_employees) * 100).toFixed(1)}% absent`,
      positive: false,
    },
    {
      label: "Late Arrivals",
      value: summary.late,
      icon: Clock,
      color: "bg-warning-subtle text-warning",
      trend: `${summary.total_late_minutes} total minutes`,
      positive: false,
    },
  ] : [];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statsData.map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {stat.positive
                  ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                  : <TrendingDown className="w-3.5 h-3.5 text-danger" />}
                <span className="text-xs text-muted-foreground">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Weekly trend */}
          <div className="xl:col-span-2 stat-card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Weekly Attendance Trend</p>
                <p className="text-xs text-muted-foreground mt-0.5">Present, Absent & Late breakdown</p>
              </div>
              <Link to="/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
                View Reports <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyTrend} barSize={10} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="present" name="Present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Late" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Today's summary */}
          <div className="stat-card">
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground">Today's Summary</p>
              <p className="text-xs text-muted-foreground mt-0.5">Attendance distribution</p>
            </div>
            {summary && (
              <>
                <div className="flex justify-center">
                  <PieChart width={180} height={160}>
                    <Pie
                      data={[
                        { name: "Present", value: summary.on_time },
                        { name: "Absent", value: summary.absent },
                        { name: "Late", value: summary.late },
                      ]}
                      cx={85} cy={75} innerRadius={48} outerRadius={72}
                      paddingAngle={3} dataKey="value"
                    >
                      {PIE_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </div>
                <div className="space-y-2 mt-2">
                  {[
                    { label: "On Time", value: summary.on_time, color: "bg-success" },
                    { label: "Absent", value: summary.absent, color: "bg-danger" },
                    { label: "Late", value: summary.late, color: "bg-warning" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{item.value}</span>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round((item.value / summary.total_employees) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Department stats + attendance rate */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Department breakdown */}
          <div className="xl:col-span-2 stat-card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Department Attendance</p>
                <p className="text-xs text-muted-foreground mt-0.5">Today's attendance by department</p>
              </div>
            </div>
            <div className="space-y-3">
              {departmentStats.length > 0 ? departmentStats.map(d => {
                const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
                return (
                  <div key={d.dept} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-32 flex-shrink-0 truncate font-medium">{d.dept}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-green-500"
                        style={{
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground w-20 text-right flex-shrink-0">
                      <span className="text-green-600 font-semibold">{d.present}</span>
                      <span className="text-muted-foreground">/{d.total}</span>
                      <span className="text-muted-foreground text-xs ml-1">({pct}%)</span>
                    </span>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No department data available</p>
                  <p className="text-xs mt-1">Employee department information may not be configured</p>
                </div>
              )}
            </div>
          </div>

          {/* Attendance rate area chart */}
          <div className="stat-card">
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground">Attendance Rate</p>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days trend</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyTrend.map(w => ({ ...w, rate: Math.round((w.present / 12) * 100) }))}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="rate" name="Rate"
                  stroke="hsl(var(--primary))" strokeWidth={2}
                  fill="url(#rateGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent attendance table */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Recent Attendance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Today's check-in overview</p>
            </div>
            <Link to="/employees" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Employee", "Department", "Check In", "Check Out", "Status"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 px-2 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((r, index) => {
                  // Find employee to get department info
                  const employee = employees.find(emp => emp.employee_id === r.employee_id);
                  const department = employee ? getDepartmentName(employee.department) : 'Unknown';
                  
                  return (
                    <tr key={`${r.employee_id}-${index}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 first:pl-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-subtle flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                            {r.full_name.split(" ").map(n => n?.[0] || '').join("").slice(0, 2) || '??'}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[120px]">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        <span className="text-sm">{department}</span>
                      </td>
                      <td className="py-3 px-2 font-mono text-sm text-foreground">{r.clock_in ?? "—"}</td>
                      <td className="py-3 px-2 font-mono text-sm text-foreground">{r.clock_out ?? "—"}</td>
                      <td className="py-3 px-2">
                        <span className={
                          r.status === "On Time" ? "badge-present" :
                          r.status === "Absent" ? "badge-absent" : "badge-late"
                        }>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentAttendance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No recent attendance data available</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}