"""Example feature views.

API contract:
  GET  /api/example/        → {"items": [...]} list recent notes
  POST /api/example/        → create a note from JSON body {"body": "..."}

Kept minimal. Add DRF (rest_framework) once the prototype outgrows hand-rolled
JSON. The pattern is the same: feature-scoped urls.py → views/serializers.
"""
import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Note


@csrf_exempt
@require_http_methods(["GET", "POST"])
def notes(request: HttpRequest) -> JsonResponse:
    if request.method == "POST":
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "invalid json"}, status=400)
        body = (payload.get("body") or "").strip()
        if not body:
            return JsonResponse({"error": "body required"}, status=400)
        note = Note.objects.create(body=body)
        return JsonResponse({"id": note.pk, "body": note.body}, status=201)

    items = [
        {"id": n.pk, "body": n.body, "created_at": n.created_at.isoformat()}
        for n in Note.objects.all()[:50]
    ]
    return JsonResponse({"items": items})
