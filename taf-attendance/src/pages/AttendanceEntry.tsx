import { useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, ClipboardCheck, LoaderCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/hooks/useAttendanceData";
import { apiService } from "@/lib/api";

type EmployeeOption = {
  employee_id: string;
  full_name?: string;
};

function localDateString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AttendanceEntry() {
  const { data: employeeData, isLoading: isLoadingEmployees, error: employeeError } = useEmployees();
  const employees: EmployeeOption[] = employeeData?.employees || [];
  const [date, setDate] = useState(localDateString);
  const [employeeId, setEmployeeId] = useState("");
  const [company, setCompany] = useState(import.meta.env.VITE_COMPANY_NAME || "TAF Energies");
  const [status, setStatus] = useState("Present");
  const [series, setSeries] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSavedMessage("");
    const selectedEmployee = employees.find((employee) => String(employee.employee_id) === employeeId);
    if (!selectedEmployee) {
      setError("Select an employee before saving.");
      return;
    }

    setSaving(true);
    try {
      const result = await apiService.createAttendanceEntry({
        attendance_date: date,
        employee_id: employeeId,
        employee_name: selectedEmployee.full_name || employeeId,
        company: company.trim(),
        status,
      });
      setSeries(result.entry.series);
      setSavedMessage(`${result.message}: ${result.entry.series}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save attendance entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Attendance Entry</h2>
          <p className="mt-1 text-sm text-muted-foreground">Record an employee’s attendance status for a date.</p>
        </div>

        <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 md:px-6">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">New attendance record</h3>
            </div>
            <Button type="submit" disabled={saving || isLoadingEmployees || employees.length === 0}>
              {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>

          <div className="grid gap-x-6 gap-y-5 p-5 md:grid-cols-2 md:p-6">
            <div className="space-y-2">
              <Label htmlFor="attendance-series">Series <span className="text-destructive">*</span></Label>
              <Input id="attendance-series" value={series || "HR-ATT-.YYYY.-AUTO"} readOnly className="bg-muted font-mono" />
              <p className="text-xs text-muted-foreground">The system assigns the record number when you save.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-date">Attendance Date <span className="text-destructive">*</span></Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="attendance-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-employee">Employee <span className="text-destructive">*</span></Label>
              <select
                id="attendance-employee"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                required
                disabled={isLoadingEmployees || Boolean(employeeError)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">{isLoadingEmployees ? "Loading employees…" : "Select an employee"}</option>
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.full_name || employee.employee_id} ({employee.employee_id})
                  </option>
                ))}
              </select>
              {employeeError && <p className="text-xs text-destructive">Could not load employees.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-company">Company <span className="text-destructive">*</span></Label>
              <Input id="attendance-company" value={company} onChange={(event) => setCompany(event.target.value)} required maxLength={140} />
            </div>

            <div className="space-y-2 md:col-span-2 md:max-w-[calc(50%-0.75rem)]">
              <Label htmlFor="attendance-status">Status <span className="text-destructive">*</span></Label>
              <select
                id="attendance-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {["Present", "Absent", "On Leave", "Half Day"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>

          {(error || savedMessage) && (
            <div className="px-5 pb-5 md:px-6">
              {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {savedMessage && <p role="status" className="rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-sm text-success">{savedMessage}</p>}
            </div>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
