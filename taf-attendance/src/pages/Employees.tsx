import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useEmployees, useAttendanceByDate, useSearchAttendance, useToday } from "@/hooks/useAttendanceData";
import { Search, Filter, ChevronLeft, ChevronRight, X, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 6;

export default function Employees() {
  const today = useToday();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Fetch employees and attendance data
  const { data: employeesData, isLoading: isEmployeesLoading, error: employeesError } = useEmployees();
  const { data: attendanceData, isLoading: isAttendanceLoading, error: attendanceError } = useAttendanceByDate({ date: today });

  // Search functionality
  const { data: searchData, isLoading: isSearchLoading } = useSearchAttendance(
    { q: search, date: today },
    search.length > 2
  );

  // Loading state
  if (isEmployeesLoading || isAttendanceLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading employees data...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (employeesError || attendanceError) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span>Error loading employees data. Please check your backend connection.</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const employees = employeesData?.employees || [];
  const attendanceRecords = search.length > 2 ? (searchData?.records || []) : (attendanceData?.attendance || []);
  
  // Get unique departments from employees - handle both string and object department fields
  const departments = ["All", ...new Set(employees.map(e => {
    // Handle case where department might be an object or string
    if (typeof e.department === 'string') {
      return e.department;
    } else if (e.department && typeof e.department === 'object' && 'dept_name' in e.department) {
      return (e.department as any).dept_name;
    }
    return null;
  }).filter(Boolean))];

  // Helper function to get department name
  const getDepartmentName = (department: any): string => {
    if (typeof department === 'string') {
      return department;
    } else if (department && typeof department === 'object' && 'dept_name' in department) {
      return department.dept_name;
    }
    return '';
  };

  // Helper function to get safe initials
  const getInitials = (firstName?: string, lastName?: string, fullName?: string): string => {
    if (firstName && lastName) {
      return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
    }
    if (fullName) {
      return fullName.split(" ")
        .map(n => n?.[0] || '')
        .join("")
        .slice(0, 2)
        .toUpperCase() || '??';
    }
    return '??';
  };

  // Filter records
  const filtered = attendanceRecords.filter(r => {
    const matchSearch = search.length <= 2 || r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(search.toLowerCase());
    const employee = employees.find(e => e.employee_id === r.employee_id);
    const employeeDept = employee ? getDepartmentName(employee.department) : '';
    const matchDept = dept === "All" || employeeDept === dept;
    return matchSearch && matchDept;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getEmployee = (id: string) => employees.find(e => e.employee_id === id);
  const selectedEmployee = selectedEmployeeId ? getEmployee(selectedEmployeeId) : null;

  // Mock weekly data for selected employee (you can enhance this with real API data)
  const weeklyData = [
    { day: "Mon", status: "Present" }, { day: "Tue", status: "Present" },
    { day: "Wed", status: "Absent" }, { day: "Thu", status: "Present" },
    { day: "Fri", status: "Late" },
  ];

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or ID..."
              className="pl-9 h-10"
            />
            {isSearchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={dept}
              onChange={e => { setDept(e.target.value); setPage(1); }}
              className="h-10 px-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {departments.map(d => <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Table */}
          <div className="xl:col-span-2 stat-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Employee Attendance — <span className="text-muted-foreground font-normal">{filtered.length} records</span>
              </p>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ID", "Employee", "Department", "Check In", "Check Out", "Hours", "Date", "Status"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, index) => {
                    const employee = getEmployee(r.employee_id);
                    return (
                      <tr
                        key={`${r.employee_id}-${index}`}
                        onClick={() => setSelectedEmployeeId(r.employee_id)}
                        className={`border-b border-border/40 cursor-pointer transition-colors ${
                          selectedEmployeeId === r.employee_id ? "bg-primary-subtle" : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{r.employee_id}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-subtle flex items-center justify-center text-primary text-[10px] font-semibold flex-shrink-0">
                              {getInitials(undefined, undefined, r.full_name)}
                            </div>
                            <span className="font-medium text-foreground text-xs truncate max-w-[100px]">{r.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{employee ? getDepartmentName(employee.department) : "—"}</td>
                        <td className="py-3 px-2 font-mono text-xs text-foreground">{r.clock_in ?? "—"}</td>
                        <td className="py-3 px-2 font-mono text-xs text-foreground">{r.clock_out ?? "—"}</td>
                        <td className="py-3 px-2 font-mono text-xs text-foreground">
                          {r.working_hours ? `${r.working_hours}h` : "—"}
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">{r.date}</td>
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
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Employee Profile Panel */}
          <div className="stat-card">
            {selectedEmployee ? (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-foreground">Employee Profile</p>
                  <button onClick={() => setSelectedEmployeeId(null)} className="p-1 rounded hover:bg-muted">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                {/* Avatar */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-border">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xl font-bold mb-3 shadow-primary">
                    {getInitials(selectedEmployee.first_name, selectedEmployee.last_name, selectedEmployee.full_name)}
                  </div>
                  <p className="text-base font-bold text-foreground">{selectedEmployee.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                  <span className="mt-2 text-xs bg-primary-subtle text-primary px-2.5 py-1 rounded-full font-medium">
                    {getDepartmentName(selectedEmployee.department)}
                  </span>
                </div>
                {/* Details */}
                <div className="py-4 space-y-3 border-b border-border">
                  {[
                    { label: "Employee ID", value: selectedEmployee.employee_id },
                    { label: "Full Name", value: selectedEmployee.full_name },
                    { label: "Department", value: getDepartmentName(selectedEmployee.department) },
                    { label: "Position", value: selectedEmployee.position },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground truncate max-w-[140px]">{item.value || "—"}</span>
                    </div>
                  ))}
                </div>
                {/* Weekly attendance */}
                <div className="pt-4">
                  <p className="text-xs font-semibold text-foreground mb-3">This Week's Attendance</p>
                  <div className="flex gap-2 justify-between">
                    {weeklyData.map(w => (
                      <div key={w.day} className="flex flex-col items-center gap-1.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                          w.status === "Present" ? "bg-success-subtle text-success" :
                          w.status === "Absent" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"
                        }`}>
                          {w.status === "Present" ? "P" : w.status === "Absent" ? "A" : "L"}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{w.day}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "Present", value: 3, color: "text-success" },
                      { label: "Absent", value: 1, color: "text-danger" },
                      { label: "Late", value: 1, color: "text-warning" },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-muted rounded-lg py-2">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Select an Employee</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[160px]">
                  Click any row to view employee profile and attendance details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}