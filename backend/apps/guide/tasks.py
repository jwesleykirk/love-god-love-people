"""Django-Q2 background tasks."""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def dbr_ingest_task():
    from apps.guide.services.dbr_ingest import ingest_feed

    return ingest_feed()


def compile_daily_guides():
    from apps.guide.services.compiler import compile_all_owners

    compile_all_owners()
    return True


def generate_topic_narration(topic_id: int, force: bool = False):
    from apps.guide.services.narration import generate_topic_narration as _generate

    _generate(topic_id, force=force)


def regenerate_todays_guide(owner_id: int):
    from django.contrib.auth import get_user_model

    from apps.guide.services.regenerate import regenerate_todays_guide_for_owner

    User = get_user_model()
    owner = User.objects.get(pk=owner_id)
    regenerate_todays_guide_for_owner(owner)
    return True


def generate_liturgy_segments(force: bool = False):
    from apps.guide.services.narration import generate_liturgy_segments as _gen

    return _gen(force=force)
