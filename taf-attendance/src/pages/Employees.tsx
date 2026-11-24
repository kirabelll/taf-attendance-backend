import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { useEmployees, useAttendanceByDate, useSearchAttendance, useToday } from "@/hooks/useAttendanceData";
import { Search, Filter, ChevronLeft, ChevronRight, X, Loader2, AlertCircle, CalendarDays, HeartPulse, Umbrella, Clock, User, MapPin, Briefcase, CheckCircle, AlertCircle as AlertCircleIcon, Phone, Mail, MapPin as MapPinIcon, IdCard, Fingerprint, Eye, Shield, ShieldCheck, Award, Calendar, FileText, Home, Building2, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiService } from "@/lib/api";

const PAGE_SIZE = 8;

export default function Employees() {
  const today = useToday();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  // Fetch employees and attendance data
  const { data: employeesData, isLoading: isEmployeesLoading, error: employeesError } = useEmployees();
  const { data: attendanceData, isLoading: isAttendanceLoading, error: attendanceError } = useAttendanceByDate({ date: today });

  // Search functionality
  const { data: searchData, isLoading: isSearchLoading } = useSearchAttendance(
    { q: search, date: today },
    search.length > 2
  );
  const { data: leaveData, isLoading: isLeaveLoading, isError: isLeaveError } = useQuery({
    queryKey: ["employee-leave", selectedEmployeeId],
    queryFn: () => apiService.getEmployeeLeave(selectedEmployeeId as string),
    enabled: Boolean(selectedEmployeeId),
  });

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

  // Get unique departments from employees
  const departments = ["All", ...new Set(employees.map(e => {
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

  // Helper to get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "On Time":
      case "Present":
        return "badge-present";
      case "Absent":
        return "badge-absent";
      case "Late":
        return "badge-late";
      case "Paid Leave":
      case "On Leave":
        return "badge-leave";
      default:
        return "badge-default";
    }
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

  // Mock weekly data for selected employee
  const weeklyData = [
    { day: "Mon", status: "Present" }, { day: "Tue", status: "Present" },
    { day: "Wed", status: "Absent" }, { day: "Thu", status: "Present" },
    { day: "Fri", status: "Late" },
  ];

  // Helper function to get gender display
  const getGenderDisplay = (gender: string): string => {
    if (!gender) return "—";
    const g = gender.toLowerCase();
    if (g === 'm' || g === 'male') return 'Male';
    if (g === 'f' || g === 'female') return 'Female';
    return gender;
  };

  // Helper function to format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper function to get biometric status icon
  const getBiometricIcon = (type: string) => {
    switch (type) {
      case 'fingerprint': return <Fingerprint className="w-3.5 h-3.5" />;
      case 'face': return <Eye className="w-3.5 h-3.5" />;
      case 'palm': return <Shield className="w-3.5 h-3.5" />;
      case 'vl_face': return <Award className="w-3.5 h-3.5" />;
      default: return <BadgeCheck className="w-3.5 h-3.5" />;
    }
  };

  // List View Item Component
  const EmployeeListItem = ({ record, index, isSelected, onClick }: {
    record: any;
    index: number;
    isSelected: boolean;
    onClick: () => void
  }) => {
    const employee = getEmployee(record.employee_id);
    const deptName = employee ? getDepartmentName(employee.department) : "—";
    const status = record.attendance_entry_status || record.status || "—";
    const isLate = (record.late_minutes || 0) > 0;
    const hasPunch = record.clock_in || record.clock_out;

    return (
      <div
        key={`${record.employee_id}-${index}`}
        onClick={onClick}
        className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
          isSelected
            ? "border-primary/50 bg-primary/5 shadow-primary/10"
            : "border-border/40 bg-card hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
        }`}
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0 shadow-primary/20 mt-0.5">
          {getInitials(undefined, undefined, record.full_name)}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{record.full_name || "Unknown"}</p>
              <p className="text-xs font-mono text-muted-foreground">{record.employee_id}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(status)} flex-shrink-0`}>
              {status}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {deptName}
            </span>
            {employee?.position && employee.position !== 'Not specified' && (
              <span className="flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                {employee.position}
              </span>
            )}
            {record.clock_in && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                In: {record.clock_in.slice(0, 5)}
              </span>
            )}
            {record.clock_out && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Out: {record.clock_out.slice(0, 5)}
              </span>
            )}
            {record.working_hours && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {record.working_hours}h
              </span>
            )}
            {isLate && (
              <span className="flex items-center gap-1 text-warning">
                <AlertCircleIcon className="w-3 h-3" />
                Late {record.late_minutes}min
              </span>
            )}
          </div>

          {/* Employee Info Row 2 - Contact & Personal */}
          {employee && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/80">
              {employee.mobile && (
                <span className="flex items-center gap-1" title={employee.mobile}>
                  <Phone className="w-2.5 h-2.5" />
                  {employee.mobile.length > 15 ? employee.mobile.slice(0, 15) + '...' : employee.mobile}
                </span>
              )}
              {employee.email && (
                <span className="flex items-center gap-1" title={employee.email}>
                  <Mail className="w-2.5 h-2.5" />
                  {employee.email.length > 20 ? employee.email.slice(0, 20) + '...' : employee.email}
                </span>
              )}
              {employee.area && employee.area !== 'Unknown' && (
                <span className="flex items-center gap-1" title={employee.area}>
                  <MapPinIcon className="w-2.5 h-2.5" />
                  {employee.area.length > 15 ? employee.area.slice(0, 15) + '...' : employee.area}
                </span>
              )}
              {employee.gender && (
                <span className="flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  {getGenderDisplay(employee.gender)}
                </span>
              )}
              {employee.hire_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  Hired: {formatDate(employee.hire_date)}
                </span>
              )}
            </div>
          )}

          {/* Biometric Status Indicators */}
          {employee && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {employee.fingerprint && employee.fingerprint !== '-' && employee.fingerprint !== '0' && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-success-subtle text-success text-[10px] font-medium" title="Fingerprint enrolled">
                  <Fingerprint className="w-3 h-3" />
                </span>
              )}
              {employee.face && employee.face !== '-' && employee.face !== '0' && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-primary-subtle text-primary text-[10px] font-medium" title="Face enrolled">
                  <Eye className="w-3 h-3" />
                </span>
              )}
              {employee.palm && employee.palm !== '-' && employee.palm !== '0' && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-info-subtle text-info text-[10px] font-medium" title="Palm enrolled">
                  <Shield className="w-3 h-3" />
                </span>
              )}
              {employee.vl_face && employee.vl_face !== 0 && employee.vl_face !== '0' && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-warning-subtle text-warning text-[10px] font-medium" title="Visual face enrolled">
                  <Award className="w-3 h-3" />
                </span>
              )}
              {(!employee.fingerprint || employee.fingerprint === '-' || employee.fingerprint === '0') &&
               (!employee.face || employee.face === '-' || employee.face === '0') &&
               (!employee.palm || employee.palm === '-' || employee.palm === '0') &&
               (!employee.vl_face || employee.vl_face === 0 || employee.vl_face === '0') && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted text-muted-foreground text-[10px] font-medium" title="No biometrics enrolled">
                  <ShieldCheck className="w-3 h-3" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="w-2 h-full rounded-r-xl bg-primary flex-shrink-0" />
        )}
      </div>
    );
  };

  // Table View (original)
  const EmployeeTableView = () => (
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
  );

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Header with Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
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
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Table
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Employee List/Table */}
          <div className="xl:col-span-2 stat-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">
                Employee Attendance — <span className="text-muted-foreground font-normal">{filtered.length} records</span>
              </p>
            </div>

            {viewMode === "list" ? (
              <div className="space-y-3">
                {paginated.length > 0 ? (
                  paginated.map((r, index) => (
                    <EmployeeListItem
                      record={r}
                      index={index}
                      isSelected={selectedEmployeeId === r.employee_id}
                      onClick={() => setSelectedEmployeeId(r.employee_id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="mx-auto mb-2 w-8 h-8 text-muted-foreground/50" />
                    <p>No records found</p>
                  </div>
                )}
              </div>
            ) : (
              <EmployeeTableView />
            )}

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
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position !== 'Not specified' ? selectedEmployee.position : 'Position not specified'}</p>
                  <span className="mt-2 text-xs bg-primary-subtle text-primary px-2.5 py-1 rounded-full font-medium">
                    {getDepartmentName(selectedEmployee.department)}
                  </span>
                  {selectedEmployee.area && selectedEmployee.area !== 'Unknown' && (
                    <span className="mt-1 text-xs bg-info-subtle text-info px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" />
                      {selectedEmployee.area}
                    </span>
                  )}
                </div>

                {/* Personal Information */}
                <div className="py-4 space-y-2 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Employee ID", value: selectedEmployee.employee_id, icon: IdCard },
                      { label: "Full Name", value: selectedEmployee.full_name, icon: User },
                      { label: "Nickname", value: selectedEmployee.nickname || "—", icon: User },
                      { label: "Gender", value: getGenderDisplay(selectedEmployee.gender), icon: User },
                      { label: "Date of Birth", value: formatDate(selectedEmployee.birthday), icon: Calendar },
                      { label: "Hire Date", value: formatDate(selectedEmployee.hire_date), icon: CalendarDays },
                      { label: "Card No.", value: selectedEmployee.card_no || "—", icon: BadgeCheck },
                      { label: "Nationality", value: selectedEmployee.national || "—", icon: Building2 },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground w-24 text-xs">{item.label}</span>
                        <span className="font-medium text-foreground truncate">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="py-4 space-y-2 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Mobile", value: selectedEmployee.mobile || "—", icon: Phone },
                      { label: "Office Phone", value: selectedEmployee.office_tel || "—", icon: Phone },
                      { label: "Home Phone", value: selectedEmployee.contact_tel || "—", icon: Home },
                      { label: "Email", value: selectedEmployee.email || "—", icon: Mail },
                      { label: "Address", value: selectedEmployee.address || "—", icon: MapPinIcon },
                      { label: "City", value: selectedEmployee.city || "—", icon: MapPinIcon },
                      { label: "Postcode", value: selectedEmployee.postcode || "—", icon: MapPinIcon },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 col-span-1">
                        <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground w-24 text-xs">{item.label}</span>
                        <span className="font-medium text-foreground truncate">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employment Details */}
                <div className="py-4 space-y-2 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employment Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Department", value: getDepartmentName(selectedEmployee.department), icon: Briefcase },
                      { label: "Position", value: selectedEmployee.position !== 'Not specified' ? selectedEmployee.position : "—", icon: Briefcase },
                      { label: "Employee Type", value: selectedEmployee.emp_type || "—", icon: BadgeCheck },
                      { label: "Verify Mode", value: selectedEmployee.verify_mode ? String(selectedEmployee.verify_mode) : "—", icon: Shield },
                      { label: "Enroll SN", value: selectedEmployee.enroll_sn || "—", icon: FileText },
                      { label: "Dev Privilege", value: selectedEmployee.dev_privilege ? String(selectedEmployee.dev_privilege) : "—", icon: ShieldCheck },
                      { label: "App Status", value: selectedEmployee.app_status ? String(selectedEmployee.app_status) : "—", icon: Award },
                      { label: "App Role", value: selectedEmployee.app_role ? String(selectedEmployee.app_role) : "—", icon: Award },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground w-24 text-xs">{item.label}</span>
                        <span className="font-medium text-foreground truncate">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Biometric Enrollment Status */}
                <div className="py-4 space-y-2 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Biometric Enrollment</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'fingerprint', label: 'Fingerprint', value: selectedEmployee.fingerprint, icon: Fingerprint, color: 'success' },
                      { key: 'face', label: 'Face Recognition', value: selectedEmployee.face, icon: Eye, color: 'primary' },
                      { key: 'palm', label: 'Palm Vein', value: selectedEmployee.palm, icon: Shield, color: 'info' },
                      { key: 'vl_face', label: 'Visual Face', value: selectedEmployee.vl_face, icon: Award, color: 'warning' },
                    ].map(item => {
                      const isEnrolled = item.value && item.value !== '-' && item.value !== '0' && item.value !== 0;
                      return (
                        <div key={item.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isEnrolled ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border'}`}>
                          <item.icon className={`w-4 h-4 ${isEnrolled ? 'text-success' : 'text-muted-foreground'}`} />
                          <span className="text-xs font-medium text-foreground">{item.label}</span>
                          <span className={`text-xs font-medium ${isEnrolled ? 'text-success' : 'text-muted-foreground'}`}>
                            {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feature Flags */}
                <div className="py-4 space-y-2 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feature Access</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'enable_att', label: 'Attendance', value: selectedEmployee.enable_att, icon: CheckCircle },
                      { key: 'enable_overtime', label: 'Overtime', value: selectedEmployee.enable_overtime, icon: Clock },
                      { key: 'enable_holiday', label: 'Holiday Work', value: selectedEmployee.enable_holiday, icon: CalendarDays },
                    ].map(item => (
                      <div key={item.key} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${item.value ? 'bg-success-subtle border-success' : 'bg-muted/50 border-border'}`}>
                        <item.icon className={`w-3.5 h-3.5 ${item.value ? 'text-success' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${item.value ? 'text-success' : 'text-muted-foreground'}`}>
                          {item.label}
                        </span>
                        <span className={`text-[10px] font-medium ${item.value ? 'text-success' : 'text-muted-foreground'}`}>
                          {item.value ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Leave requests */}
                <div className="py-4 border-b border-border">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Leave record</p>
                  </div>
                  {isLeaveLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading leave records…</div>
                  ) : isLeaveError ? (
                    <p className="py-2 text-xs text-destructive">Could not load leave records.</p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Leave status today</p>
                          {leaveData?.current_leave_status?.type && (
                            <p className="mt-1 text-xs text-foreground">
                              {leaveData.current_leave_status.type} · {leaveData.current_leave_status.start_date} to {leaveData.current_leave_status.end_date}
                            </p>
                          ) || <p className="mt-1 text-xs text-muted-foreground">No leave request covering today</p>}
                        </div>
                        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          leaveData?.current_leave_status?.status === "On Leave"
                            ? "bg-warning-subtle text-warning"
                            : leaveData?.current_leave_status?.status === "Pending Approval"
                              ? "bg-info-subtle text-info"
                              : "bg-success-subtle text-success"
                        }`}>
                          {leaveData?.current_leave_status?.status || "Not on Leave"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "annual_leave", title: "Annual leave", icon: Umbrella },
                          { key: "sick_leave", title: "Sick leave", icon: HeartPulse },
                        ].map(({ key, title, icon: Icon }) => {
                          const item = leaveData?.summary?.[key] || { approved_days: 0, pending_days: 0, request_count: 0 };
                          return (
                            <div key={key} className="rounded-lg bg-muted/60 p-2.5">
                              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{title}</div>
                              <p className="text-xs text-muted-foreground">{item.approved_days} approved day{item.approved_days === 1 ? "" : "s"}</p>
                              <p className="text-[10px] text-muted-foreground">{item.pending_days} pending · {item.request_count} request{item.request_count === 1 ? "" : "s"}</p>
                            </div>
                          );
                        })}
                      </div>
                      {leaveData?.requests?.length ? (
                        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                          {leaveData.requests.map((leave: any) => (
                            <div key={leave.id} className="flex items-start justify-between gap-2 rounded-md border border-border/70 p-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">{leave.type}</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">{leave.start_date} to {leave.end_date} · {leave.days} day{leave.days === 1 ? "" : "s"}</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${leave.status === "Approved" ? "bg-success-subtle text-success" : leave.status === "Pending" ? "bg-warning-subtle text-warning" : "bg-muted text-muted-foreground"}`}>{leave.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="mt-3 text-xs text-muted-foreground">No leave requests recorded.</p>}
                    </>
                  )}
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