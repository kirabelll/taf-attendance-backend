import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

// Query keys for caching
export const QUERY_KEYS = {
  employees: ['employees'],
  realTimeAttendance: ['attendance', 'realtime'],
  attendanceByDate: (params: any) => ['attendance', 'by-date', params],
  dailySummary: (date?: string) => ['attendance', 'daily-summary', date],
  lateEmployees: (date?: string) => ['attendance', 'late', date],
  absentEmployees: (date?: string) => ['attendance', 'absent', date],
  attendanceReport: (date?: string) => ['attendance', 'report', date],
  searchAttendance: (params: any) => ['attendance', 'search', params],
  lateReport: (params: any) => ['attendance', 'late-report', params],
  connectionTest: ['connection', 'test'],
} as const;

// Hook for testing backend connection
export const useConnectionTest = () => {
  return useQuery({
    queryKey: QUERY_KEYS.connectionTest,
    queryFn: () => apiService.testConnection(),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching employees
export const useEmployees = () => {
  return useQuery({
    queryKey: QUERY_KEYS.employees,
    queryFn: () => apiService.getEmployees(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for real-time attendance
export const useRealTimeAttendance = (refetchInterval = 30000) => {
  return useQuery({
    queryKey: QUERY_KEYS.realTimeAttendance,
    queryFn: () => apiService.getRealTimeAttendance(),
    refetchInterval, // Auto-refresh every 30 seconds
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook for attendance by date
export const useAttendanceByDate = (params: {
  date?: string;
  start_date?: string;
  end_date?: string;
  employee_name?: string;
  status?: string;
} = {}) => {
  return useQuery({
    queryKey: QUERY_KEYS.attendanceByDate(params),
    queryFn: () => apiService.getAttendanceByDate(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for daily attendance summary
export const useDailyAttendanceSummary = (date?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.dailySummary(date),
    queryFn: () => apiService.getDailyAttendanceSummary(date),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for late employees
export const useLateEmployees = (date?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.lateEmployees(date),
    queryFn: () => apiService.getLateEmployees(date),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for absent employees
export const useAbsentEmployees = (date?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.absentEmployees(date),
    queryFn: () => apiService.getAbsentEmployees(date),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for attendance report
export const useAttendanceReport = (date?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.attendanceReport(date),
    queryFn: () => apiService.getAttendanceReport(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for searching employee attendance
export const useSearchAttendance = (params: {
  q: string;
  date?: string;
  start_date?: string;
  end_date?: string;
}, enabled = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.searchAttendance(params),
    queryFn: () => apiService.searchEmployeeAttendance(params),
    enabled: enabled && !!params.q, // Only run when enabled and query exists
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Mutation for refreshing employee cache
export const useRefreshEmployeeCache = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiService.refreshEmployeeCache(),
    onSuccess: () => {
      // Invalidate employees query to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees });
    },
  });
};

// Helper hook to get today's date in YYYY-MM-DD format
export const useToday = () => {
  return new Date().toISOString().split('T')[0];
};

// Hook for weekly trend data
export const useWeeklyTrend = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['attendance', 'weekly-trend', startDate, endDate],
    queryFn: () => apiService.getWeeklyTrend(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for department statistics
export const useDepartmentStats = (date?: string) => {
  return useQuery({
    queryKey: ['attendance', 'department-stats', date],
    queryFn: () => apiService.getDepartmentStats(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation for exporting reports
export const useExportReport = () => {
  return useMutation({
    mutationFn: ({ format, params }: {
      format: 'csv' | 'pdf' | 'excel';
      params: { start_date?: string; end_date?: string; department?: string };
    }) => apiService.exportReport(format, params),
  });
};

// Hook for employee late report
export const useEmployeeLateReport = (params: {
  start_date?: string;
  end_date?: string;
} = {}, enabled = false) => {
  return useQuery({
    queryKey: QUERY_KEYS.lateReport(params),
    queryFn: () => apiService.getEmployeeLateReport(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation for exporting late report as CSV
export const useExportLateReportCsv = () => {
  return useMutation({
    mutationFn: (params: { start_date?: string; end_date?: string }) => 
      apiService.exportLateReportCsv(params),
  });
};

// Device Management Hooks

// Hook for fetching devices
export const useDevices = () => {
  return useQuery({
    queryKey: ['devices'],
    queryFn: () => apiService.getDevices(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10 * 1000, // 10 seconds
  });
};

// Hook for device statistics
export const useDeviceStats = () => {
  return useQuery({
    queryKey: ['devices', 'stats'],
    queryFn: () => apiService.getDeviceStats(),
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5 * 1000, // 5 seconds
  });
};

// Mutation for syncing device
export const useSyncDevice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (deviceId: string) => apiService.syncDevice(deviceId),
    onSuccess: () => {
      // Invalidate devices query to refetch
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

// Mutation for updating device status
export const useUpdateDeviceStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ deviceId, status }: { 
      deviceId: string; 
      status: 'Online' | 'Offline' | 'Maintenance' 
    }) => apiService.updateDeviceStatus(deviceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
};

// Hook for device logs
export const useDeviceLogs = (deviceId: string, enabled = false) => {
  return useQuery({
    queryKey: ['devices', deviceId, 'logs'],
    queryFn: () => apiService.getDeviceLogs(deviceId),
    enabled: enabled && !!deviceId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Mutation for testing device connection
export const useTestDeviceConnection = () => {
  return useMutation({
    mutationFn: (deviceId: string) => apiService.testDeviceConnection(deviceId),
  });
};