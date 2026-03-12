# Frontend-Backend Integration Guide

## Overview
This guide explains how the React frontend integrates with the Django backend for the TAF Attendance Management System.

## Architecture

```
Frontend (React + Vite)     Backend (Django REST API)
Port: 8080                  Port: 8000
├── API Service Layer       ├── CORS Enabled
├── React Query Hooks       ├── Attendance API Views
├── Dashboard Components    ├── BioTime Integration
└── Real-time Updates       └── Employee Management
```

## ✅ Integrated Pages

### 1. **Dashboard** - ✅ Fully Integrated
- Real-time attendance statistics from `/api/attendance/daily-summary/`
- Live employee data with 30-second auto-refresh
- Connection status indicator
- Error handling with fallbacks

### 2. **Attendance Monitor** - ✅ Fully Integrated
- Live attendance feed from `/api/attendance/realtime/`
- Today's attendance log from `/api/attendance/by-date/`
- Real-time updates every 5 seconds
- Statistics cards with live data

### 3. **Employees** - ✅ Fully Integrated
- Employee list from `/api/employees/`
- Attendance records with search functionality
- Employee profile details
- Pagination and filtering

### 4. **Reports** - ✅ Fully Integrated
- Dynamic report generation with date ranges
- Department statistics and charts
- Export functionality (CSV, PDF, Excel)
- Interactive charts with real data

### 5. **Device Status** - ✅ Fully Integrated
- Real-time device monitoring from `/api/devices/`
- Device sync operations via `/api/devices/{id}/sync/`
- Status management (Online/Offline/Maintenance)
- Connection testing and device logs
- Comprehensive device statistics

### 6. **Settings** - ✅ Integrated
- API configuration management
- Employee cache refresh functionality
- Connection testing
- Theme and preference settings

## Quick Start

### 1. Test Backend Integration

```bash
# Run the integration test script
python test_integration.py
```

### 2. Start Both Servers

