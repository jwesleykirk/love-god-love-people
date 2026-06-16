"""Django-Q2 recurring schedule registration."""
from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def ensure_schedules():
    from django_q.models import Schedule

    build_hour = getattr(settings, "BUILD_TIME_HOUR", 3)
    dbr_hour = getattr(settings, "DBR_INGEST_HOUR", 2)

    schedules = [
        {
            "name": "dbr_ingest",
            "func": "apps.guide.tasks.dbr_ingest_task",
            "schedule_type": Schedule.CRON,
            "cron": f"30 {dbr_hour} * * *",
        },
        {
            "name": "compile_daily_guides",
            "func": "apps.guide.tasks.compile_daily_guides",
            "schedule_type": Schedule.CRON,
            "cron": f"0 {build_hour} * * *",
        },
    ]

    for spec in schedules:
        Schedule.objects.update_or_create(
            name=spec["name"],
            defaults={
                "func": spec["func"],
                "schedule_type": spec["schedule_type"],
                "cron": spec["cron"],
            },
        )
    logger.info("Guide schedules ensured (DBR @ %s:30, compile @ %s:00 PT)", dbr_hour, build_hour)
