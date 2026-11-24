from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.http import JsonResponse


class APIBearerAuthMiddleware:
    """Require a valid signed bearer token for attendance API endpoints."""

    public_paths = {
        "/api/auth/login/",
        "/api/auth/register/",
        "/api/test-connection/",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/") or request.path in self.public_paths:
            return self.get_response(request)
        if request.method == "OPTIONS":
            return self.get_response(request)

        scheme, _, token = request.headers.get("Authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not token:
            return JsonResponse({"success": False, "message": "Authentication required"}, status=401)

        try:
            payload = signing.loads(token, salt="taf-attendance.access-token", max_age=settings.AUTH_TOKEN_MAX_AGE)
            request.user = get_user_model().objects.get(pk=payload["user_id"], is_active=True)
        except (signing.BadSignature, signing.SignatureExpired, KeyError, ValueError, get_user_model().DoesNotExist):
            return JsonResponse({"success": False, "message": "Invalid or expired access token"}, status=401)
        return self.get_response(request)
