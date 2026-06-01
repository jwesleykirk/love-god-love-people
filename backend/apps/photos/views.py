"""Photo serving + Person-photo mutation endpoints.

All endpoints enforce an owner-check before doing anything. Raw filesystem
paths NEVER leave the API — clients receive endpoint URLs instead.
"""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.people.models import Person
from apps.people.serializers import PersonSerializer

from .services.upload import PhotoUploadError, delete_photo_files, store_photo


def _resolve_safe(root: Path, relpath: str) -> Path:
    """Join root + relpath and refuse anything that escapes the root."""
    candidate = (root / relpath).resolve()
    root_resolved = root.resolve()
    try:
        candidate.relative_to(root_resolved)
    except ValueError as exc:
        raise Http404("photo not found") from exc
    return candidate


def _serve(request, person: Person):
    want_thumb = request.query_params.get("thumb") in ("1", "true")
    relpath = person.photo_thumbnail_path if want_thumb else person.photo_path
    if not relpath:
        raise Http404("no photo")
    abs_path = _resolve_safe(Path(settings.DATA_VOLUME_PATH), relpath)
    if not abs_path.exists():
        raise Http404("file missing")
    response = FileResponse(abs_path.open("rb"), content_type="image/jpeg")
    response["Cache-Control"] = "private, max-age=3600"
    return response


def _upload(request, person: Person):
    uploaded = request.FILES.get("file")
    if uploaded is None:
        return Response({"detail": "missing 'file' field"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        stored = store_photo(uploaded, owner_id=person.owner_id, person_id=person.id)
    except PhotoUploadError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    delete_photo_files(person.photo_path, person.photo_thumbnail_path)
    person.photo_path = stored.photo_relpath
    person.photo_thumbnail_path = stored.thumb_relpath
    person.photo_updated_at = timezone.now()
    person._change_reason = f"photo:upload:user_id={request.user.pk}"
    person.save(update_fields=["photo_path", "photo_thumbnail_path", "photo_updated_at"])
    serializer = PersonSerializer(person, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


def _delete(request, person: Person):
    delete_photo_files(person.photo_path, person.photo_thumbnail_path)
    person.photo_path = None
    person.photo_thumbnail_path = None
    person.photo_updated_at = None
    person._change_reason = f"photo:delete:user_id={request.user.pk}"
    person.save(update_fields=["photo_path", "photo_thumbnail_path", "photo_updated_at"])
    serializer = PersonSerializer(person, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST", "DELETE"])
@parser_classes([MultiPartParser])
def person_photo(request, pk: int):
    """GET → stream image. POST → upload (multipart 'file'). DELETE → clear."""
    person = get_object_or_404(Person, pk=pk)
    if person.owner_id != request.user.id:
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return _serve(request, person)
    if request.method == "POST":
        return _upload(request, person)
    if request.method == "DELETE":
        return _delete(request, person)
    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
