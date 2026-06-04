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
from apps.future.urls import flashcard_urlpatterns, prayer_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),

    # REST API
    path("api/people/", include("apps.people.urls")),
    path("api/entries/", include("apps.entries.urls")),
    path("api/organizations/", include("apps.orgs.urls")),
    path("api/memberships/", include("apps.orgs.urls_memberships")),
    path("api/association-types/", include("apps.associations.urls_types")),
    path("api/person-associations/", include("apps.associations.urls")),
    path("api/property-defs/", include("apps.properties.urls_defs")),
    path("api/properties/", include("apps.properties.urls_values")),
    path("api/review/", include("apps.review.urls")),
    path("api/flashcards/", include(flashcard_urlpatterns)),
    path("api/prayer/", include(prayer_urlpatterns)),
    path("api/proposed-persons/", include("apps.extraction.urls")),
    path("api/auth/me/", accounts_me, name="auth-me"),

    # django-allauth login/logout/callback
    path("accounts/", include("allauth.urls")),

    # SPA fallback
    # SPA fallback — any non-server path serves the React shell so React Router
    # handles /people, /entries/new, /review, /orgs deep links on refresh.
    re_path(
        r"^(?!api/|admin/|accounts/|static/|oidc/).*$",
        TemplateView.as_view(template_name="index.html"),
        name="spa",
    ),
]
