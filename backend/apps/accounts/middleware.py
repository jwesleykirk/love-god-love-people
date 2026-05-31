"""Auth feature-flag middleware.

When ENABLE_AUTH is False, every request is auto-logged-in as the fixture
user (`FIXTURE_USER_EMAIL`, default `wesley@local`). This lets the app run
end-to-end without any OAuth credentials — useful for the very first
Railway deploy and for local exploration.

When ENABLE_AUTH is True, this middleware is a no-op and django-allauth
takes over.
"""
from collections.abc import Callable

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpRequest, HttpResponse


class FixtureUserMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if not getattr(settings, "ENABLE_AUTH", False):
            User = get_user_model()
            email = getattr(settings, "FIXTURE_USER_EMAIL", "wesley@local")
            user, _ = User.objects.get_or_create(
                username=email,
                defaults={"email": email, "first_name": "Wesley"},
            )
            request.user = user
        return self.get_response(request)
