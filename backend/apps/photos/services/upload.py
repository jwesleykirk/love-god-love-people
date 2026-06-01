"""Photo upload pipeline.

Pipeline:
    1. Validate size (<=10 MB) and MIME (image/*).
    2. Open with Pillow; reject anything that doesn't decode.
    3. Auto-rotate based on EXIF orientation (so users see what they shot).
    4. **STRIP ALL EXIF METADATA.** Photos may contain GPS, device serials, and
       timestamps. This step is non-negotiable for privacy.
    5. Resize: longest side <= 1024 px, aspect preserved.
    6. Convert to JPEG quality 85 (uniform format simplifies serving).
    7. Build a 200x200 cover-cropped thumbnail.
    8. Write both files under {DATA_VOLUME_PATH}/photos/{owner_id}/{person_id}/
       with a fresh UUID per upload, so replacing a photo never reuses a path.
    9. Return (photo_relpath, thumb_relpath) as strings relative to the volume.

The volume root is read from `settings.DATA_VOLUME_PATH`.
"""

from __future__ import annotations

import io
import os
import uuid
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_LONGEST_SIDE = 1024
THUMB_SIZE = (200, 200)
JPEG_QUALITY = 85


class PhotoUploadError(ValueError):
    """Raised for any user-facing rejection (size, mime, decode, etc.)."""


@dataclass(frozen=True)
class StoredPhoto:
    photo_relpath: str
    thumb_relpath: str


def _volume_root() -> Path:
    return Path(settings.DATA_VOLUME_PATH)


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _strip_exif_and_normalize(img: Image.Image) -> Image.Image:
    """Auto-rotate based on EXIF then drop EXIF entirely.

    `Image.open` keeps a reference to the source EXIF on `img.info`. To be sure
    nothing leaks, we re-build the image from raw pixel data so the returned
    object has no `info["exif"]`, no `_getexif()`, nothing.
    """
    # Apply orientation tag, then transpose so the bytes are visually correct.
    img = ImageOps.exif_transpose(img)
    # Flatten transparency onto a white background since we're writing JPEG.
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Hard-reset: copy pixels into a fresh Image so info/exif are gone.
    clean = Image.new("RGB", img.size)
    clean.paste(img)
    return clean


def _resize_main(img: Image.Image) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= MAX_LONGEST_SIDE:
        return img
    scale = MAX_LONGEST_SIDE / float(longest)
    new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
    return img.resize(new_size, Image.LANCZOS)


def _make_thumb(img: Image.Image) -> Image.Image:
    return ImageOps.fit(img, THUMB_SIZE, Image.LANCZOS, centering=(0.5, 0.5))


def _write_jpeg(img: Image.Image, dest: Path) -> None:
    buf = io.BytesIO()
    # No exif, no icc_profile: explicitly omit. Pillow writes none by default
    # when we don't pass them, but being explicit also documents the intent.
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    dest.write_bytes(buf.getvalue())


def store_photo(uploaded: UploadedFile, *, owner_id: int, person_id: int) -> StoredPhoto:
    """Validate, process, and persist one upload. Returns relative paths."""
    # 1. Size check (UploadedFile.size is the in-memory or on-disk byte count).
    size = getattr(uploaded, "size", None)
    if size is None or size <= 0:
        raise PhotoUploadError("empty upload")
    if size > MAX_UPLOAD_BYTES:
        raise PhotoUploadError(f"file too large (max {MAX_UPLOAD_BYTES // (1024*1024)} MB)")

    # 2. MIME check (client-declared content type).
    content_type = (getattr(uploaded, "content_type", "") or "").lower()
    if not content_type.startswith("image/"):
        raise PhotoUploadError("file must be an image")

    # 3. Decode with Pillow.
    try:
        uploaded.seek(0)
    except (AttributeError, OSError):
        pass
    try:
        img = Image.open(uploaded)
        img.load()  # force full decode so malformed images fail here, not later
    except (UnidentifiedImageError, OSError) as exc:
        raise PhotoUploadError("could not decode image") from exc

    # 4 + 5. Strip EXIF, normalize mode, resize.
    img = _strip_exif_and_normalize(img)
    main = _resize_main(img)

    # 6. Thumb (built from the resized main so we don't process the full-res
    # twice; cover-crop is the same either way for our 200x200 target).
    thumb = _make_thumb(main)

    # 7. Pick a destination. UUID collision is astronomically unlikely but we
    # check anyway because the cost is one stat call.
    rel_dir = Path("photos") / str(owner_id) / str(person_id)
    abs_dir = _volume_root() / rel_dir
    _ensure_dir(abs_dir)

    while True:
        token = uuid.uuid4().hex
        main_rel = rel_dir / f"{token}.jpg"
        thumb_rel = rel_dir / f"{token}_thumb.jpg"
        main_abs = _volume_root() / main_rel
        thumb_abs = _volume_root() / thumb_rel
        if not main_abs.exists() and not thumb_abs.exists():
            break

    _write_jpeg(main, main_abs)
    _write_jpeg(thumb, thumb_abs)

    return StoredPhoto(
        photo_relpath=str(main_rel).replace(os.sep, "/"),
        thumb_relpath=str(thumb_rel).replace(os.sep, "/"),
    )


def delete_photo_files(*relpaths: str | None) -> None:
    """Best-effort removal of stored files. Missing files are not an error."""
    root = _volume_root()
    for rel in relpaths:
        if not rel:
            continue
        path = root / rel
        try:
            path.unlink(missing_ok=True)
        except OSError:
            # Filesystem error on a delete is non-fatal — log when we add logging.
            pass
