# TAF Attendance API

Django REST API for fetching attendance data from ZKBio Time 9.0 attendance devices.

## Features

- Real-time attendance data retrieval
- Employee management
- Date-based attendance queries
- Automated late arrival detection
- Formatted attendance reports
- Connection testing

## API Endpoints

### 1. Test Connection
**GET** `/api/test-connection/`

Test connection to ZKBio Time server.

**Response:**
```json
{
  "success": true,
  "message": "BioTime connection successful",
  "server": "http://172.16.10.250:8002"
}
```

### 2. Get Employees
**GET** `/api/employees/`

Retrieve all employees from the system.

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

### 3. Get Real-time Attendance
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
      "device_id": "Device_1"
    }
  ]
}
```

### 4. Get Attendance by Date (with Filtering)
**GET** `/api/attendance/by-date/`

Get attendance data for specific date or date range with filtering options.

**Query Parameters:**
- `date` - Single date (YYYY-MM-DD)
- `start_date` & `end_date` - Date range (YYYY-MM-DD)
- `employee_name` - Filter by employee name or ID (partial match)
- `status` - Filter by status: `late`, `absent`, `present`, `on_time`

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
    "filtered_count": 2
  },
  "attendance": [...]
}
```

### 5. Get Late Employees
**GET** `/api/attendance/late/`

Get employees who arrived late on a specific date.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Example:**
- `/api/attendance/late/?date=2026-02-06`

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
      "device_id": "Device_1"
    }
  ]
}
```

### 6. Get Absent Employees
**GET** `/api/attendance/absent/`

Get employees who are absent on a specific date.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Example:**
- `/api/attendance/absent/?date=2026-02-06`

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

### 7. Get Daily Attendance Summary
**GET** `/api/attendance/daily-summary/`

Get comprehensive daily attendance summary with all statistics and breakdowns.

**Query Parameters:**
- `date` - Date (YYYY-MM-DD), defaults to today

**Example:**
- `/api/attendance/daily-summary/?date=2026-02-06`

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

### 8. Search Employee Attendance
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

### 9. Get Attendance Report
**GET** `/api/attendance/report/`

Get formatted attendance report with statistics.

**Query Parameters:**
- `date` - Report date (YYYY-MM-DD), defaults to today

**Example:**
- `/api/attendance/report/?date=2026-02-06`

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

### 10. Refresh Employee Cache
**POST** `/api/employees/refresh-cache/`

Manually refresh the employee cache from BioTime.

**Response:**
```json
{
  "success": true,
  "message": "Employee cache refreshed. Loaded 150 employees"
}
```

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
- `LATE_THRESHOLD_HOUR` = 8
- `LATE_THRESHOLD_MINUTE` = 30 (Late after 8:30 AM)
- `WORK_END_HOUR` = 17 (Work ends at 5:00 PM)

### Late Detection Logic
- Clock-in after 8:30 AM is marked as "Late (M)"
- Late minutes are calculated from the threshold time
- Only morning clock-ins are checked for lateness

## Testing

Test the API using curl or any HTTP client:

```bash
# Test connection
curl http://localhost:8000/api/test-connection/

# Get today's attendance
curl http://localhost:8000/api/attendance/by-date/

# Get attendance report
curl http://localhost:8000/api/attendance/report/?date=2026-02-06
```

## Notes

- The API automatically caches employee data for better performance
- Employee cache is refreshed every 10 sync cycles or manually via API
- All timestamps are processed according to the configured work hours
- CSRF protection is disabled for API endpoints (enable in production)
