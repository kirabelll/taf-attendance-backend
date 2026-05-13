# Django models for TAF Attendance System
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Employee(models.Model):
    """Employee model to store employee information"""
    employee_id = models.CharField(max_length=50, unique=True, primary_key=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    full_name = models.CharField(max_length=200, blank=True)
    department = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.full_name:
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee_id} - {self.full_name}"

    class Meta:
        db_table = 'employees'
        ordering = ['employee_id']


class Device(models.Model):
    """Device model to store attendance device information"""
    DEVICE_STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('maintenance', 'Maintenance'),
    ]

    device_id = models.CharField(max_length=50, unique=True, primary_key=True)
    device_name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    ip_address = models.GenericIPAddressField()
    port = models.IntegerField(default=4370)
    status = models.CharField(max_length=20, choices=DEVICE_STATUS_CHOICES, default='offline')
    last_sync = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.device_name} ({self.device_id})"

    class Meta:
        db_table = 'devices'
        ordering = ['device_name']


class AttendanceRecord(models.Model):
    """Attendance record model to store punch data"""
    PUNCH_TYPE_CHOICES = [
        ('check_in', 'Check In'),
        ('check_out', 'Check Out'),
        ('break_out', 'Break Out'),
        ('break_in', 'Break In'),
        ('overtime_in', 'Overtime In'),
        ('overtime_out', 'Overtime Out'),
    ]

    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('early_departure', 'Early Departure'),
        ('incomplete', 'Incomplete'),
    ]

    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='attendance_records')
    punch_time = models.DateTimeField()
    punch_type = models.CharField(max_length=20, choices=PUNCH_TYPE_CHOICES)
    date = models.DateField()
    
    # Calculated fields
    is_late = models.BooleanField(default=False)
    late_minutes = models.IntegerField(default=0)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Raw data from device
    raw_data = models.JSONField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.date:
            self.date = self.punch_time.date()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.employee_id} - {self.punch_time} ({self.punch_type})"

    class Meta:
        db_table = 'attendance_records'
        ordering = ['-punch_time']
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['punch_time']),
            models.Index(fields=['device']),
        ]


class DailyAttendanceSummary(models.Model):
    """Daily attendance summary for each employee"""
    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='daily_summaries')
    date = models.DateField()
    
    # Time tracking
    first_check_in = models.TimeField(null=True, blank=True)
    last_check_out = models.TimeField(null=True, blank=True)
    total_working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    break_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Status tracking
    is_present = models.BooleanField(default=False)
    is_late = models.BooleanField(default=False)
    late_minutes = models.IntegerField(default=0)
    early_departure = models.BooleanField(default=False)
    early_departure_minutes = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee.employee_id} - {self.date}"

    class Meta:
        db_table = 'daily_attendance_summary'
        unique_together = ['employee', 'date']
        ordering = ['-date', 'employee__employee_id']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['is_present']),
            models.Index(fields=['is_late']),
        ]


class AttendancePolicy(models.Model):
    """Attendance policy configuration"""
    name = models.CharField(max_length=100, unique=True)
    
    # Work schedule
    work_start_time = models.TimeField(default='08:00:00')
    work_end_time = models.TimeField(default='17:00:00')
    late_threshold_minutes = models.IntegerField(default=30)  # Late after 30 minutes
    early_departure_threshold_minutes = models.IntegerField(default=30)
    
    # Break configuration
    break_duration_minutes = models.IntegerField(default=60)  # 1 hour lunch break
    max_break_duration_minutes = models.IntegerField(default=90)
    
    # Overtime configuration
    overtime_threshold_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.00)
    overtime_rate_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.50)
    
    # Working days
    monday = models.BooleanField(default=True)
    tuesday = models.BooleanField(default=True)
    wednesday = models.BooleanField(default=True)
    thursday = models.BooleanField(default=True)
    friday = models.BooleanField(default=True)
    saturday = models.BooleanField(default=False)
    sunday = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'attendance_policies'
        ordering = ['name']


class Holiday(models.Model):
    """Holiday model for tracking company holidays"""
    name = models.CharField(max_length=200)
    date = models.DateField()
    is_recurring = models.BooleanField(default=False)  # For annual holidays
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.date}"

    class Meta:
        db_table = 'holidays'
        ordering = ['date']
        unique_together = ['name', 'date']


class LeaveRequest(models.Model):
    """Leave request model"""
    LEAVE_TYPE_CHOICES = [
        ('sick', 'Sick Leave'),
        ('vacation', 'Vacation'),
        ('personal', 'Personal Leave'),
        ('emergency', 'Emergency Leave'),
        ('maternity', 'Maternity Leave'),
        ('paternity', 'Paternity Leave'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    days_count = models.IntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval workflow
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            self.days_count = (self.end_date - self.start_date).days + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.employee_id} - {self.leave_type} ({self.start_date} to {self.end_date})"

    class Meta:
        db_table = 'leave_requests'
        ordering = ['-created_at']


class SystemLog(models.Model):
    """System log for tracking important events"""
    LOG_LEVEL_CHOICES = [
        ('debug', 'Debug'),
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]

    level = models.CharField(max_length=20, choices=LOG_LEVEL_CHOICES)
    message = models.TextField()
    module = models.CharField(max_length=100)
    function = models.CharField(max_length=100, blank=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    extra_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.level.upper()}] {self.message[:50]}..."

    class Meta:
        db_table = 'system_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['level']),
            models.Index(fields=['created_at']),
            models.Index(fields=['module']),
        ]