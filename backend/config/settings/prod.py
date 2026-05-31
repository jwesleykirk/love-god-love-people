"""Production settings — used on Railway."""
import os

from .base import *  # noqa: F401,F403

DEBUG = False

# Railway provides RAILWAY_PUBLIC_DOMAIN automatically. Add it to ALLOWED_HOSTS
# if present, in addition to whatever DJANGO_ALLOWED_HOSTS provides.
_railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "").strip()
if _railway_domain and _railway_domain not in ALLOWED_HOSTS:  # noqa: F405
    ALLOWED_HOSTS = list(ALLOWED_HOSTS) + [_railway_domain]  # noqa: F405

if _railway_domain:
    CSRF_TRUSTED_ORIGINS = [f"https://{_railway_domain}"]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
