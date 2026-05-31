"""
Development settings.

Used by `manage.py` by default (see DJANGO_SETTINGS_MODULE in manage.py).
"""
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Looser CSRF for local dev across Vite (5173) → Django (8000).
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
]
