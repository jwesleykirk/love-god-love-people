"""Extraction Review Console — v0.1 Pending Values surface.

Returns entries that produced at least one pending PersonProperty, grouped by
entry, in reverse-chronological order. Each entry payload carries the
extraction context (prompt version, model) and the per-property rows that
need review.

v0.1.1 will add the "New Property Definitions" surface; for now the data is
captured (Wesley can see it via the admin or by querying /api/property-defs/)
but there is no dedicated review UI.
"""
from collections import defaultdict
from datetime import datetime, timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.entries.models import JournalEntry
from apps.properties.models import PersonProperty, PersonPropertyStatus


class PendingValuesView(APIView):
    """GET /api/review/pending-values/"""

    def get(self, request):
        owner = request.user
        rows = (
            PersonProperty.objects.filter(
                owner=owner, status=PersonPropertyStatus.PENDING_REVIEW
            )
            .select_related("person", "property_def", "source_entry")
            .order_by("-created_at")
        )

        by_entry: dict[int | None, dict] = {}
        order: list[int | None] = []

        for pp in rows:
            entry_id = pp.source_entry_id  # may be None if entry deleted
            if entry_id not in by_entry:
                order.append(entry_id)
                source = pp.source_entry
                by_entry[entry_id] = {
                    "entry_id": entry_id,
                    "entry_content": source.content_markdown if source else "",
                    "entry_created_at": (
                        source.created_at.isoformat() if source else None
                    ),
                    "prompt_version": pp.prompt_version,
                    "model": pp.model,
                    "values": [],
                }
            by_entry[entry_id]["values"].append(
                {
                    "id": pp.pk,
                    "person_id": pp.person_id,
                    "person_name": pp.person.full_name if pp.person else None,
                    "property_def_id": pp.property_def_id,
                    "property_def_name": (
                        pp.property_def.name if pp.property_def else None
                    ),
                    "value_text": pp.value_text,
                    "ai_confidence": pp.ai_confidence,
                    "created_at": pp.created_at.isoformat(),
                }
            )

        # Surface error-state entries too — Wesley should see those.
        error_entries = JournalEntry.objects.filter(
            owner=owner, extraction_status="error"
        ).order_by("-created_at")[:20]
        errors = [
            {
                "entry_id": e.pk,
                "entry_content": e.content_markdown,
                "entry_created_at": e.created_at.isoformat(),
                "error": e.extraction_error,
            }
            for e in error_entries
        ]

        return Response(
            {
                "entries": [by_entry[k] for k in order],
                "errors": errors,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
        )
