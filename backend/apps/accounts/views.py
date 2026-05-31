"""
Auth view placeholders for Microsoft Entra OIDC.

CONFIGURE ME — the real OAuth code-exchange flow is handled by
mozilla_django_oidc's built-in views, mounted via:

    path("oidc/", include("mozilla_django_oidc.urls"))

This module exists for *project-specific* endpoints layered on top:
  - GET /api/auth/me  → return the current user's profile as JSON
  - POST /api/auth/logout → server-side session teardown if needed

Reference:
  https://mozilla-django-oidc.readthedocs.io/en/stable/installation.html
  https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
"""
from django.http import HttpRequest, JsonResponse


def me(request: HttpRequest) -> JsonResponse:
    """Return the current user's identity. Stub until OIDC is wired."""
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False}, status=200)
    return JsonResponse(
        {
            "authenticated": True,
            "username": request.user.get_username(),
            "email": getattr(request.user, "email", ""),
        }
    )
