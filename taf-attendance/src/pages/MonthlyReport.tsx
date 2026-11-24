import { useMemo, useState } from "react";
import { CalendarDays, Download, LoaderCircle, Search, Users, Clock3, UserCheck, UserX, List, Table, ChevronRight, Briefcase, User, MapPin, TrendingUp, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAttendanceByDate, useEmployees } from "@/hooks/useAttendanceData";

type AttendanceRecord = {
  employee_id: string;
  full_name?: string;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  working_hours?: number | string | null;
  lunch_break_hours?: number | string | null;
  late_minutes?: number | string | null;
  status?: string;
  overtime_hours?: number | string | null;
};

type EmployeeSummary = {
  employee_id: string;
  name: string;
  department: string;
  position?: string;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
  paid_leave: number;
  unpaid_leave: number;
  late_minutes: number;
  working_hours: number;
  overtime_hours: number;
  lunch_break_hours: number;
  attendance_rate: number;
};

function localMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const monthText = String(monthNumber).padStart(2, "0");
  return {
    start_date: `${year}-${monthText}-01`,
    end_date: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getWeekdays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  let count = 0;
  for (let day = 1; day <= days; day++) {
    const weekday = new Date(year, monthNumber - 1, day).getDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

function downloadCsv(rows: EmployeeSummary[], month: string) {
  const headings = ["Employee ID", "Employee Name", "Department", "Present Days", "Absent Days", "Late Days", "Paid Leave Days", "Unpaid Leave Days", "Late Minutes", "Lunch Break Hours", "Working Hours", "Overtime Hours", "Attendance Rate (%)"];
  const values = rows.map((row) => [row.employee_id, row.name, row.department, row.present, row.absent, row.late, row.paid_leave, row.unpaid_leave, row.late_minutes, row.lunch_break_hours.toFixed(2), row.working_hours.toFixed(2), row.overtime_hours.toFixed(2), row.attendance_rate.toFixed(1)]);
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const content = [headings, ...values].map((line) => line.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `monthly-attendance-${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getRateColor(rate: number) {
  if (rate >= 95) return "text-success";
  if (rate >= 85) return "text-warning";
  if (rate >= 70) return "text-orange-500";
  return "text-danger";
}

function getRateBg(rate: number) {
  if (rate >= 95) return "bg-success/10";
  if (rate >= 85) return "bg-warning/10";
  if (rate >= 70) return "bg-orange-500/10";
  return "bg-danger/10";
}

export default function MonthlyReport() {
  const [month, setMonth] = useState(localMonthString);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const bounds = useMemo(() => getMonthBounds(month), [month]);
  const workdays = useMemo(() => getWeekdays(month), [month]);
  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useAttendanceByDate(bounds);
  const { data: employeesData, isLoading: employeesLoading, isError: employeesError } = useEmployees();

  const summaries: EmployeeSummary[] = useMemo(() => {
    const records: AttendanceRecord[] = attendanceData?.attendance || [];
    const employees = employeesData?.employees || [];
    const grouped = new Map<string, EmployeeSummary>();
    employees.forEach((employee: any) => {
      if (!employee.employee_id) return;
      const department = typeof employee.department === "string"
        ? employee.department
        : employee.department?.dept_name || "";
      grouped.set(String(employee.employee_id), {
        employee_id: String(employee.employee_id),
        name: employee.full_name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || String(employee.employee_id),
        department,
        position: employee.position || "",
        present: 0,
        absent: 0,
        late: 0,
        on_leave: 0,
        paid_leave: 0,
        unpaid_leave: 0,
        late_minutes: 0,
        working_hours: 0,
        overtime_hours: 0,
        lunch_break_hours: 0,
        attendance_rate: 0,
      });
    });

    records.forEach((record) => {
      const day = new Date(`${record.date}T00:00:00`).getDay();
      const isWorkday = day !== 0 && day !== 6;
      if (!isWorkday) return;
      const employeeId = String(record.employee_id);
      const summary = grouped.get(employeeId) || {
        employee_id: employeeId,
        name: record.full_name || employeeId,
        department: "",
        position: "",
        present: 0,
        absent: 0,
        late: 0,
        on_leave: 0,
        paid_leave: 0,
        unpaid_leave: 0,
        late_minutes: 0,
        working_hours: 0,
        overtime_hours: 0,
        lunch_break_hours: 0,
        attendance_rate: 0,
      };
      const status = (record.status || "").toLowerCase();
      const lateMinutes = Number(record.late_minutes || 0);
      const otHours = Number(record.overtime_hours || 0);
      if (status === "paid leave") {
        summary.on_leave++;
        summary.paid_leave++;
        summary.present++;
      } else if (status === "unpaid leave" || status === "on leave") {
        summary.on_leave++;
        summary.unpaid_leave++;
      } else if (status === "absent") {
        if (isWorkday) summary.absent++;
      } else if (status === "late" || lateMinutes > 0) {
        summary.present++;
        summary.late++;
      } else {
        summary.present++;
      }
      summary.late_minutes += lateMinutes;
      summary.working_hours += Number(record.working_hours || 0);
      summary.overtime_hours += otHours;
      summary.lunch_break_hours += Number(record.lunch_break_hours || 0);
      grouped.set(employeeId, summary);
    });

    return Array.from(grouped.values()).map((summary) => {
      const expectedDays = Math.max(0, workdays - summary.unpaid_leave);
      return {
        ...summary,
        attendance_rate: expectedDays ? Math.min(100, (summary.present / expectedDays) * 100) : 0,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceData, employeesData, workdays]);

  const departments = Array.from(new Set(summaries.map((row) => row.department).filter(Boolean))).sort();
  const filtered = summaries.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(search.toLowerCase()) || row.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = departmentFilter === "All" || row.department === departmentFilter;
    const matchesStatus = statusFilter === "All"
      || (statusFilter === "Absent" && row.absent > 0)
      || (statusFilter === "Late" && row.late > 0)
      || (statusFilter === "On Leave" && row.on_leave > 0)
      || (statusFilter === "Present" && row.present > 0);
    return matchesSearch && matchesDepartment && matchesStatus;
  });
  const totals = filtered.reduce((total, row) => ({
    present: total.present + row.present,
    absent: total.absent + row.absent,
    late: total.late + row.late,
    onLeave: total.onLeave + row.on_leave,
    hours: total.hours + row.working_hours,
    otHours: total.otHours + row.overtime_hours,
    lunchHours: total.lunchHours + row.lunch_break_hours,
  }), { present: 0, absent: 0, late: 0, onLeave: 0, hours: 0, otHours: 0, lunchHours: 0 });

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isLoading = attendanceLoading || employeesLoading;
  const selectedEmployee = selectedEmployeeId ? filtered.find(e => e.employee_id === selectedEmployeeId) : null;

  // List View Item
  const EmployeeListItem = ({ row, isSelected, onClick }: {
    row: EmployeeSummary;
    isSelected: boolean;
    onClick: () => void
  }) => {
    const rateColor = getRateColor(row.attendance_rate);
    const rateBg = getRateBg(row.attendance_rate);

    return (
      <div
        key={row.employee_id}
        onClick={onClick}
        className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
          isSelected
            ? "border-primary/50 bg-primary/5 shadow-primary/10"
            : "border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0 shadow-primary/20">
            {row.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-foreground truncate">{row.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{row.employee_id}</p>
              </div>
              {row.position && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{row.position}</span>}
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${rateBg} ${rateColor}`}>
                {row.attendance_rate.toFixed(1)}%
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {row.department || "—"}
              </span>
              <span className="flex items-center gap-1 text-success">
                <UserCheck className="w-3 h-3" />
                Present: {row.present}
              </span>
              {row.absent > 0 && (
                <span className="flex items-center gap-1 text-danger">
                  <UserX className="w-3 h-3" />
                  Absent: {row.absent}
                </span>
              )}
              {row.late > 0 && (
                <span className="flex items-center gap-1 text-warning">
                  <Clock3 className="w-3 h-3" />
                  Late: {row.late} ({row.late_minutes}min)
                </span>
              )}
              {row.on_leave > 0 && (
                <span className="flex items-center gap-1 text-info">
                  <MapPin className="w-3 h-3" />
                  Leave: {row.on_leave} (Paid: {row.paid_leave}, Unpaid: {row.unpaid_leave})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:ml-16 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {row.working_hours.toFixed(1)}h
          </span>
          {row.overtime_hours > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="w-3 h-3" />
              OT: {row.overtime_hours.toFixed(1)}h
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            Lunch: {row.lunch_break_hours.toFixed(1)}h
          </span>
        </div>

        {isSelected && (
          <div className="w-full h-1 bg-primary rounded-b-xl mt-4" />
        )}
      </div>
    );
  };

  // Table View
  const EmployeeTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {["Employee", "Department", "Present", "Absent", "Late", "Paid leave", "Unpaid leave", "Late min", "Lunch break", "Work hours", "OT hours", "Attend. rate"].map((heading) => <th key={heading} className="px-4 py-3 font-medium first:pl-5">{heading}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filtered.map((row) => (
            <tr
              key={row.employee_id}
              className={`hover:bg-muted/20 cursor-pointer ${selectedEmployeeId === row.employee_id ? "bg-primary-subtle" : ""}`}
              onClick={() => setSelectedEmployeeId(row.employee_id)}
            >
              <td className="px-5 py-3"><p className="font-medium text-foreground">{row.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.employee_id}</p></td>
              <td className="px-4 py-3 text-muted-foreground">{row.department || "—"}</td>
              <td className="px-4 py-3 text-success">{row.present}</td>
              <td className="px-4 py-3 text-danger">{row.absent}</td>
              <td className="px-4 py-3 text-warning">{row.late} ({row.late_minutes}min)</td>
              <td className="px-4 py-3 text-info">{row.paid_leave}</td>
              <td className="px-4 py-3 text-info">{row.unpaid_leave}</td>
              <td className="px-4 py-3">{row.late_minutes}</td>
              <td className="px-4 py-3">{row.lunch_break_hours.toFixed(2)} hr</td>
              <td className="px-4 py-3">{row.working_hours.toFixed(2)} hr</td>
              <td className="px-4 py-3">{row.overtime_hours > 0 ? row.overtime_hours.toFixed(2) + " hr" : "—"}</td>
              <td className="px-4 py-3 font-medium">
                <span className={`px-2 py-1 rounded-full text-xs ${getRateBg(row.attendance_rate)} ${getRateColor(row.attendance_rate)}`}>
                  {row.attendance_rate.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={12} className="px-5 py-12 text-center text-muted-foreground">No employees match your filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  // Detail Panel
  const DetailPanel = () => {
    if (!selectedEmployee) return null;
    const emp = selectedEmployee;
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">Employee Details</p>
          <button onClick={() => setSelectedEmployeeId(null)} className="p-1 rounded hover:bg-muted">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex flex-col items-center text-center pb-4 border-b border-border">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xl font-bold mb-3 shadow-primary">
            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <p className="text-base font-bold text-foreground">{emp.name}</p>
          <p className="text-sm text-muted-foreground">{emp.position || "—"}</p>
          <span className="mt-2 text-xs bg-primary-subtle text-primary px-2.5 py-1 rounded-full font-medium">
            {emp.department || "—"}
          </span>
        </div>
        <div className="py-4 space-y-3 border-b border-border grid grid-cols-2 gap-2">
          {[
            { label: "Employee ID", value: emp.employee_id, icon: User },
            { label: "Department", value: emp.department || "—", icon: Briefcase },
            { label: "Position", value: emp.position || "—", icon: Briefcase },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="py-4">
          <p className="text-xs font-semibold text-foreground mb-3">Monthly Summary</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Present", value: emp.present, color: "text-success", icon: UserCheck },
              { label: "Absent", value: emp.absent, color: "text-danger", icon: UserX },
              { label: "Late", value: emp.late, color: "text-warning", icon: Clock3 },
            ].map(s => (
              <div key={s.label} className="text-center bg-muted rounded-lg py-2">
                <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Work Hours", value: emp.working_hours.toFixed(1) + "h", icon: Clock3 },
              { label: "Overtime", value: emp.overtime_hours.toFixed(1) + "h", icon: AlertTriangle, color: emp.overtime_hours > 0 ? "text-warning" : "text-muted-foreground" },
              { label: "Lunch Break", value: emp.lunch_break_hours.toFixed(1) + "h", icon: Clock3 },
            ].map(s => (
              <div key={s.label} className="text-center bg-muted rounded-lg py-2">
                <s.icon className={`h-4 w-4 ${(s as any).color || "text-muted-foreground"} mx-auto mb-1`} />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="text-center bg-muted rounded-lg py-2">
            <p className="text-[10px] text-muted-foreground">Attendance Rate</p>
            <p className={`text-2xl font-bold ${getRateColor(emp.attendance_rate)}`}>{emp.attendance_rate.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header with Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Monthly Attendance Report</h2>
            <p className="mt-1 text-sm text-muted-foreground">Employee attendance totals for {monthLabel}. Paid leave counts as present; unpaid leave is listed separately. Weekend days are excluded from absence totals.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Report month</span>
              <span className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input aria-label="Select report month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent text-sm text-foreground outline-none" />
              </span>
            </label>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4 mr-1" /> List
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table className="w-4 h-4 mr-1" /> Table
              </button>
            </div>
            <Button variant="outline" onClick={() => downloadCsv(filtered, month)} disabled={!filtered.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Employees", value: filtered.length, icon: Users, color: "text-primary" },
            { label: "Present Days", value: totals.present, icon: UserCheck, color: "text-success" },
            { label: "Absent Days", value: totals.absent, icon: UserX, color: "text-danger" },
            { label: "Late Arrivals", value: totals.late, icon: Clock3, color: "text-warning" },
          ].map((item) => (
            <div key={item.label} className="stat-card flex items-center gap-3">
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-xl font-bold text-foreground">{item.value}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Employee List/Table */}
          <div className="xl:col-span-3 stat-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Employee monthly totals</h3>
                <p className="mt-1 text-xs text-muted-foreground">{workdays} weekdays in {monthLabel} · {totals.hours.toFixed(2)} working hours · {totals.otHours.toFixed(2)} overtime hours · {totals.lunchHours.toFixed(2)} lunch break hours</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee…" className="pl-9" />
                </div>
                <select aria-label="Filter monthly report by department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="All">All departments</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <select aria-label="Filter monthly report by attendance status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {["All", "Present", "Absent", "Late", "On Leave"].map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !isLoading && (attendanceError || employeesError) ? (
              <div className="text-center py-12 text-destructive">Could not load the monthly report. Check the backend connection.</div>
            ) : (
              <>
                {viewMode === "list" ? (
                  <div className="space-y-3 px-5 pb-5">
                    {filtered.length > 0 ? (
                      filtered.map((row) => (
                        <EmployeeListItem
                          row={row}
                          isSelected={selectedEmployeeId === row.employee_id}
                          onClick={() => setSelectedEmployeeId(row.employee_id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Search className="mx-auto mb-2 w-8 h-8 text-muted-foreground/50" />
                        <p>No employees match your filters.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmployeeTableView />
                )}
              </>
            )}
          </div>

          {/* Detail Panel */}
          <div className="stat-card">
            {DetailPanel() || (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Select an Employee</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[160px]">
                  Click any row to view detailed monthly attendance summary
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}