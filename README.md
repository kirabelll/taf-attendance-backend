# TAF Attendance API

Django REST API for fetching attendance data from ZKBio Time 9.0 attendance devices.

## Authentication and Database Setup

The API uses Django's built-in user table and expiring signed bearer tokens. Register at `POST /api/auth/register/`, sign in at `POST /api/auth/login/`, then send `Authorization: Bearer <access>` with attendance API requests. Tokens expire after 12 hours by default (43200 seconds); set `AUTH_TOKEN_MAX_AGE` to change that. Django admin remains available through its normal session authentication.

Set `DATABASE_URL` in `.env` to the PostgreSQL URL used by the application, and set a strong `SECRET_KEY`. Local and production Django settings load the root `.env`; production startup fails if `SECRET_KEY` is missing. The legacy `DATABASE` variable is also accepted when it contains a PostgreSQL URL. Run `python manage.py migrate` to create Django's auth, session, attendance, and leave tables.

Employee leave requests are available from `GET /api/employees/<employee_id>/leave/`. Annual leave uses the existing `vacation` leave type; the response reports approved and pending request days, not remaining entitlement balances.

## Features

- Real-time attendance data retrieval (last 24 hours)
- Employee management with cache refresh
- Date-based attendance queries with filtering (single date or range)
- Automated late arrival detection (configurable threshold)
- Absent employee detection with approved leave handling
- Manual attendance entry creation
- Formatted attendance reports
- Comprehensive daily attendance summary with statistics
- Employee attendance search by name or ID
- Raw device punch retrieval for debugging
- Device management (list, stats, sync, logs, connection test)
- Export capabilities (CSV, Excel, PDF)
- Employee late report with export
- Connection testing
- Debug endpoint for attendance processing

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register a new user account |
| POST | `/api/auth/login/` | Sign in and obtain access token |
| GET | `/api/auth/me/` | Get current authenticated user info |

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (both):**
```json
{
  "success": true,
  "access": "signed_bearer_token",
  "user": { "id": 1, "email": "user@example.com", "first_name": "John", "last_name": "Doe" }
}
```

**Usage:** Include `Authorization: Bearer <access>` header with all attendance API requests.

---

### 1. Test Connection
**GET** `/api/test-connection/`

Test connection to ZKBio Time server. Public endpoint (no auth required).

**Response:**
```json
{
  "success": true,
  "message": "BioTime connection successful",
  "server": "http://172.16.10.250:8002"
}
```

---

### 2. Get Employees
**GET** `/api/employees/`

Retrieve all employees from the ZKBioTime system.

**Response:**
```json
{
  "success": true,
  "count": 150,
  "employees": [
    {
      "employee_id": "EMP001",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "department": "IT",
      "position": "Developer"
    }
  ]
}
```

---

### 3. Get Employee Leave
**GET** `/api/employees/<employee_id>/leave/`

Return leave requests and approved/pending day totals for an employee.

**Response:**
```json
{
  "success": true,
  "today": "2026-02-06",
  "current_leave_status": {
    "status": "On Leave",
    "type": "Annual Leave",
    "is_paid": true,
    "start_date": "2026-02-05",
    "end_date": "2026-02-07"
  },
  "summary": {
    "annual_leave": { "approved_days": 10, "pending_days": 2, "request_count": 3 },
    "sick_leave": { "approved_days": 3, "pending_days": 0, "request_count": 1 }
  },
  "requests": [
    {
      "id": 1,
      "type": "Annual Leave",
      "status": "Approved",
      "is_paid": true,
      "start_date": "2026-02-05",
      "end_date": "2026-02-07",
      "days": 3
    }
  ]
}
```

---

### 4. Refresh Employee Cache
**POST** `/api/employees/refresh-cache/`

Manually refresh the employee cache from BioTime.

**Response:**
```json
{
  "success": true,
  "message": "Employee cache refreshed. Loaded 150 employees"
}
```

---

### 5. Get Real-time Attendance
**GET** `/api/attendance/realtime/`

