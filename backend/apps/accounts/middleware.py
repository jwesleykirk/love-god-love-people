"""
Auth middleware placeholder for Microsoft Entra OIDC.

CONFIGURE ME — currently a no-op pass-through. The real wire-up uses
mozilla_django_oidc, which provides its own middleware/auth backend.
That config lives (commented) in config/settings/base.py.

This module exists as the *project-specific* extension point: if you need
to enforce auth on /api/ before mozilla_django_oidc's views run, or to
attach Entra group claims to request.user, do it here.

Reference: https://mozilla-django-oidc.readthedocs.io/en/stable/
"""
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse


class EntraAuthMiddleware:
    """No-op placeholder. Wire up real Entra enforcement here."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # CONFIGURE ME: reject unauthenticated /api/ requests once OIDC is live.
        # if request.path.startswith("/api/") and not request.user.is_authenticated:
        #     return JsonResponse({"error": "unauthenticated"}, status=401)
        return self.get_response(request)
