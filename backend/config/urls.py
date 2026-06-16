"""Root URL config.

- /api/<feature>/        REST endpoints per feature app
- /api/auth/me/          current user JSON
- /accounts/             django-allauth (login flow, Google OAuth callback)
- /admin/                Django admin
- /                      React SPA shell
"""
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

from apps.accounts.views import me as accounts_me

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/people/", include("apps.people.urls")),
    path("api/groups/", include("apps.groups.urls")),
    path("api/prayer/", include("apps.prayer.urls")),
    path("api/dbr/", include("apps.dbr.urls")),
    path("api/guide/", include("apps.guide.urls")),
    path("api/auth/me/", accounts_me, name="auth-me"),

    path("accounts/", include("allauth.urls")),

    re_path(
        r"^(?!api/|admin/|accounts/|static/|oidc/).*$",
        TemplateView.as_view(template_name="index.html"),
        name="spa",
    ),
]