Get attendance data from the last 24 hours.

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-06T10:30:00",
  "period": "Last 24 hours",
  "statistics": {
    "total_employees": 45,
    "late_arrivals": 5,
    "total_late_minutes": 120
  },
  "attendance": [
    {
      "employee_id": "EMP001",
      "full_name": "John Doe",
      "date": "2026-02-06",
      "clock_in": "08:15:00",
      "clock_out": "17:05:00",
      "late_minutes": 0,
      "device_id": "Device_1",
      "working_hours": 8.5,
      "lunch_break_hours": 1.0
    }
  ]
}
```

---

### 6. Get Daily Punches (Raw)
**GET** `/api/attendance/punches/`

Return every raw device punch for a selected calendar date.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Response:**
```json
{
  "success": true,
  "date": "2026-02-06",
  "count": 150,
  "punches": [
    {
      "transaction_id": "12345",
      "employee_id": "EMP001",
      "employee_name": "John Doe",
      "device_id": "Device_1",
      "punch_time": "2026-02-06T08:15:00",
      "punch_type": "Check In",
      "raw_punch_state": "0"
    }
  ]
}
```

---

### 7. Create Attendance Entry
**POST** `/api/attendance/entries/`

Save a manually entered daily attendance status (HR use).

**Request:**
```json
{
  "attendance_date": "2026-02-06",
  "employee_id": "EMP001",
  "employee_name": "John Doe",
  "company": "TAF",
  "status": "Present"
}
```

Valid statuses: `Present`, `Absent`, `On Leave`, `Half Day`

**Response:**
```json
{
  "success": true,
  "message": "Attendance entry saved",
  "entry": {
    "series": "HR-ATT-2026-A1B2C3D4",
    "attendance_date": "2026-02-06",
    "employee_id": "EMP001",
    "employee_name": "John Doe",
    "company": "TAF",
    "status": "Present"
  }
}
```

---

### 8. Get Attendance by Date (with Filtering)
**GET** `/api/attendance/by-date/`

Get attendance data for specific date or date range with filtering options.

**Query Parameters:**
- `date` - Single date (YYYY-MM-DD)
- `start_date` & `end_date` - Date range (YYYY-MM-DD)
- `employee_name` - Filter by employee name or ID (partial match)
- `status` - Filter by status: `late`, `absent`, `present`, `on_time`, `on_leave`

**Examples:**
- `/api/attendance/by-date/?date=2026-02-06`
- `/api/attendance/by-date/?date=2026-02-06&status=late`
- `/api/attendance/by-date/?date=2026-02-06&employee_name=john`
- `/api/attendance/by-date/?start_date=2026-02-01&end_date=2026-02-06&status=absent`

**Response:**
```json
{
  "success": true,
  "start_date": "2026-02-06",
  "end_date": "2026-02-06",
  "filters": {
    "employee_name": "john",
    "status": "late"
  },
  "statistics": {
    "total_employees": 150,
    "present": 45,
    "absent": 105,
    "late_arrivals": 5,
    "on_time": 40,
    "total_late_minutes": 120,
    "filtered_count": 2,
    "raw_transactions": 500,
    "processed_records": 150
  },
  "attendance": [
    {
      "employee_id": "EMP001",
      "full_name": "John Doe",
      "date": "2026-02-06",
      "clock_in": "08:15:00",
      "clock_out": "17:05:00",
      "late_minutes": 0,
      "device_id": "Device_1",
      "status": "On Time",
      "working_hours": 8.5,
      "lunch_break_hours": 1.0,
      "attendance_entry_status": "Present"
    }
  ]
}
```

---

### 9. Get Attendance Report
**GET** `/api/attendance/report/`

Get formatted attendance report with statistics for a specific date.

**Query Parameters:**
- `date` - Report date (YYYY-MM-DD), defaults to today

**Response:**
```json
{
  "success": true,
  "report": {
    "title": "ATTENDANCE REPORT - 2026-02-06",
    "generated_at": "2026-02-06T10:30:00",
    "summary": {
      "total_employees": 45,
      "late_arrivals": 5,
      "total_late_minutes": 120,
      "on_time": 40
    },
    "records": [
      {
        "no": 1,
        "employee_id": "EMP001",
        "full_name": "John Doe",
        "clock_in": "08:15:00",
        "clock_out": "17:05:00",
        "late_minutes": 0,
        "status": "On Time"
      }
    ]
  }
}
```

---

### 10. Get Late Employees
**GET** `/api/attendance/late/`

Get employees who arrived late on a specific date.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Response:**
```json
{
  "success": true,
  "date": "2026-02-06",
  "total_late": 5,
  "total_late_minutes": 120,
  "late_employees": [
    {
      "employee_id": "EMP002",
      "full_name": "Jane Smith",
      "date": "2026-02-06",
      "clock_in": "08:45:00",
      "clock_out": "17:00:00",
      "late_minutes": 15,
      "device_id": "Device_1",
      "working_hours": 8.0
    }
  ]
}
```

---

### 11. Get Absent Employees
**GET** `/api/attendance/absent/`

Get employees who are absent on a specific date.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Response:**
```json
{
  "success": true,
  "date": "2026-02-06",
  "total_employees": 150,
  "present_count": 45,
  "absent_count": 105,
  "absent_employees": [
    {
      "employee_id": "EMP003",
      "full_name": "Bob Johnson",
      "date": "2026-02-06",
      "status": "Absent"
    }
  ]
}
```

---

### 12. Get Daily Attendance Summary
**GET** `/api/attendance/daily-summary/`

Get comprehensive daily attendance summary with all statistics and breakdowns.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Response:**
```json
{
  "success": true,
  "date": "2026-02-06",
  "summary": {
    "total_employees": 150,
    "present": 45,
    "absent": 105,
    "on_time": 40,
    "late": 5,
    "total_late_minutes": 120,
    "attendance_rate": 30.0,
    "punctuality_rate": 88.89
  },
  "breakdown": {
    "on_time_employees": [...],
    "late_employees": [...],
    "absent_employees": [...]
  }
}
```

---

### 13. Search Employee Attendance
**GET** `/api/attendance/search/`

Search for specific employee attendance by name or ID.

**Query Parameters:**
- `q` - Search query (employee name or ID) - **Required**
- `date` - Single date (YYYY-MM-DD), defaults to today
- `start_date` & `end_date` - Date range (YYYY-MM-DD)

**Examples:**
- `/api/attendance/search/?q=john`
- `/api/attendance/search/?q=EMP001&date=2026-02-06`
- `/api/attendance/search/?q=smith&start_date=2026-02-01&end_date=2026-02-06`

**Response:**
```json
{
  "success": true,
  "search_query": "john",
  "start_date": "2026-02-06",
  "end_date": "2026-02-06",
  "total_records": 3,
  "matching_employees": 2,
  "records": [
    {
      "employee_id": "EMP001",
      "full_name": "John Doe",
      "date": "2026-02-06",
      "clock_in": "08:15:00",
      "clock_out": "17:05:00",
      "late_minutes": 0,
      "status": "On Time"
    }
  ]
}
```

---

### 14. Employee Late Report
**GET** `/api/attendance/late-report/`

Get comprehensive late report for all employees over a date range.

**Query Parameters:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- Defaults to last 30 days if not specified

**Response:**
```json
{
  "success": true,
  "period": {
    "start_date": "2026-01-07",
    "end_date": "2026-02-06",
    "days": 31
  },
  "summary": {
    "total_employees": 150,
    "employees_with_late": 45,
    "total_late_incidents": 120,
    "total_late_minutes": 2400,
    "total_late_hours": 40.0,
    "average_punctuality_rate": 85.5,
    "most_punctual_rate": 100.0,
    "least_punctual_rate": 60.0
  },
  "employees": [
    {
      "employee_id": "EMP002",
      "full_name": "Jane Smith",
      "total_days": 20,
      "late_days": 10,
      "total_late_minutes": 150,
      "average_late_minutes": 15.0,
      "punctuality_rate": 50.0,
      "late_incidents": [
        { "date": "2026-02-06", "clock_in": "08:45:00", "late_minutes": 15 }
      ]
    }
  ]
}
```

---

### 15. Export Late Report (CSV)
**GET** `/api/attendance/late-report/export/csv/`

Export employee late report as CSV matching frontend display format.

**Query Parameters:**
- `start_date` & `end_date` - Date range (YYYY-MM-DD), defaults to last 7 days, max 30 days

**Response:** CSV file download with summary statistics, employee table, and detailed late incidents.

---

### 16. Export Attendance (CSV/Excel/PDF)
**GET** `/api/attendance/export/csv/`
**GET** `/api/attendance/export/excel/`
**GET** `/api/attendance/export/pdf/`

Export attendance data in various formats.

**Query Parameters (Required):**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)
- `department` - Optional department filter

**Response:** File download in requested format.

---

### 17. Debug Attendance Processing
**GET** `/api/debug/attendance-processing/`

Debug endpoint to see how attendance data is being processed.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today
- `employee_id` - Optional employee ID filter

**Response:** Raw transactions, processed records, and processing details.

---

### Device Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices/` | List all devices with statistics |
| GET | `/api/devices/stats/` | Get device statistics only |
| GET | `/api/devices/<device_id>/logs/` | Get device logs |
| POST | `/api/devices/<device_id>/sync/` | Sync a specific device |
| PATCH | `/api/devices/<device_id>/status/` | Update device status |
| POST | `/api/devices/<device_id>/test/` | Test device connection (ping) |

