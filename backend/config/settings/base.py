"""
Base Django settings — shared between dev and prod.

Per the S3 New App Playbook, dev/prod split is selected via the
DJANGO_SETTINGS_MODULE env var. See `manage.py`, `wsgi.py`, `asgi.py`.
"""
from pathlib import Path

import environ

# BASE_DIR points to the `backend/` directory (two parents up from this file).
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)
# Read .env from the repo root if present (one level above backend/).
environ.Env.read_env(BASE_DIR.parent / ".env")

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# ---------------------------------------------------------------------------
# Apps
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "django_q",
    # CONFIGURE ME: uncomment when Entra OIDC is wired up.
    # "mozilla_django_oidc",
    # Local feature apps
    "apps.accounts",
    "apps.example",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            # When the React build runs, Vite writes the SPA shell into
            # frontend/dist/index.html. Django serves it from this template path.
            BASE_DIR.parent / "frontend" / "dist",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# DATABASE_URL is auto-injected by Railway when Postgres is added.
# Locally, set it in .env to point at docker-compose Postgres.
DATABASES = {
    "default": env.db_url(
        "DATABASE_URL",
        default="postgres://postgres:postgres@localhost:5432/prototype_dev",
    ),
}

# ---------------------------------------------------------------------------
# Auth — Microsoft Entra OIDC (CONFIGURE ME)
# ---------------------------------------------------------------------------
# Wire-up notes:
#   1. Create an app registration in the S3 Entra tenant.
#      See: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
#   2. Populate ENTRA_* env vars (see .env.example).
#   3. Add "mozilla_django_oidc" to INSTALLED_APPS above.
#   4. Add the auth backend below.
#   5. Mount the auth URLs in config/urls.py (already wired but commented).
#
# AUTHENTICATION_BACKENDS = [
#     "mozilla_django_oidc.auth.OIDCAuthenticationBackend",
#     "django.contrib.auth.backends.ModelBackend",
# ]
# OIDC_RP_CLIENT_ID = env("ENTRA_CLIENT_ID")
# OIDC_RP_CLIENT_SECRET = env("ENTRA_CLIENT_SECRET")
# OIDC_OP_AUTHORIZATION_ENDPOINT = (
#     f"https://login.microsoftonline.com/{env('ENTRA_TENANT_ID')}/oauth2/v2.0/authorize"
# )
# OIDC_OP_TOKEN_ENDPOINT = (
#     f"https://login.microsoftonline.com/{env('ENTRA_TENANT_ID')}/oauth2/v2.0/token"
# )
# OIDC_OP_USER_ENDPOINT = "https://graph.microsoft.com/oidc/userinfo"
# OIDC_RP_SIGN_ALGO = "RS256"
# OIDC_OP_JWKS_ENDPOINT = (
#     f"https://login.microsoftonline.com/{env('ENTRA_TENANT_ID')}/discovery/v2.0/keys"
# )
# LOGIN_REDIRECT_URL = "/"
# LOGOUT_REDIRECT_URL = "/"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# i18n / tz
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Los_Angeles"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
# In production Django serves the built React bundle as static assets.
# Vite writes to frontend/dist/; collectstatic copies into STATIC_ROOT.
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static_collected"
STATICFILES_DIRS = [
    BASE_DIR.parent / "frontend" / "dist",
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Background jobs — Django-Q2 (Postgres broker, no Redis)
# ---------------------------------------------------------------------------
Q_CLUSTER = {
    "name": "prototype",
    "workers": 2,
    "timeout": 60,
    "retry": 120,
    "queue_limit": 50,
    "bulk": 10,
    "orm": "default",
}

# ---------------------------------------------------------------------------
# AI integration
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY = env("OPENROUTER_API_KEY", default="")
# TODO-verify: confirm the latest Sonnet slug on openrouter.ai before shipping.
OPENROUTER_MODEL = env("OPENROUTER_MODEL", default="anthropic/claude-sonnet-4.5")
