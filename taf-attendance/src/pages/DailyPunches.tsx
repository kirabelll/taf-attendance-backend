import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Download, Fingerprint, LoaderCircle, Search, Server, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";

type Punch = {
  transaction_id: string;
  employee_id: string;
  employee_name: string;
  device_id: string;
  punch_time: string;
  punch_type: string;
  raw_punch_state: string;
};

function localDateString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function exportPunches(punches: Punch[], date: string) {
  const columns = ["Punch Time", "Employee Name", "Employee ID", "Punch Type", "Device ID", "Raw State", "Transaction ID"];
  const rows = punches.map((punch) => [
    new Date(punch.punch_time).toLocaleString(), punch.employee_name, punch.employee_id,
    punch.punch_type, punch.device_id, punch.raw_punch_state, punch.transaction_id,
  ]);
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `daily-punches-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DailyPunches() {
  const [date, setDate] = useState(localDateString);
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["daily-punches", date],
    queryFn: () => apiService.getDailyPunches(date),
  });

  const punches: Punch[] = data?.punches || [];
  const filteredPunches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...punches]
      .filter((punch) => !query || [punch.employee_name, punch.employee_id, punch.device_id, punch.punch_type]
        .some((value) => value?.toLowerCase().includes(query)))
      .filter((punch) => deviceFilter === "All" || punch.device_id === deviceFilter)
      .filter((punch) => typeFilter === "All" || punch.punch_type === typeFilter)
      .sort((a, b) => b.punch_time.localeCompare(a.punch_time));
  }, [punches, search, deviceFilter, typeFilter]);
  const devices = Array.from(new Set(punches.map((punch) => punch.device_id).filter(Boolean))).sort();
  const punchTypes = Array.from(new Set(punches.map((punch) => punch.punch_type).filter(Boolean))).sort();
  const employeeCount = new Set(filteredPunches.map((punch) => punch.employee_id).filter(Boolean)).size;
  const deviceCount = new Set(filteredPunches.map((punch) => punch.device_id).filter(Boolean)).size;

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Daily Punches</h2>
            <p className="mt-1 text-sm text-muted-foreground">Every raw attendance punch received from BioTime devices.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Punch date</span>
              <span className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input aria-label="Filter punches by date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent text-sm text-foreground outline-none" />
              </span>
            </label>
            <div className="relative w-full sm:w-56"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, device…" aria-label="Search punches by employee or device" className="pl-9" /></div>
            <select aria-label="Filter punches by device" value={deviceFilter} onChange={(event) => setDeviceFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="All">All devices</option>{devices.map((device) => <option key={device}>{device}</option>)}</select>
            <select aria-label="Filter punches by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="All">All punch types</option>{punchTypes.map((type) => <option key={type}>{type}</option>)}</select>
            <Button variant="outline" onClick={() => exportPunches(filteredPunches, date)} disabled={!filteredPunches.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card flex items-center gap-3"><Fingerprint className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Total punches</p><p className="text-xl font-bold text-foreground">{filteredPunches.length}</p></div></div>
          <div className="stat-card flex items-center gap-3"><Users className="h-5 w-5 text-success" /><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-xl font-bold text-foreground">{employeeCount}</p></div></div>
          <div className="stat-card flex items-center gap-3"><Server className="h-5 w-5 text-info" /><div><p className="text-xs text-muted-foreground">Devices</p><p className="text-xl font-bold text-foreground">{deviceCount}</p></div></div>
        </div>

        <div className="stat-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="font-semibold text-foreground">Punch log</h3><p className="mt-1 text-xs text-muted-foreground">{date} · {filteredPunches.length} punches</p></div>
            <p className="text-xs text-muted-foreground">Filtered by employee, device, and punch type</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>{["Time", "Employee", "Employee ID", "Punch type", "Device", "Raw state"].map((heading) => <th key={heading} className="px-4 py-3 font-medium first:pl-5">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading device punches…</td></tr>}
                {isError && <tr><td colSpan={6} className="px-5 py-12 text-center text-destructive">{error instanceof Error ? error.message : "Could not load punches from BioTime."}</td></tr>}
                {!isLoading && !isError && filteredPunches.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No device punches found for this date.</td></tr>}
                {!isLoading && !isError && filteredPunches.map((punch, index) => (
                  <tr key={punch.transaction_id || `${punch.employee_id}-${punch.punch_time}-${index}`} className="hover:bg-muted/20">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-foreground">{new Date(punch.punch_time).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{punch.employee_name || "Unknown employee"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{punch.employee_id || "—"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">{punch.punch_type}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{punch.device_id || "Unknown"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{punch.raw_punch_state || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
