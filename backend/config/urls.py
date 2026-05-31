"""
Root URL config.

Per the S3 New App Playbook:
  - /api/<feature>/ → feature app URLs
  - /              → React SPA shell (frontend/dist/index.html)
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/example/", include("apps.example.urls")),
    # CONFIGURE ME: uncomment when Entra OIDC is wired up.
    # path("api/auth/", include("apps.accounts.urls")),
    # path("oidc/", include("mozilla_django_oidc.urls")),
    # SPA fallback — must be last. Any non-API path hits the React shell.
    path("", TemplateView.as_view(template_name="index.html"), name="spa"),
]
