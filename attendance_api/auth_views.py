import json
import uuid

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.core.validators import validate_email
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import UserProfile
from .permissions import (
    get_user_role, has_permission, ROLE_PERMISSIONS, ROLE_HIERARCHY,
    can_manage_role, get_manageable_roles, get_available_roles,
    permission_required, role_required
)


TOKEN_SALT = "taf-attendance.access-token"


def _issue_token(user):
    return signing.dumps({"user_id": user.pk}, salt=TOKEN_SALT, compress=True)


def _user_data(user):
    """Return user data with role and permissions"""
    role = get_user_role(user)
    profile = getattr(user, 'userprofile', None)
    return {
        "id": user.pk,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": f"{user.first_name} {user.last_name}".strip(),
        "role": role,
        "role_label": dict(UserProfile.ROLE_CHOICES).get(role, role),
        "permissions": ROLE_PERMISSIONS.get(role, []),
        "department": profile.department if profile else "",
        "position": profile.position if profile else "",
        "phone": profile.phone if profile else "",
    }


def _read_json(request):
    try:
        return json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    data = _read_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"success": False, "message": "Invalid request body"}, status=400)

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    full_name = " ".join(str(data.get("name", "")).split())
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"success": False, "message": "Enter a valid email address"}, status=400)
    if not isinstance(password, str) or not password:
        return JsonResponse({"success": False, "message": "Password is required"}, status=400)

    User = get_user_model()
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"success": False, "message": "An account with this email already exists"}, status=409)

    user = User(email=email, username="user_" + uuid.uuid4().hex)
    if full_name:
        name_parts = full_name.split(" ", 1)
        user.first_name = name_parts[0][:150]
        user.last_name = name_parts[1][:150] if len(name_parts) > 1 else ""
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return JsonResponse({"success": False, "message": " ".join(exc.messages)}, status=400)

    user.set_password(password)
    user.save()

    # Create user profile with default role (employee)
    # First user becomes admin
    is_first_user = User.objects.count() == 1
    UserProfile.objects.create(
        user=user,
        role='admin' if is_first_user else 'employee'
    )

    return JsonResponse({"success": True, "access": _issue_token(user), "user": _user_data(user)}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = _read_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"success": False, "message": "Invalid request body"}, status=400)
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    user_record = get_user_model().objects.filter(email__iexact=email).first()
    user = authenticate(request, username=user_record.get_username(), password=password) if user_record else None
    if not user or not user.is_active:
        return JsonResponse({"success": False, "message": "Invalid email or password"}, status=401)

    # Update last login IP
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.last_login_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    profile.save(update_fields=['last_login_ip', 'updated_at'])

    return JsonResponse({"success": True, "access": _issue_token(user), "user": _user_data(user)})


@require_http_methods(["GET"])
def current_user(request):
    return JsonResponse({"success": True, "user": _user_data(request.user)})


# User Management Endpoints (Admin only)

@csrf_exempt
@require_http_methods(["GET"])
@permission_required('manage_users')
def list_users(request):
    """List all users with their profiles (admin only)"""
    User = get_user_model()
    users = User.objects.select_related('userprofile').all().order_by('-date_joined')

    user_list = []
    for user in users:
        profile = getattr(user, 'userprofile', None)
        user_list.append({
            "id": user.pk,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "role": profile.role if profile else 'employee',
            "role_label": dict(UserProfile.ROLE_CHOICES).get(profile.role, profile.role) if profile else 'Employee',
            "department": profile.department if profile else "",
            "position": profile.position if profile else "",
            "phone": profile.phone if profile else "",
            "last_login_ip": profile.last_login_ip if profile else None,
        })

    return JsonResponse({"success": True, "users": user_list, "count": len(user_list)})


