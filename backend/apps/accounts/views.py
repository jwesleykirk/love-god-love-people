"""Account views — /api/auth/me/ and native iOS OAuth handoff."""
from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse

IOS_AUTH_COMPLETE_PATH = "/accounts/ios-auth-complete/"
IOS_LOGIN_PATH = f"/accounts/google/login/?next={IOS_AUTH_COMPLETE_PATH}"


def ios_auth_complete(request: HttpRequest) -> HttpResponse:
    """Return the native app after Google OAuth via custom URL scheme."""
    response = HttpResponse(status=302)
    response["Location"] = "lglp://auth-complete"
    return response


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
        "ios_login_url": IOS_LOGIN_PATH,
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
