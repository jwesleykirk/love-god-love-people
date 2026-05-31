import logging

from django.conf import settings
from django_q.tasks import async_task
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import JournalEntry
from .serializers import JournalEntrySerializer

logger = logging.getLogger(__name__)


class JournalEntryViewSet(viewsets.ModelViewSet):
    """CRUD for JournalEntry. POST triggers async extraction."""

    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        qs = JournalEntry.objects.filter(owner=self.request.user)
        person_id = self.request.query_params.get("person_id")
        if person_id:
            qs = qs.filter(persons__id=person_id)
        return qs.distinct()

    def perform_create(self, serializer):
        entry = serializer.save(owner=self.request.user)
        self._enqueue_extraction(entry)

    def _enqueue_extraction(self, entry: JournalEntry) -> None:
        if not getattr(settings, "OPENROUTER_API_KEY", ""):
            entry.extraction_status = "skipped"
            entry.save(update_fields=["extraction_status"])
            logger.info("extraction skipped (no OPENROUTER_API_KEY) for entry %s", entry.pk)
            return
        try:
            async_task("apps.extraction.tasks.run_extraction", entry.pk)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("failed to enqueue extraction for entry %s", entry.pk)
            entry.extraction_status = "error"
            entry.extraction_error = f"enqueue failed: {exc}"
            entry.save(update_fields=["extraction_status", "extraction_error"])

    @action(detail=True, methods=["post"], url_path="re-extract")
    def re_extract(self, request, pk=None):
        entry = self.get_object()
        entry.extraction_status = "pending"
        entry.extraction_error = ""
        entry.save(update_fields=["extraction_status", "extraction_error"])
        self._enqueue_extraction(entry)
        return Response({"status": entry.extraction_status}, status=status.HTTP_202_ACCEPTED)