@csrf_exempt
@require_http_methods(["POST"])
@permission_required('manage_users')
def create_user(request):
    """Create a new user (admin only)"""
    data = _read_json(request)
    if not isinstance(data, dict):
        return JsonResponse({"success": False, "message": "Invalid request body"}, status=400)

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    full_name = " ".join(str(data.get("name", "")).split())
    role = data.get("role", "employee")
    department = data.get("department", "")
    position = data.get("position", "")
    phone = data.get("phone", "")

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"success": False, "message": "Enter a valid email address"}, status=400)
    if not isinstance(password, str) or not password:
        return JsonResponse({"success": False, "message": "Password is required"}, status=400)

    # Check if requester can assign this role
    if not can_manage_role(request.user, role):
        return JsonResponse({"success": False, "message": "You don't have permission to assign this role"}, status=403)

    User = get_user_model()
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"success": False, "message": "An account with this email already exists"}, status=409)

    user = User(email=email, username="user_" + uuid.uuid4().hex)
    if full_name:
        name_parts = full_name.split(" ", 1)
        user.first_name = name_parts[0][:150]
        user.last_name = name_parts[1][:150] if len(name_parts) > 1 else ""
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return JsonResponse({"success": False, "message": " ".join(exc.messages)}, status=400)

    user.set_password(password)
    user.save()

    UserProfile.objects.create(
        user=user,
        role=role,
        department=department,
        position=position,
        phone=phone,
    )

    return JsonResponse({"success": True, "message": "User created successfully", "user": _user_data(user)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
@permission_required('manage_users')
def manage_user(request, user_id):
    """Get, update, or delete a user (admin only)"""
    User = get_user_model()
    try:
        user = User.objects.select_related('userprofile').get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"success": False, "message": "User not found"}, status=404)

    profile = getattr(user, 'userprofile', None)

    # Prevent self-deletion and self-demotion
    if user.pk == request.user.pk:
        if request.method == "DELETE":
            return JsonResponse({"success": False, "message": "Cannot delete your own account"}, status=400)
        if request.method == "PATCH":
            data = _read_json(request)
            if data and 'role' in data and not can_manage_role(request.user, data['role']):
                return JsonResponse({"success": False, "message": "Cannot change your own role"}, status=400)

    # Prevent managing users with higher or equal role
    if profile and not can_manage_role(request.user, profile.role):
        return JsonResponse({"success": False, "message": "Cannot manage user with higher or equal role"}, status=403)

    if request.method == "GET":
        return JsonResponse({"success": True, "user": _user_data(user)})

    elif request.method == "PATCH":
        data = _read_json(request)
        if not isinstance(data, dict):
            return JsonResponse({"success": False, "message": "Invalid request body"}, status=400)

        # Update user fields
        if 'first_name' in data:
            user.first_name = data['first_name'][:150]
        if 'last_name' in data:
            user.last_name = data['last_name'][:150]
        if 'email' in data:
            new_email = str(data['email']).strip().lower()
            if new_email != user.email:
                try:
                    validate_email(new_email)
                except ValidationError:
                    return JsonResponse({"success": False, "message": "Enter a valid email address"}, status=400)
                if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                    return JsonResponse({"success": False, "message": "An account with this email already exists"}, status=409)
                user.email = new_email
                user.username = new_email  # Also update username if using email
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])

        user.save()

        # Update profile fields
        if profile:
            if 'role' in data:
                new_role = data['role']
                if not can_manage_role(request.user, new_role):
                    return JsonResponse({"success": False, "message": "You don't have permission to assign this role"}, status=403)
                profile.role = new_role
            if 'department' in data:
                profile.department = data['department'][:100]
            if 'position' in data:
                profile.position = data['position'][:100]
            if 'phone' in data:
                profile.phone = data['phone'][:20]
            profile.save()

        return JsonResponse({"success": True, "message": "User updated successfully", "user": _user_data(user)})

    elif request.method == "DELETE":
        user.delete()  # Cascade will delete profile
        return JsonResponse({"success": True, "message": "User deleted successfully"})


@require_http_methods(["GET"])
@permission_required('manage_roles')
def get_roles(request):
    """Get available roles (admin only)"""
    current_user_role = get_user_role(request.user)
    manageable = get_manageable_roles(request.user)
    available = get_available_roles()

    return JsonResponse({
        "success": True,
        "current_user_role": current_user_role,
        "manageable_roles": manageable,
        "all_roles": available,
        "role_permissions": ROLE_PERMISSIONS,
    })


@require_http_methods(["GET"])
def get_my_permissions(request):
    """Get current user's permissions"""
    role = get_user_role(request.user)
    return JsonResponse({
        "success": True,
        "role": role,
        "permissions": ROLE_PERMISSIONS.get(role, []),
        "all_permissions": list(set().union(*ROLE_PERMISSIONS.values())),
    })