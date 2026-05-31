"""
Production settings — used on Railway.

Set DJANGO_SETTINGS_MODULE=config.settings.prod in Railway service variables.
"""
from .base import *  # noqa: F401,F403

DEBUG = False

# Railway provides the domain in RAILWAY_PUBLIC_DOMAIN automatically.
# ALLOWED_HOSTS still reads from env in base.py; mirror the value in Railway vars.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 days
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
