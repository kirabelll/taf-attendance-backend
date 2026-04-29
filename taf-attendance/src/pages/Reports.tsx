import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { 
  useAttendanceByDate, 
  useAttendanceReport, 
  useDepartmentStats, 
  useEmployees,
  useExportReport,
  useEmployeeLateReport,
  useExportLateReportCsv,
  useToday 
} from "@/hooks/useAttendanceData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { 
  Download, FileSpreadsheet, FileText, Calendar, Building2, TrendingUp, 
  Loader2, AlertCircle, CheckCircle, Clock, Users, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-elevated text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">{p.value}{p.name === "Rate" ? "%" : ""}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const today = useToday();
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(today);
  const [dept, setDept] = useState("All");
  const [generated, setGenerated] = useState(false);
  const [showLateReport, setShowLateReport] = useState(false);
  const [lateReportEnabled, setLateReportEnabled] = useState(false);

  // Fetch data
  const { data: employeesData } = useEmployees();
  const { 
    data: reportData, 
    isLoading: isReportLoading, 
    error: reportError,
    refetch: refetchReport
  } = useAttendanceByDate({ 
    start_date: dateFrom, 
    end_date: dateTo,
    ...(dept !== "All" && { employee_name: dept })
  });
  const { 
    data: departmentData, 
    isLoading: isDepartmentLoading 
  } = useDepartmentStats(today);

  const { 
    data: attendanceReportData,
    isLoading: isAttendanceReportLoading
  } = useAttendanceReport(today);

  // Late report query
  const { 
    data: lateReportData,
    isLoading: isLateReportLoading,
    error: lateReportError
  } = useEmployeeLateReport({
    start_date: dateFrom,
    end_date: dateTo
  }, lateReportEnabled);

  // Export mutation
  const exportMutation = useExportReport();

  // Late report CSV export mutation
  const exportLateReportMutation = useExportLateReportCsv();

  const employees = employeesData?.employees || [];
  
  // Helper function to get department name - same as in Employees page
  const getDepartmentName = (department: any): string => {
    if (typeof department === 'string') {
      return department;
    } else if (department && typeof department === 'object' && 'dept_name' in department) {
      return department.dept_name;
    }
    return '';
  };
  
  const departments = ["All", ...new Set(employees.map(e => getDepartmentName(e.department)).filter(Boolean))];

  // Process data for charts
  const processWeeklyData = () => {
    if (!reportData?.attendance) return [];
    
    const dailyStats: Record<string, { present: number; absent: number; late: number; date: string }> = {};
    
    // Initialize with date range
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyStats[dateStr] = { present: 0, absent: 0, late: 0, date: dateStr };
    }

    // Count attendance by date
    reportData.attendance.forEach(record => {
      const date = record.date;
      if (dailyStats[date]) {
        if (record.status === 'Absent') {
          dailyStats[date].absent++;
        } else if (record.status === 'Late') {
          dailyStats[date].late++;
        } else {
          dailyStats[date].present++;
        }
      }
    });

    return Object.values(dailyStats).map(day => ({
      day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      present: day.present,
      absent: day.absent,
      late: day.late,
      date: day.date
    }));
  };

  const processMonthlyTrend = () => {
    const weeklyData = processWeeklyData();
    return weeklyData.map(day => ({
      date: new Date(day.date).getDate().toString(),
      rate: day.present + day.late > 0 ? Math.round((day.present / (day.present + day.absent + day.late)) * 100) : 0
    }));
  };
  const processDepartmentStats = () => {
    if (!departmentData?.breakdown || !employees.length) return [];
    
    const deptStats: Record<string, { present: number; total: number }> = {};
    
    // Initialize departments
    departments.filter(d => d !== "All").forEach(dept => {
      deptStats[dept] = { present: 0, total: 0 };
    });

    // Count employees by department
    employees.forEach(emp => {
      const deptName = getDepartmentName(emp.department);
      if (deptName && deptStats[deptName]) {
        deptStats[deptName].total++;
      }
    });

    // Count present employees
    [...(departmentData.breakdown.on_time_employees || []), ...(departmentData.breakdown.late_employees || [])].forEach(emp => {
      const employee = employees.find(e => e.employee_id === emp.employee_id);
      if (employee) {
        const deptName = getDepartmentName(employee.department);
        if (deptName && deptStats[deptName]) {
          deptStats[deptName].present++;
        }
      }
    });

    return Object.entries(deptStats).map(([dept, stats]) => ({
      dept,
      present: stats.present,
      total: stats.total
    }));
  };

  const handleGenerateReport = () => {
    setGenerated(true);
    refetchReport();
  };

  const handleGenerateLateReport = () => {
    setLateReportEnabled(true);
    setShowLateReport(true);
  };

  const handleExportLateReportCsv = async () => {
    try {
      const result = await exportLateReportMutation.mutateAsync({
        start_date: dateFrom,
        end_date: dateTo
      });
      
      // Show success message (you can add a toast notification here)
      console.log('Late report CSV export successful:', result.message);
    } catch (error) {
      console.error('Late report CSV export failed:', error);
      // Show error message (you can add a toast notification here)
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const result = await exportMutation.mutateAsync({
        format,
        params: {
          start_date: dateFrom,
          end_date: dateTo,
          ...(dept !== "All" && { department: dept })
        }
      });
      
      // Show success message (you can add a toast notification here)
      console.log('Export successful:', result.message);
    } catch (error) {
      console.error('Export failed:', error);
      // Show error message (you can add a toast notification here)
    }
  };

  const weeklyData = processWeeklyData();
  const monthlyTrend = processMonthlyTrend();
  const departmentStats = processDepartmentStats();
  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Filters */}
        <div className="stat-card">
          <p className="text-sm font-semibold text-foreground mb-4">Generate Report</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Department
              </label>
              <select
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {departments.map(d => <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>)}
              </select>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={isReportLoading}
              className="h-10 bg-primary text-primary-foreground shadow-primary hover:opacity-90 transition-opacity"
            >
              {isReportLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
          {generated && reportData && (
            <div className="mt-3 flex items-center gap-2 text-sm text-success">
              <CheckCircle className="w-4 h-4" />
              Report generated successfully! Found {reportData.statistics.filtered_count} records.
            </div>
          )}
        </div>
        {/* Export buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => handleExport('csv')}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground disabled:opacity-50"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-success" />
            )}
            Export CSV
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground disabled:opacity-50"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-danger" />
            )}
            Export PDF
          </button>
          <button 
            onClick={() => handleExport('excel')}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground disabled:opacity-50"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-primary" />
            )}
            Download Excel
          </button>
          <button 
            onClick={handleGenerateLateReport}
            disabled={isLateReportLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground disabled:opacity-50"
          >
            {isLateReportLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 text-warning" />
            )}
            Late Report
          </button>
        </div>

        {/* Error state */}
        {reportError && (
          <div className="stat-card">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Error loading report data. Please check your backend connection.</span>
            </div>
          </div>
        )}
        {/* Charts */}
        {!reportError && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Monthly attendance rate */}
            <div className="stat-card">
              <div className="mb-5">
                <p className="text-sm font-semibold text-foreground">Attendance Rate Trend</p>
                <p className="text-xs text-muted-foreground mt-0.5">Daily attendance % for selected period</p>
              </div>
              {isReportLoading ? (
                <div className="flex items-center justify-center h-[220px]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="rateGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="rate" name="Rate" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rateGrad2)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Department comparison */}
            <div className="stat-card">
              <div className="mb-5">
                <p className="text-sm font-semibold text-foreground">Department Comparison</p>
                <p className="text-xs text-muted-foreground mt-0.5">Present vs Total by department</p>
              </div>
              {isDepartmentLoading ? (
                <div className="flex items-center justify-center h-[220px]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={departmentStats} barSize={14} barGap={4} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="present" name="Present" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground) / 0.3)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
        {/* Weekly breakdown */}
        {!reportError && (
          <div className="stat-card">
            <div className="mb-5">
              <p className="text-sm font-semibold text-foreground">Period Breakdown</p>
              <p className="text-xs text-muted-foreground mt-0.5">Daily present, absent and late trends</p>
            </div>
            {isReportLoading ? (
              <div className="flex items-center justify-center h-[240px]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="present" name="Present" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="hsl(var(--danger))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="late" name="Late" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
        {/* Summary table */}
        {!reportError && (
          <div className="stat-card">
            <p className="text-sm font-semibold text-foreground mb-4">Department Summary</p>
            {isDepartmentLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Department", "Total Employees", "Present", "Absent", "Late", "Attendance %"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 px-3 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departmentStats.map(d => {
                      const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
                      const absent = d.total - d.present;
                      return (
                        <tr key={d.dept} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 first:pl-0 font-medium text-foreground">{d.dept}</td>
                          <td className="py-3 px-3 text-muted-foreground">{d.total}</td>
                          <td className="py-3 px-3 text-success font-medium">{d.present}</td>
                          <td className="py-3 px-3 text-danger font-medium">{absent}</td>
                          <td className="py-3 px-3 text-warning font-medium">0</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    background: pct >= 80 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--danger))"
                                  }}
                                />
                              </div>
                              <span className="font-medium text-foreground">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {departmentStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          No department data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Late Report Section */}
        {showLateReport && (
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">Employee Late Report</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportLateReportCsv}
                  disabled={exportLateReportMutation.isPending || !lateReportData}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-medium text-foreground disabled:opacity-50"
                >
                  {exportLateReportMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-success" />
                  )}
                  Export CSV
                </button>
                <button
                  onClick={() => setShowLateReport(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {lateReportError && (
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Failed to load late report</span>
              </div>
            )}

            {isLateReportLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : lateReportData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Employees</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{lateReportData.summary.total_employees}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="text-xs text-muted-foreground">Employees with Late</span>
                    </div>
                    <p className="text-lg font-semibold text-warning">{lateReportData.summary.employees_with_late}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">Avg Punctuality</span>
                    </div>
                    <p className="text-lg font-semibold text-success">{lateReportData.summary.average_punctuality_rate}%</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-danger" />
                      <span className="text-xs text-muted-foreground">Total Late Hours</span>
                    </div>
                    <p className="text-lg font-semibold text-danger">{lateReportData.summary.total_late_hours}h</p>
                  </div>
                </div>

                {/* Period Info */}
                <div className="mb-4 text-sm text-muted-foreground">
                  Report Period: {lateReportData.period.start_date} to {lateReportData.period.end_date} ({lateReportData.period.days} days)
                </div>

                {/* Employee Late Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3 first:pl-0">Rank</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3">Employee</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3">Total Days</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3">Late Days</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3">Total Late (min)</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3">Avg Late (min)</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-3">Punctuality %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lateReportData.employees.map((employee, index) => (
                        <tr key={employee.employee_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 first:pl-0 font-medium text-foreground">#{index + 1}</td>
                          <td className="py-3 px-3 font-medium text-foreground">{employee.full_name}</td>
                          <td className="py-3 px-3 text-muted-foreground">{employee.total_days}</td>
                          <td className="py-3 px-3 text-warning font-medium">{employee.late_days}</td>
                          <td className="py-3 px-3 text-danger font-medium">{employee.total_late_minutes}</td>
                          <td className="py-3 px-3 text-muted-foreground">{employee.average_late_minutes}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden max-w-[60px]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${employee.punctuality_rate}%`,
                                    background: employee.punctuality_rate >= 90 ? "hsl(var(--success))" : 
                                              employee.punctuality_rate >= 70 ? "hsl(var(--warning))" : "hsl(var(--danger))"
                                  }}
                                />
                              </div>
                              <span className="font-medium text-foreground text-xs">{employee.punctuality_rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {lateReportData.employees.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            No late records found for the selected period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}