**Get Devices Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": "VDE225240197",
      "name": "Entry",
      "ip": "172.16.10.210",
      "location": "Main Door",
      "status": "Online",
      "last_sync": "2026-03-12 09:40:25",
      "total_scans": 30372,
      "model": "ZKBioTime Device",
      "firmware_version": "6.60.1.0",
      "sync_errors": 0,
      "last_heartbeat": "2026-03-12T09:40:25",
      "user_count": 120,
      "fp_count": 1,
      "face_count": 112,
      "palm_count": 0
    }
  ],
  "stats": {
    "total_devices": 2,
    "online_devices": 2,
    "offline_devices": 0,
    "maintenance_devices": 0,
    "total_scans_today": 73487,
    "last_sync_time": "2 min ago"
  }
}
```

---

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure `.env` file with your ZKBio Time credentials:
```env
BIOTIME_URL=http://172.16.10.250:8002
BIOTIME_USERNAME=your_username
BIOTIME_PASSWORD=your_password
SECRET_KEY=your_strong_secret_key
DATABASE_URL=postgresql://user:pass@host:5432/dbname
AUTH_TOKEN_MAX_AGE=43200  # 12 hours in seconds (optional)
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Start the server:
```bash
python manage.py runserver 0.0.0.0:8000
```

## Configuration