```bash
# Terminal 1: Start Django backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Start React frontend
cd taf-attendance
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000/api/

## Integration Features

### 1. **API Service Layer** (`src/lib/api.ts`)
- Centralized API communication
- Type-safe interfaces
- Error handling
- Base URL configuration

### 2. **React Query Hooks** (`src/hooks/useAttendanceData.ts`)
- Data fetching with caching
- Real-time updates (configurable intervals)
- Loading and error states
- Query invalidation and mutations

### 3. **Real-time Updates**
- Dashboard: 30-second refresh for statistics
- Attendance Monitor: 5-second refresh for live feed
- Connection Status: 5-minute health checks
- Manual refresh capabilities

### 4. **Error Handling**
- Network error detection
- User-friendly error messages
- Fallback to cached data
- Retry mechanisms

## API Endpoints Integration

| Page | Endpoints Used | Update Frequency |
|------|---------------|------------------|
| Dashboard | `/api/attendance/daily-summary/`, `/api/attendance/realtime/` | 30s, 30s |
| Monitor | `/api/attendance/realtime/`, `/api/attendance/by-date/` | 5s, on-demand |
| Employees | `/api/employees/`, `/api/attendance/by-date/`, `/api/attendance/search/` | 10m, on-demand |
| Reports | `/api/attendance/by-date/`, `/api/attendance/daily-summary/` | on-demand |
| Device Status | `/api/devices/`, `/api/devices/stats/`, `/api/devices/{id}/*` | 30s, 15s, on-demand |
| Settings | `/api/test-connection/`, `/api/employees/refresh-cache/` | 5m, manual |

## Data Flow Examples

### Dashboard Load
1. Connection test runs first
2. Daily summary and real-time data fetch in parallel
3. Loading states shown during fetch
4. Auto-refresh every 30 seconds

### Report Generation
1. User selects date range and filters
2. API call to `/api/attendance/by-date/` with parameters
3. Data processing for charts and tables
4. Export functionality available

### Employee Search
1. Real-time search as user types (debounced)
2. API call to `/api/attendance/search/` with query
3. Results displayed with pagination
4. Employee profile details on selection

## Configuration

### Backend CORS Settings
```python
# taf_attendance/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
```

### Frontend API Configuration
```typescript
// src/lib/api.ts
const API_BASE_URL = 'http://localhost:8000/api';
```

## Testing the Integration

### 1. **Automated Testing**
```bash
python test_integration.py
```

### 2. **Manual Verification**
- Check connection status in header (green = connected)
- Verify dashboard shows real data
- Test search functionality in employees page
- Generate reports with different date ranges
- Monitor real-time updates in attendance monitor

### 3. **Debug Tools**
- Browser dev tools network tab
- Console for API errors
- React Query DevTools (if installed)

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `django-cors-headers` is installed
   - Check CORS settings in Django settings.py
   - Verify frontend URL is in CORS_ALLOWED_ORIGINS

2. **Connection Failed**
   - Check if Django server is running on port 8000
   - Verify BioTime credentials in .env file
   - Test API endpoints directly with test script

3. **No Data Showing**
   - Check browser console for JavaScript errors
   - Verify API responses return expected data structure
   - Ensure employee cache is loaded in backend

4. **Real-time Updates Not Working**
   - Check React Query configuration
   - Verify API endpoints are responding
   - Check network connectivity

### Debug Commands

```bash
# Test backend connection
curl http://localhost:8000/api/test-connection/

# Get daily summary
curl http://localhost:8000/api/attendance/daily-summary/

# Get employees
curl http://localhost:8000/api/employees/

# Run integration tests
python test_integration.py
```

## Production Deployment

### Environment Variables
```bash
# Frontend (.env.production)
VITE_API_BASE_URL=https://your-api-domain.com/api

# Backend
ALLOWED_HOSTS=['your-frontend-domain.com']
CORS_ALLOWED_ORIGINS=['https://your-frontend-domain.com']
```

### Build Commands
```bash
# Frontend build
npm run build

# Backend deployment
python manage.py collectstatic
python manage.py migrate
```

## Performance Optimizations

1. **Caching Strategy**
   - Employee data cached for 10 minutes
   - Real-time data cached for 30 seconds
   - Connection status cached for 5 minutes

2. **Query Optimization**
   - Parallel API calls where possible
   - Debounced search queries
   - Pagination for large datasets

3. **Error Recovery**
   - Automatic retry on network errors
   - Fallback to cached data
   - User-friendly error messages

## Device Management Integration ✅

The Device Status page has been fully integrated with comprehensive device management capabilities:

### Backend Implementation
- **Device API Views**: Added to `attendance_api/views.py`
  - `get_devices()` - Get all devices with statistics
  - `get_device_stats()` - Get device statistics only  
  - `sync_device()` - Sync specific device
  - `update_device_status()` - Update device status
  - `get_device_logs()` - Get device logs
  - `test_device_connection()` - Test device connection

- **Device URL Patterns**: Added to `attendance_api/urls.py`
  - `/api/devices/` - GET all devices
  - `/api/devices/stats/` - GET device statistics
  - `/api/devices/{device_id}/sync/` - POST sync device
  - `/api/devices/{device_id}/status/` - PATCH update status
  - `/api/devices/{device_id}/logs/` - GET device logs
  - `/api/devices/{device_id}/test/` - POST test connection

### Frontend Implementation
- **Device Status Page**: Enhanced with real-time monitoring
- **API Integration**: Complete device management API service
- **React Query Hooks**: Auto-refreshing device data and mutations

### Features
- Real-time device status monitoring (30-second refresh)
- Interactive device sync and status management
- Connection testing and device logs
- Comprehensive statistics and visual indicators
- Graceful error handling and fallbacks

### Testing
All device API endpoints tested and working:
```bash
python test_device_api.py
```

## Next Steps

1. **Enhanced Device Integration**: Connect to real device APIs
2. **WebSocket Support**: Real-time notifications
3. **Offline Support**: Service worker for offline functionality
4. **Advanced Analytics**: More detailed reporting features
5. **Mobile Responsiveness**: Enhanced mobile experience