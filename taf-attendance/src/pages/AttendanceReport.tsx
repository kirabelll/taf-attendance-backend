import { useState } from "react";
import { CalendarDays, Clock3, Download, FileClock, LoaderCircle, Users, Search } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAttendanceByDate, useEmployees } from "@/hooks/useAttendanceData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AttendanceRow = {
  employee_id: string;
  full_name?: string;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  working_hours?: number | string | null;
  late_minutes?: number | null;
  lunch_punches?: Array<{ type: string; time: string }>;
  lunch_break_hours?: number | string | null;
  status?: string;
  attendance_entry_status?: string;
};

const EARLY_OUT_CUTOFF_MINUTES = 16 * 60 + 30;

function formatHours(value: AttendanceRow["working_hours"]) {
  const hours = Number(value || 0);
  return Number.isFinite(hours) && hours > 0 ? `${hours.toFixed(2)} hr` : "—";
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

function getEarlyOutMinutes(value?: string | null) {
  if (!value) return 0;
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return Math.max(0, EARLY_OUT_CUTOFF_MINUTES - (hour * 60 + minute));
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function AttendanceReport() {
  const [today] = useState(localDateString);
  const [date, setDate] = useState(today);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const { data, isLoading, isError, error } = useAttendanceByDate({ date });
  const { data: employeeData } = useEmployees();
  const rows: AttendanceRow[] = data?.attendance || [];
  const employeeById = new Map((employeeData?.employees || []).map((employee: any) => [String(employee.employee_id), employee]));
  const departments = Array.from(new Set((employeeData?.employees || []).map((employee: any) => typeof employee.department === "string" ? employee.department : employee.department?.dept_name).filter(Boolean))).sort();
  const filteredRows = rows.filter((row) => {
    const employee = employeeById.get(String(row.employee_id));
    const department = typeof employee?.department === "string" ? employee.department : employee?.department?.dept_name || "";
    const searchMatches = `${row.full_name || ""} ${row.employee_id}`.toLowerCase().includes(employeeSearch.trim().toLowerCase());
    const departmentMatches = departmentFilter === "All" || department === departmentFilter;
    const status = row.attendance_entry_status || row.status || "";
    const hasPunch = Boolean(row.clock_in || row.clock_out);
    const statusMatches = statusFilter === "All"
      || (statusFilter === "Present" && (hasPunch || ["Present", "Half Day", "Paid Leave"].includes(status)))
      || (statusFilter === "Absent" && status === "Absent")
      || (statusFilter === "On Leave" && ["On Leave", "Paid Leave", "Unpaid Leave"].includes(status))
      || (statusFilter === "Late" && Number(row.late_minutes || 0) > 0)
      || (statusFilter === "Early Out" && getEarlyOutMinutes(row.clock_out) > 0);
    return searchMatches && departmentMatches && statusMatches;
  });
  const presentCount = filteredRows.filter((row) => {
    const manualStatus = row.attendance_entry_status;
    if (manualStatus) return ["Present", "Half Day"].includes(manualStatus);
    return Boolean(row.clock_in || row.clock_out || row.status === "Paid Leave");
  }).length;
  const lateCount = filteredRows.filter((row) => Number(row.late_minutes || 0) > 0).length;

  const exportCsv = () => {
    const headings = ["Employee ID", "Employee Name", "Date", "Status", "First Check In", "Last Check Out", "Lunch Out", "Lunch In", "Lunch Break (hours)", "Working Hours", "Late Entry (minutes)", "Early Out Before 16:30 (minutes)"];
    const csvRows = filteredRows.map((row) => [
      row.employee_id,
      row.full_name || "Unknown",
      row.date,
      row.attendance_entry_status || row.status || "",
      row.clock_in || "",
      row.clock_out || "",
      row.lunch_punches?.find((punch) => punch.type === "Lunch Out")?.time || "",
      row.lunch_punches?.find((punch) => punch.type === "Lunch In")?.time || "",
      row.lunch_break_hours ?? 0,
      row.working_hours ?? "",
      row.late_minutes ?? 0,
      getEarlyOutMinutes(row.clock_out),
    ]);
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headings, ...csvRows].map((line) => line.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Daily Attendance Report</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review each employee’s first arrival, final checkout, working hours, and late entry.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Report date</span>
              <span className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  aria-label="Filter attendance report by date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none"
                />
              </span>
            </label>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search employee or ID…"
                aria-label="Search attendance report by employee name or ID"
                className="pl-9"
              />
            </div>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-muted-foreground">Department</span>
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                <option value="All">All departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-muted-foreground">Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                {["All", "Present", "Absent", "On Leave", "Late", "Early Out"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <Button variant="outline" onClick={exportCsv} disabled={filteredRows.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Employees listed</p><p className="text-xl font-bold text-foreground">{filteredRows.length}</p></div>
          </div>
          <div className="stat-card flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-success" />
            <div><p className="text-xs text-muted-foreground">Present</p><p className="text-xl font-bold text-foreground">{presentCount}</p></div>
          </div>
          <div className="stat-card flex items-center gap-3">
            <FileClock className="h-5 w-5 text-warning" />
            <div><p className="text-xs text-muted-foreground">Late arrivals</p><p className="text-xl font-bold text-foreground">{lateCount}</p></div>
          </div>
        </div>

        <div className="stat-card overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">Employee time report</h3>
            <p className="mt-1 text-xs text-muted-foreground">Attendance for {date} · {filteredRows.length} employees</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">First check-in</th>
                  <th className="px-4 py-3 font-medium">Last punch (Clock Out)</th>
                  <th className="px-4 py-3 font-medium">Lunch out</th>
                  <th className="px-4 py-3 font-medium">Lunch in</th>
                  <th className="px-4 py-3 font-medium">Working hours</th>
                  <th className="px-4 py-3 font-medium">Late entry</th>
                  <th className="px-4 py-3 font-medium">Early out (before 16:30)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading attendance…</td></tr>
                )}
                {isError && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-destructive">{error instanceof Error ? error.message : "Could not load attendance for this date."}</td></tr>
                )}
                {!isLoading && !isError && filteredRows.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">{rows.length ? "No employees match your search." : "No attendance records for this date."}</td></tr>
                )}
                {!isLoading && !isError && filteredRows.map((row) => {
                  const lateMinutes = Number(row.late_minutes || 0);
                  const earlyOutMinutes = getEarlyOutMinutes(row.clock_out);
                  const lunchOut = row.lunch_punches?.find((punch) => punch.type === "Lunch Out")?.time;
                  const lunchIn = row.lunch_punches?.find((punch) => punch.type === "Lunch In")?.time;
                  const entryStatus = row.attendance_entry_status;
                  const isEntryStatus = ["Present", "Absent", "On Leave", "Half Day"].includes(entryStatus || "");
                  const isAbsent = !row.clock_in && !row.clock_out && row.status !== "On Leave";
                  const status = isEntryStatus
                    ? entryStatus!
                    : isAbsent
                      ? "Absent"
                      : row.status === "On Leave"
                        ? "On Leave"
                        : [lateMinutes > 0 ? "Late" : "", earlyOutMinutes > 0 ? "Early out" : ""]
                        .filter(Boolean)
                        .join(" · ") || (!row.clock_out ? "In progress" : row.status || "On time");
                  return (
                    <tr key={`${row.employee_id}-${row.date}`} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">{row.full_name || "Unknown employee"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{row.employee_id}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-foreground">{formatTime(row.clock_in)}</td>
                      <td className="px-4 py-3.5 font-mono text-foreground">{formatTime(row.clock_out)}</td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">{formatTime(lunchOut)}</td>
                      <td className="px-4 py-3.5 font-mono text-muted-foreground">{formatTime(lunchIn)}</td>
                      <td className="px-4 py-3.5 text-foreground">{formatHours(row.working_hours)}</td>
                      <td className="px-4 py-3.5">
                        {lateMinutes > 0 ? <span className="font-medium text-warning">{lateMinutes} min</span> : <span className="text-muted-foreground">No</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {earlyOutMinutes > 0 ? <span className="font-medium text-warning">{earlyOutMinutes} min</span> : <span className="text-muted-foreground">No</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === "Absent" ? "bg-muted text-muted-foreground" : status.includes("Late") || status.includes("Early out") ? "bg-warning/15 text-warning" : status === "In progress" ? "bg-info/15 text-info" : "bg-success/15 text-success"}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
