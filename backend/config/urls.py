"""Root URL config.

- /api/<feature>/ — REST endpoints per feature app
- /api/auth/me/  — current user JSON
- /accounts/     — django-allauth (login flow, Google OAuth callback)
- /admin/        — Django admin
- /              — React SPA shell (frontend/dist/index.html)
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

from apps.accounts.views import me as accounts_me

urlpatterns = [
    path("admin/", admin.site.urls),

    # REST API
    path("api/people/", include("apps.people.urls")),
    path("api/entries/", include("apps.entries.urls")),
    path("api/property-defs/", include("apps.properties.urls_defs")),
    path("api/properties/", include("apps.properties.urls_values")),
    path("api/review/", include("apps.review.urls")),
    path("api/auth/me/", accounts_me, name="auth-me"),

    # django-allauth login/logout/callback URLs (mounted at /accounts/)
    path("accounts/", include("allauth.urls")),

    # SPA fallback — must be last. Any non-API path hits the React shell.
    path("", TemplateView.as_view(template_name="index.html"), name="spa"),
]
