"""Permission classes and role-based access control for Attendance API"""
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied

User = get_user_model()

# Role hierarchy: higher number = more permissions
ROLE_HIERARCHY = {
    'viewer': 10,      # Read-only access to reports
    'employee': 20,    # Can view own attendance, request leave
    'hr': 30,          # Can manage attendance entries, view all reports
    'manager': 40,     # Can manage team attendance, approve leave
    'admin': 50,       # Full access including user management
}

# Default role for new users
DEFAULT_ROLE = 'employee'

# Permissions by role
ROLE_PERMISSIONS = {
    'viewer': [
        'view_reports',
        'view_dashboard',
    ],
    'employee': [
        'view_reports',
        'view_dashboard',
        'view_own_attendance',
        'request_leave',
    ],
    'hr': [
        'view_reports',
        'view_dashboard',
        'view_own_attendance',
        'request_leave',
        'view_all_attendance',
        'manage_attendance_entries',
        'view_employees',
        'view_devices',
        'export_reports',
    ],
    'manager': [
        'view_reports',
        'view_dashboard',
        'view_own_attendance',
        'request_leave',
        'view_all_attendance',
        'manage_attendance_entries',
        'view_employees',
        'view_devices',
        'export_reports',
        'manage_team_attendance',
        'approve_leave',
        'view_team_reports',
    ],
    'admin': [
        'view_reports',
        'view_dashboard',
        'view_own_attendance',
        'request_leave',
        'view_all_attendance',
        'manage_attendance_entries',
        'view_employees',
        'view_devices',
        'export_reports',
        'manage_team_attendance',
        'approve_leave',
        'view_team_reports',
        'manage_users',
        'manage_roles',
        'manage_settings',
        'manage_devices',
        'view_system_logs',
    ],
}


def get_user_role(user):
    """Get user's role from profile or return default"""
    if hasattr(user, 'userprofile'):
        return user.userprofile.role
    return DEFAULT_ROLE


def has_permission(user, permission):
    """Check if user has a specific permission"""
    role = get_user_role(user)
    return permission in ROLE_PERMISSIONS.get(role, [])


def has_any_permission(user, permissions):
    """Check if user has any of the given permissions"""
    return any(has_permission(user, p) for p in permissions)


def has_all_permissions(user, permissions):
    """Check if user has all of the given permissions"""
    return all(has_permission(user, p) for p in permissions)


def role_required(*required_roles):
    """Decorator to require specific role(s)"""
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            user_role = get_user_role(request.user)
            if user_role not in required_roles:
                raise PermissionDenied(f"Required role: {', '.join(required_roles)}")
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def permission_required(*required_permissions):
    """Decorator to require specific permission(s)"""
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            if not has_all_permissions(request.user, required_permissions):
                raise PermissionDenied(f"Required permissions: {', '.join(required_permissions)}")
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def get_role_level(role):
    """Get numeric level of a role for comparison"""
    return ROLE_HIERARCHY.get(role, 0)


def can_manage_role(user, target_role):
    """Check if user can manage users with target_role"""
    user_level = get_role_level(get_user_role(user))
    target_level = get_role_level(target_role)
    return user_level > target_level


def get_manageable_roles(user):
    """Get list of roles that user can assign to others"""
    user_level = get_role_level(get_user_role(user))
    return [role for role, level in ROLE_HIERARCHY.items() if level < user_level]


def get_available_roles():
    """Get all available roles with their levels"""
    return [{'role': role, 'level': level, 'label': role.capitalize()}
            for role, level in sorted(ROLE_HIERARCHY.items(), key=lambda x: x[1])]