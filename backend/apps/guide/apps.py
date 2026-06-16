import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class GuideConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.guide"
    label = "guide"

    def ready(self):
        import sys

        if "test" in sys.argv:
            return
        try:
            from .schedules import ensure_schedules

            ensure_schedules()
        except Exception:
            logger.exception("Failed to ensure guide schedules on startup")