### Attendance Settings (config.py)
- `WORK_START_HOUR` = 8 (Work starts at 8:00 AM)
- `WORK_START_MINUTE` = 0
- `LATE_THRESHOLD_HOUR` = 8
- `LATE_THRESHOLD_MINUTE` = 15 (15-minute grace after 8:00 AM; late minutes start after 8:15 AM)
- `WORK_END_HOUR` = 17 (Work ends at 5:00 PM)
- `WORK_END_MINUTE` = 0

### BioTime Sync Settings
- `SYNC_INTERVAL_MINUTES` = 1 (sync interval in minutes)
- `MAX_RETRIES` = 3
- `BATCH_SIZE` = 100

### Late Detection Logic
- Clock-in after 8:15 AM is marked as "Late (M)"
- Late minutes are calculated from the threshold time (8:15 AM)
- Only morning clock-ins (before 12 PM) are checked for lateness
- Lunch breaks (11:30 AM - 1:30 PM) are automatically detected and excluded from working hours
- Overnight shifts handled (clock-out after midnight counted as next day)

### Attendance Status Values
- `Present` - Employee checked in on time
- `Late` - Employee checked in after 8:15 AM
- `Absent` - No punch records for the day
- `On Leave` / `Paid Leave` / `Unpaid Leave` - Approved leave (not counted as absent)
- `Half Day` - Partial attendance
- `On Time` - Present and not late

### Authentication Settings
- `AUTH_TOKEN_MAX_AGE` = 43200 seconds (12 hours) - token expiry
- Tokens are Django signed tokens (not JWT)
- CSRF protection disabled for API endpoints (enable in production)
- Public endpoints: `/api/auth/login/`, `/api/auth/register/`, `/api/test-connection/`

## Testing

Test the API using curl or any HTTP client:

```bash
# Test connection (public)
curl http://localhost:8000/api/test-connection/

# Register and login
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use token for authenticated requests
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/attendance/by-date/
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/attendance/report/?date=2026-02-06
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/attendance/late-report/?start_date=2026-01-01&end_date=2026-01-31
```

