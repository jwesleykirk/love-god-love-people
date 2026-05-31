"""Account views — currently just /api/auth/me/."""
from django.conf import settings
from django.http import HttpRequest, JsonResponse


def me(request: HttpRequest) -> JsonResponse:
    """Return the current user's identity.

    Always returns 200. The frontend reads `authenticated` to decide whether
    to redirect to the Google login URL.
    """
    user = request.user
    authed = bool(user and user.is_authenticated)
    payload = {
        "authenticated": authed,
        "auth_enabled": bool(getattr(settings, "ENABLE_AUTH", False)),
        "login_url": "/accounts/google/login/",
        "logout_url": "/accounts/logout/",
    }
    if authed:
        payload["user"] = {
            "id": user.pk,
            "email": getattr(user, "email", ""),
            "username": user.get_username(),
            "first_name": getattr(user, "first_name", ""),
        }
    return JsonResponse(payload)
