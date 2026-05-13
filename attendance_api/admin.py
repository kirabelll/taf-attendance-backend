# Django admin configuration for TAF Attendance System
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    Employee, Device, AttendanceRecord, DailyAttendanceSummary,
    AttendancePolicy, Holiday, LeaveRequest, SystemLog
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'full_name', 'department', 'position', 'is_active', 'created_at']
    list_filter = ['is_active', 'department', 'position', 'created_at']
    search_fields = ['employee_id', 'first_name', 'last_name', 'email']
    readonly_fields = ['full_name', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('employee_id', 'first_name', 'last_name', 'full_name')
        }),
        ('Work Information', {
            'fields': ('department', 'position', 'is_active')
        }),
        ('Contact Information', {
            'fields': ('email', 'phone')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related()


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['device_id', 'device_name', 'location', 'ip_address', 'status', 'last_sync', 'is_active']
    list_filter = ['status', 'is_active', 'created_at']
    search_fields = ['device_id', 'device_name', 'location', 'ip_address']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('device_id', 'device_name', 'location')
        }),
        ('Network Configuration', {
            'fields': ('ip_address', 'port')
        }),
        ('Status', {
            'fields': ('status', 'last_sync', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def colored_status(self, obj):
        colors = {
            'online': 'green',
            'offline': 'red',
            'maintenance': 'orange'
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    colored_status.short_description = 'Status'


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'punch_time', 'punch_type', 'device', 'is_late', 'late_minutes', 'status']
    list_filter = ['punch_type', 'is_late', 'status', 'date', 'device']
    search_fields = ['employee__employee_id', 'employee__first_name', 'employee__last_name']
    readonly_fields = ['date', 'created_at', 'updated_at']
    date_hierarchy = 'punch_time'
    
    fieldsets = (
        ('Attendance Information', {
            'fields': ('employee', 'device', 'punch_time', 'punch_type', 'date')
        }),
        ('Status & Calculations', {
            'fields': ('status', 'is_late', 'late_minutes', 'working_hours')
        }),
        ('Raw Data', {
            'fields': ('raw_data',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'device')


@admin.register(DailyAttendanceSummary)
class DailyAttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'first_check_in', 'last_check_out', 'total_working_hours', 'is_present', 'is_late']
    list_filter = ['is_present', 'is_late', 'early_departure', 'date']
    search_fields = ['employee__employee_id', 'employee__first_name', 'employee__last_name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Employee & Date', {
            'fields': ('employee', 'date')
        }),
        ('Time Tracking', {
            'fields': ('first_check_in', 'last_check_out', 'total_working_hours', 'break_hours', 'overtime_hours')
        }),
        ('Status', {
            'fields': ('is_present', 'is_late', 'late_minutes', 'early_departure', 'early_departure_minutes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee')


@admin.register(AttendancePolicy)
class AttendancePolicyAdmin(admin.ModelAdmin):
    list_display = ['name', 'work_start_time', 'work_end_time', 'late_threshold_minutes', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Policy Information', {
            'fields': ('name', 'is_active')
        }),
        ('Work Schedule', {
            'fields': ('work_start_time', 'work_end_time', 'late_threshold_minutes', 'early_departure_threshold_minutes')
        }),
        ('Break Configuration', {
            'fields': ('break_duration_minutes', 'max_break_duration_minutes')
        }),
        ('Overtime Configuration', {
            'fields': ('overtime_threshold_hours', 'overtime_rate_multiplier')
        }),
        ('Working Days', {
            'fields': ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'is_recurring', 'created_at']
    list_filter = ['is_recurring', 'date', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']
    date_hierarchy = 'date'


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'start_date', 'end_date', 'days_count', 'status', 'created_at']
    list_filter = ['leave_type', 'status', 'start_date', 'created_at']
    search_fields = ['employee__employee_id', 'employee__first_name', 'employee__last_name', 'reason']
    readonly_fields = ['days_count', 'created_at', 'updated_at']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('Leave Information', {
            'fields': ('employee', 'leave_type', 'start_date', 'end_date', 'days_count', 'reason')
        }),
        ('Status', {
            'fields': ('status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'approved_by')


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ['level', 'message_short', 'module', 'employee', 'device', 'created_at']
    list_filter = ['level', 'module', 'created_at']
    search_fields = ['message', 'module', 'function']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def message_short(self, obj):
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    message_short.short_description = 'Message'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'device')

    def has_add_permission(self, request):
        return False  # Logs should not be manually added

    def has_change_permission(self, request, obj=None):
        return False  # Logs should not be modified


# Customize admin site
admin.site.site_header = "TAF Attendance System Administration"
admin.site.site_title = "TAF Attendance Admin"
admin.site.index_title = "Welcome to TAF Attendance System Administration"