"""URL Configuration for Attendance API"""
from django.urls import path
from . import views

urlpatterns = [
    # Connection and basic data
    path('test-connection/', views.test_connection, name='test_connection'),
    path('employees/', views.get_employees, name='get_employees'),
    path('employees/refresh-cache/', views.refresh_employee_cache, name='refresh_cache'),
    
    # Attendance data
    path('attendance/realtime/', views.get_realtime_attendance, name='realtime_attendance'),
    path('attendance/by-date/', views.get_attendance_by_date, name='attendance_by_date'),
    path('attendance/report/', views.get_attendance_report, name='attendance_report'),
    
    # Filtered attendance endpoints
    path('attendance/late/', views.get_late_employees, name='late_employees'),
    path('attendance/absent/', views.get_absent_employees, name='absent_employees'),
    path('attendance/daily-summary/', views.get_daily_attendance_summary, name='daily_summary'),
    path('attendance/search/', views.search_employee_attendance, name='search_attendance'),
    
    # Export endpoints
    path('attendance/export/csv/', views.export_attendance_csv, name='export_csv'),
    path('attendance/export/excel/', views.export_attendance_excel, name='export_excel'),
    path('attendance/export/pdf/', views.export_attendance_pdf, name='export_pdf'),
    
    # Late report endpoint
    path('attendance/late-report/', views.get_employee_late_report, name='employee_late_report'),
    path('attendance/late-report/export/csv/', views.export_late_report_csv, name='export_late_report_csv'),
    
    # Debug endpoint
    path('debug/attendance-processing/', views.debug_attendance_processing, name='debug_attendance'),
    
    # Device management endpoints
    path('devices/', views.get_devices, name='get_devices'),
    path('devices/stats/', views.get_device_stats, name='get_device_stats'),
    path('devices/<str:device_id>/sync/', views.sync_device, name='sync_device'),
    path('devices/<str:device_id>/status/', views.update_device_status, name='update_device_status'),
    path('devices/<str:device_id>/logs/', views.get_device_logs, name='get_device_logs'),
    path('devices/<str:device_id>/test/', views.test_device_connection, name='test_device_connection'),
]