## Notes

- The API automatically caches employee data for better performance
- Employee cache is refreshed every 10 sync cycles or manually via API
- All timestamps are processed according to the configured work hours
- Approved leave days are excluded from absent counts in reports
- Manual attendance entries override BioTime data for status display
- Pagination supported for large transaction datasets (1000 records per page)
- Time card data from ZKBioTime (total time, duty time) is preserved when available
- Device status determined by last activity (online if < 1 hour, maintenance if < 30 min)

## Project Structure

```
taf-attendance-backend/
├── attendance_api/          # Main Django app
│   ├── views.py             # All API endpoints
│   ├── models.py            # Database models
│   ├── urls.py              # URL routing
│   ├── auth_views.py        # Authentication endpoints
│   ├── middleware.py        # Bearer token authentication
│   └── migrations/          # Database migrations
├── taf_attendance/          # Django project settings
│   ├── settings.py          # Development settings
│   ├── settings_production.py
│   └── urls.py              # Root URL configuration
├── biotime_client.py        # ZKBioTime API client
├── config.py                # Configuration loader
├── manage.py                # Django management script
└── requirements.txt         # Python dependencies
```

## Data Models

- **Employee** - Employee information from BioTime
- **Device** - Attendance device information
- **AttendanceRecord** - Individual punch records
- **DailyAttendanceSummary** - Computed daily summaries
- **AttendanceEntry** - Manual HR attendance entries
- **AttendancePolicy** - Configurable attendance rules
- **Holiday** - Company holidays
- **LeaveRequest** - Employee leave requests
- **SystemLog** - System event logging

## Frontend Application (taf-attendance/)

The project includes a complete React/TypeScript frontend application built with Vite, React Query (TanStack Query), and Tailwind CSS.

### Frontend Setup

```bash
cd taf-attendance
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` (Vite dev server) and proxies API requests to the Django backend at `http://localhost:8000`.

### Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Overview with stats and quick actions |
| `/employees` | Employees | Employee list with attendance table, search, filters, and profile panel with leave records |
| `/attendance-report` | Daily Attendance Report | Daily report with filters (date, search, department, status), CSV export |
| `/monthly-report` | Monthly Attendance Report | Monthly totals per employee, workday-aware, CSV export |
| `/daily-punches` | Daily Punches | Raw device punch log with filters (date, search, device, punch type), CSV export |
| `/attendance-entry` | Attendance Entry | HR form to manually create attendance records |
| `/reports` | Reports Hub | Navigation to all report pages |
| `/device-status` | Device Status | Real-time device monitoring with auto-refresh |
| `/settings` | Settings | Configuration page |
| `/login` | Login | Authentication page |

### Frontend Features

#### Employees Page (`/employees`)
- Employee list with pagination (6 per page)
- Search by name or employee ID
- Department filter
- Click row to open employee profile panel showing:
  - Employee details (ID, name, department, position)
  - Leave records (current status, annual/sick leave balances, leave history)
  - Weekly attendance overview
- Real-time attendance data integration

#### Daily Attendance Report (`/attendance-report`)
- Date selector (defaults to today, max today)
- Employee search, department filter, status filter (All, Present, Absent, On Leave, Late, Early Out)
- Statistics cards: Employees listed, Present count, Late arrivals
- Table with: Employee, First check-in, Last punch (Clock Out), Lunch out, Lunch in, Working hours, Late entry, Early out (before 16:30), Status
- CSV export with all columns including lunch break details

#### Monthly Attendance Report (`/monthly-report`)
- Month selector (type="month" input)
- Search, department filter, status filter (All, Present, Absent, Late, On Leave)
- Statistics: Employees, Present Days, Absent Days, Late Arrivals
- Table per employee: Present, Absent, Late, Paid leave, Unpaid leave, Late minutes, Lunch break hours, Working hours, Attendance rate (%)
- Workday-aware calculation (excludes weekends)
- Paid leave counts as present; unpaid leave listed separately
- CSV export

