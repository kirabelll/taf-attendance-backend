type QueryParams = Record<string, string | number | boolean | null | undefined>;

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function queryString(params: QueryParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("attendance_access_token");
  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("auth/login/") && !path.startsWith("auth/register/")) {
      localStorage.removeItem("attendance_access_token");
      localStorage.removeItem("attendance_user");
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    const message = typeof payload === "object" && payload !== null
      ? payload.message || payload.detail || `Request failed (${response.status})`
      : payload || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

async function download(path: string, params: QueryParams) {
  const token = localStorage.getItem("attendance_access_token");
  const response = await fetch(`${API_BASE_URL}/${path}${queryString(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const pathParts = path.split("/").filter(Boolean);
  anchor.download = pathParts[pathParts.length - 1] || "attendance-export";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return { success: true, message: "Export downloaded" };
}

// User types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  role_label: string;
  permissions: string[];
  department: string;
  position: string;
  phone: string;
  is_active?: boolean;
  is_staff?: boolean;
  date_joined?: string;
  last_login?: string;
  last_login_ip?: string;
}

export interface RoleInfo {
  role: string;
  level: number;
  label: string;
}

export interface RolesResponse {
  current_user_role: string;
  manageable_roles: string[];
  all_roles: RoleInfo[];
  role_permissions: Record<string, string[]>;
}

export interface PermissionsResponse {
  role: string;
  permissions: string[];
  all_permissions: string[];
}

export interface UserListResponse {
  success: boolean;
  users: User[];
  count: number;
}

export const apiService = {
  // Auth
  login: (email: string, password: string) => request<{ access: string; user: User }>("auth/login/", {
    method: "POST", body: JSON.stringify({ email, password }),
  }),
  register: (name: string, email: string, password: string) => request<{ access: string; user: User }>("auth/register/", {
    method: "POST", body: JSON.stringify({ name, email, password }),
  }),
  currentUser: () => request<{ success: boolean; user: User }>("auth/me/"),
  getPermissions: () => request<PermissionsResponse>("auth/permissions/"),
  getRoles: () => request<RolesResponse>("auth/roles/"),

  // User Management (Admin)
  listUsers: () => request<UserListResponse>("users/"),
  createUser: (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
    position?: string;
    phone?: string;
  }) => request<{ success: boolean; message: string; user: User }>("users/create/", {
    method: "POST", body: JSON.stringify(userData),
  }),
  getUser: (userId: number) => request<{ success: boolean; user: User }>(`users/${userId}/`),
  updateUser: (userId: number, userData: Partial<{
    name: string;
    email: string;
    role: string;
    department: string;
    position: string;
    phone: string;
    is_active: boolean;
  }>) => request<{ success: boolean; message: string; user: User }>(`users/${userId}/`, {
    method: "PATCH", body: JSON.stringify(userData),
  }),
  deleteUser: (userId: number) => request<{ success: boolean; message: string }>(`users/${userId}/`, {
    method: "DELETE",
  }),

  // Existing endpoints
  testConnection: () => request("test-connection/"),
  getEmployees: () => request("employees/"),
  getEmployeeLeave: (employeeId: string) => request(`employees/${encodeURIComponent(employeeId)}/leave/`),
  refreshEmployeeCache: () => request("employees/refresh-cache/", { method: "POST" }),
  getRealTimeAttendance: () => request("attendance/realtime/"),
  getDailyPunches: (date: string) => request<{ success: boolean; date: string; count: number; punches: any[] }>(`attendance/punches/${queryString({ date })}`),
  getAttendanceByDate: (params: QueryParams) => request(`attendance/by-date/${queryString(params)}`),
  createAttendanceEntry: (entry: {
    attendance_date: string;
    employee_id: string;
    employee_name: string;
    company: string;
    status: string;
  }) => request<{ success: boolean; message: string; entry: any }>("attendance/entries/", {
    method: "POST", body: JSON.stringify(entry),
  }),
  getDailyAttendanceSummary: (date?: string) => request(`attendance/daily-summary/${queryString({ date })}`),
  getLateEmployees: (date?: string) => request(`attendance/late/${queryString({ date })}`),
  getAbsentEmployees: (date?: string) => request(`attendance/absent/${queryString({ date })}`),
  getAttendanceReport: (date?: string) => request(`attendance/report/${queryString({ date })}`),
  searchEmployeeAttendance: (params: QueryParams) => request(`attendance/search/${queryString(params)}`),
  getWeeklyTrend: (start_date?: string, end_date?: string) =>
    request(`attendance/by-date/${queryString({ start_date, end_date })}`),
  getDepartmentStats: (date?: string) => request(`attendance/daily-summary/${queryString({ date })}`),
  getEmployeeLateReport: (params: QueryParams) => request(`attendance/late-report/${queryString(params)}`),
  exportReport: (format: "csv" | "pdf" | "excel", params: QueryParams) => {
    const extension = format === "excel" ? "excel" : format;
    return download(`attendance/export/${extension}/`, params);
  },
  exportLateReportCsv: (params: QueryParams) => download("attendance/late-report/export/csv/", params),
  getDevices: () => request("devices/"),
  getDeviceStats: () => request("devices/stats/"),
  syncDevice: (deviceId: string) => request(`devices/${encodeURIComponent(deviceId)}/sync/`, { method: "POST" }),
  updateDeviceStatus: (deviceId: string, status: string) => request(
    `devices/${encodeURIComponent(deviceId)}/status/`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  ),
  getDeviceLogs: (deviceId: string) => request(`devices/${encodeURIComponent(deviceId)}/logs/`),
  testDeviceConnection: (deviceId: string) => request(`devices/${encodeURIComponent(deviceId)}/test/`),
};
