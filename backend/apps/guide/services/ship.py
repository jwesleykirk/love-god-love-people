"""One-shot production ship: regen liturgy, re-ingest DBR intros, recompile guides."""
from __future__ import annotations

import logging

from apps.guide.services.compiler import compile_all_owners
from apps.guide.services.dbr_ingest import ingest_feed
from apps.guide.services.narration import generate_liturgy_segments

logger = logging.getLogger(__name__)


def ship_all_guides() -> dict:
    liturgy_count = generate_liturgy_segments(force=True)
    dbr_count = ingest_feed()
    compile_all_owners()
    logger.info("Guide ship complete: %s liturgy segments, %s DBR items", liturgy_count, dbr_count)
    return {"liturgy_segments": liturgy_count, "dbr_items": dbr_count}