#### Daily Punches (`/daily-punches`)
- Date selector
- Search across employee name, ID, device, punch type
- Device filter, punch type filter
- Statistics: Total punches, Employees, Devices
- Table: Time, Employee, Employee ID, Punch type, Device, Raw state
- CSV export
- Direct access to raw BioTime data for debugging

#### Attendance Entry (`/attendance-entry`)
- Form to manually record attendance (HR use)
- Fields: Attendance Date, Employee (dropdown from BioTime), Company, Status (Present, Absent, On Leave, Half Day)
- Auto-generates series number on save (format: `HR-ATT-YYYY-RANDOM`)
- Validation and error handling

#### Device Status (`/device-status`)
- Real-time device list with auto-refresh (30s)
- Device statistics with auto-refresh (15s)
- Device actions: Sync, Update Status, View Logs, Test Connection
- Device details: ID, Name, IP, Location, Status, Last Sync, Total Scans, Model, Firmware, User counts (FP, Face, Palm)

### Frontend Architecture

```
taf-attendance/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Button, Input, Label, etc.)
│   │   ├── AppLayout.tsx    # Main layout with sidebar navigation
│   │   └── ...
│   ├── hooks/
│   │   ├── useAttendanceData.ts  # React Query hooks for all API endpoints
│   │   └── use-toast.ts          # Toast notifications
│   ├── lib/
│   │   └── api.ts           # Axios-based API service with auth interceptors
│   ├── pages/               # Page components (one per route)
│   ├── utils/
│   └── main.tsx             # App entry point
├── package.json
├── vite.config.ts           # Vite config with API proxy
├── tailwind.config.js
└── tsconfig.json
```

### API Service (`src/lib/api.ts`)
- Axios instance with base URL from `VITE_API_BASE_URL` (defaults to `/api`)
- Automatic Bearer token injection from localStorage
- Token refresh handling
- Request/response interceptors for error handling
- Methods for all backend endpoints

### React Query Hooks (`src/hooks/useAttendanceData.ts`)
All API calls use TanStack Query with appropriate caching:
- Employees: 10 min stale time
- Real-time attendance: 30s auto-refetch, 1 min stale
- Attendance by date: 2 min stale
- Daily summary: 2 min stale
- Late/Absent employees: 2 min stale
- Attendance report: 5 min stale
- Search: 2 min stale, enabled only when query > 2 chars
- Devices: 30s auto-refetch, 10s stale
- Device stats: 15s auto-refetch, 5s stale
- Late report: 5 min stale
- Mutations for: refresh cache, sync device, update device status, test connection, exports

### Environment Variables (Frontend)

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_COMPANY_NAME=TAF Energies
```

### Authentication Flow
1. User visits `/login` → enters email/password
2. Frontend calls `POST /api/auth/login/` → receives signed bearer token
3. Token stored in localStorage and included in Authorization header for all API requests
4. Token expiry handled by backend (12 hours default)
5. Protected routes redirect to login if no valid token

### Key Frontend-Backend Integrations

| Frontend Feature | Backend Endpoint |
|------------------|------------------|
| Employee list | `GET /api/employees/` |
| Employee profile + leave | `GET /api/employees/<id>/leave/` |
| Daily attendance table | `GET /api/attendance/by-date/?date=...` |
| Daily attendance report | `GET /api/attendance/report/?date=...` |
| Monthly report | `GET /api/attendance/by-date/?start_date=...&end_date=...` |
| Daily punches (raw) | `GET /api/attendance/punches/?date=...` |
| Attendance entry creation | `POST /api/attendance/entries/` |
| Device list & stats | `GET /api/devices/`, `GET /api/devices/stats/` |
| Device actions | `POST /api/devices/<id>/sync/`, `PATCH /api/devices/<id>/status/`, `GET /api/devices/<id>/logs/`, `POST /api/devices/<id>/test/` |
| Late report | `GET /api/attendance/late-report/?start_date=...&end_date=...` |
| CSV exports | Backend export endpoints |
| Search | `GET /api/attendance/search/?q=...` |
| Daily summary | `GET /api/attendance/daily-summary/?date=...` |
| Late/Absent employees | `GET /api/attendance/late/?date=...`, `GET /api/attendance/absent/?date=...` |
| Refresh cache | `POST /api/employees/refresh-cache/` |
| Connection test | `GET /api/test-connection/` |