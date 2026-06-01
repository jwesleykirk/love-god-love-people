"""Phase 4 photo tests.

Covers:
    - happy-path upload (JPG + PNG)
    - rejection paths (oversize, wrong mime, malformed bytes)
    - owner-only access enforcement (user A can't fetch user B's photo)
    - delete clears DB and filesystem
    - EXIF stripping — load image with GPS EXIF, upload, fetch, assert no GPS
"""

from __future__ import annotations

import io
import shutil
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.people.models import Person


def _make_image_bytes(fmt: str = "JPEG", *, size=(800, 600), color=(120, 180, 200)) -> bytes:
    """Build a valid in-memory image with no EXIF."""
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=92)
    return buf.getvalue()


def _temp_volume():
    return tempfile.mkdtemp(prefix="lglp_photos_test_")


class PhotoUploadHappyPath(TestCase):
    def setUp(self):
        self.tmp = _temp_volume()
        self.override = override_settings(DATA_VOLUME_PATH=self.tmp)
        self.override.enable()
        self.client = APIClient()
        self.client.get("/api/auth/me/")  # primes the fixture user
        resp = self.client.post(
            "/api/people/",
            {"full_name": "Jose Sanchez", "relationship_category": "work"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.person_id = resp.json()["id"]

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _upload(self, data: bytes, *, name: str, content_type: str):
        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile(name, data, content_type=content_type)
        return self.client.post(
            f"/api/people/{self.person_id}/photo/",
            {"file": upload},
            format="multipart",
        )

    def test_upload_jpg(self):
        resp = self._upload(_make_image_bytes("JPEG"), name="selfie.jpg", content_type="image/jpeg")
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertTrue(body["photo_url"].startswith(f"/api/people/{self.person_id}/photo/"))
        self.assertTrue(body["photo_thumbnail_url"].startswith(f"/api/people/{self.person_id}/photo/"))
        # Verify files exist on disk under owner/person subdirs.
        person_dir = Path(self.tmp) / "photos" / str(Person.objects.get(pk=self.person_id).owner_id) / str(self.person_id)
        files = list(person_dir.iterdir())
        self.assertEqual(len(files), 2, f"expected main + thumb, got {files}")

    def test_upload_png(self):
        resp = self._upload(_make_image_bytes("PNG"), name="shot.png", content_type="image/png")
        self.assertEqual(resp.status_code, 200, resp.content)

    def test_fetch_main_and_thumb(self):
        self._upload(_make_image_bytes("JPEG"), name="a.jpg", content_type="image/jpeg")
        main = self.client.get(f"/api/people/{self.person_id}/photo/")
        self.assertEqual(main.status_code, 200)
        self.assertEqual(main["Content-Type"], "image/jpeg")
        thumb = self.client.get(f"/api/people/{self.person_id}/photo/?thumb=1")
        self.assertEqual(thumb.status_code, 200)
        self.assertEqual(thumb["Content-Type"], "image/jpeg")

    def test_delete_removes_files_and_clears_db(self):
        self._upload(_make_image_bytes("JPEG"), name="a.jpg", content_type="image/jpeg")
        owner_id = Person.objects.get(pk=self.person_id).owner_id
        person_dir = Path(self.tmp) / "photos" / str(owner_id) / str(self.person_id)
        self.assertEqual(len(list(person_dir.iterdir())), 2)

        resp = self.client.delete(f"/api/people/{self.person_id}/photo/")
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertIsNone(body["photo_url"])
        self.assertIsNone(body["photo_thumbnail_url"])
        self.assertEqual(len(list(person_dir.iterdir())), 0)

    def test_replace_cleans_up_old_files(self):
        self._upload(_make_image_bytes("JPEG"), name="a.jpg", content_type="image/jpeg")
        owner_id = Person.objects.get(pk=self.person_id).owner_id
        person_dir = Path(self.tmp) / "photos" / str(owner_id) / str(self.person_id)
        self.assertEqual(len(list(person_dir.iterdir())), 2)

        # Second upload should leave still exactly 2 files (old pair removed).
        self._upload(_make_image_bytes("PNG", color=(50, 50, 50)), name="b.png", content_type="image/png")
        self.assertEqual(len(list(person_dir.iterdir())), 2)


class PhotoUploadRejections(TestCase):
    def setUp(self):
        self.tmp = _temp_volume()
        self.override = override_settings(DATA_VOLUME_PATH=self.tmp)
        self.override.enable()
        self.client = APIClient()
        self.client.get("/api/auth/me/")
        resp = self.client.post(
            "/api/people/",
            {"full_name": "Test Person", "relationship_category": "friend"},
            format="json",
        )
        self.person_id = resp.json()["id"]

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _upload(self, data: bytes, *, name: str, content_type: str):
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = SimpleUploadedFile(name, data, content_type=content_type)
        return self.client.post(
            f"/api/people/{self.person_id}/photo/",
            {"file": upload},
            format="multipart",
        )

    def test_reject_oversize(self):
        # 10 MB + 1 byte of dummy data, declared as image. Size gate fires first.
        big = b"\xff\xd8\xff" + b"x" * (10 * 1024 * 1024)
        resp = self._upload(big, name="huge.jpg", content_type="image/jpeg")
        self.assertEqual(resp.status_code, 400, resp.content)
        self.assertIn("too large", resp.json()["detail"])

    def test_reject_wrong_mime(self):
        resp = self._upload(b"not even close", name="file.txt", content_type="text/plain")
        self.assertEqual(resp.status_code, 400, resp.content)

    def test_reject_malformed_image(self):
        resp = self._upload(b"nope-not-an-image", name="x.jpg", content_type="image/jpeg")
        self.assertEqual(resp.status_code, 400, resp.content)


@override_settings(ENABLE_AUTH=True)
class PhotoOwnerAccess(TestCase):
    """User B must not be able to GET or DELETE user A's photo.

    ENABLE_AUTH=True disables the fixture-user middleware so force_login
    actually sticks. (Under normal dev settings every request becomes
    wesley@local regardless of who logged in.)
    """

    def setUp(self):
        self.tmp = _temp_volume()
        self.override = override_settings(DATA_VOLUME_PATH=self.tmp)
        self.override.enable()
        User = get_user_model()
        self.user_a = User.objects.create_user(username="alice@local", email="alice@local")
        self.user_b = User.objects.create_user(username="bob@local", email="bob@local")

        # User A creates a person + uploads a photo.
        self.client_a = APIClient()
        self.client_a.force_login(self.user_a)
        self.person = Person.objects.create(owner=self.user_a, full_name="A's Friend")

        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = SimpleUploadedFile("f.jpg", _make_image_bytes("JPEG"), content_type="image/jpeg")
        resp = self.client_a.post(f"/api/people/{self.person.id}/photo/", {"file": upload}, format="multipart")
        self.assertEqual(resp.status_code, 200, resp.content)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_other_user_get_forbidden(self):
        client_b = APIClient()
        client_b.force_login(self.user_b)
        resp = client_b.get(f"/api/people/{self.person.id}/photo/")
        self.assertIn(resp.status_code, (403, 404), resp.content)
        # Person.objects.filter(pk, owner=) returns nothing for user B, so the
        # ViewSet's queryset filter would 404 on the detail route; our photo
        # view does the owner-id compare and returns 403 explicitly.
        self.assertEqual(resp.status_code, 403)

    def test_other_user_delete_forbidden(self):
        client_b = APIClient()
        client_b.force_login(self.user_b)
        resp = client_b.delete(f"/api/people/{self.person.id}/photo/")
        self.assertEqual(resp.status_code, 403)
        # And user A's photo paths should still be present.
        self.person.refresh_from_db()
        self.assertIsNotNone(self.person.photo_path)


class ExifStrippingTest(TestCase):
    """Load an image with GPS EXIF, upload, fetch the stored file, assert clean."""

    def setUp(self):
        self.tmp = _temp_volume()
        self.override = override_settings(DATA_VOLUME_PATH=self.tmp)
        self.override.enable()
        self.client = APIClient()
        self.client.get("/api/auth/me/")
        resp = self.client.post(
            "/api/people/",
            {"full_name": "Exif Subject", "relationship_category": "friend"},
            format="json",
        )
        self.person_id = resp.json()["id"]

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _image_with_gps_exif(self) -> bytes:
        """Build a JPEG with GPS coordinates embedded in EXIF."""
        import piexif

        zeroth = {piexif.ImageIFD.Make: b"TestCam", piexif.ImageIFD.Software: b"piexif"}
        gps_ifd = {
            piexif.GPSIFD.GPSVersionID: (2, 0, 0, 0),
            piexif.GPSIFD.GPSLatitudeRef: b"N",
            piexif.GPSIFD.GPSLatitude: ((37, 1), (49, 1), (0, 1)),
            piexif.GPSIFD.GPSLongitudeRef: b"W",
            piexif.GPSIFD.GPSLongitude: ((122, 1), (29, 1), (0, 1)),
        }
        exif_bytes = piexif.dump({"0th": zeroth, "Exif": {}, "GPS": gps_ifd, "1st": {}, "thumbnail": None})

        img = Image.new("RGB", (600, 400), (220, 110, 60))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92, exif=exif_bytes)
        return buf.getvalue()

    def test_exif_is_stripped(self):
        import piexif
        from django.core.files.uploadedfile import SimpleUploadedFile

        original = self._image_with_gps_exif()
        # Sanity-check that the source actually has GPS.
        src_exif = piexif.load(original)
        self.assertTrue(src_exif["GPS"], "fixture image must contain GPS EXIF")

        upload = SimpleUploadedFile("with_gps.jpg", original, content_type="image/jpeg")
        resp = self.client.post(
            f"/api/people/{self.person_id}/photo/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 200, resp.content)

        # Now read back via the serve endpoint and inspect EXIF.
        fetched = self.client.get(f"/api/people/{self.person_id}/photo/")
        self.assertEqual(fetched.status_code, 200)
        served_bytes = b"".join(fetched.streaming_content) if getattr(fetched, "streaming", False) else fetched.content
        out_exif = piexif.load(served_bytes)
        self.assertFalse(out_exif["GPS"], f"GPS should be empty after strip, got {out_exif['GPS']}")
        self.assertFalse(out_exif["0th"], f"0th IFD should be empty, got {out_exif['0th']}")
