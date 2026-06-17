from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.guide.services.scheduler import select_topics_for_session
from apps.guide.services.segments import PAUSE_AFTER_SEGMENT_KEYS, POST_DBR_KEYS
from apps.prayer.models import PrayerTopic, TargetFrequency


class GuideReadinessOpsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_post_compile_requires_ops_token(self):
        response = self.client.post("/api/guide/readiness/")
        self.assertEqual(response.status_code, 403)

    @override_settings(GUIDE_OPS_TOKEN="test-token")
    @patch("apps.guide.tasks.compile_daily_guides")
    def test_post_compile_accepts_valid_ops_token(self, compile_daily_guides):
        response = self.client.post(
            "/api/guide/readiness/",
            HTTP_X_GUIDE_OPS_TOKEN="test-token",
        )
        compile_daily_guides.assert_called_once()
        self.assertIn(response.status_code, {200, 503})


class SegmentPauseTests(TestCase):
    def test_reflection_prompts_pause_after_playback(self):
        reflection_keys = {
            "goodness_truth_beauty",
            "reading_challenges",
            "help_today",
        }
        self.assertEqual(PAUSE_AFTER_SEGMENT_KEYS, reflection_keys)
        for key in PAUSE_AFTER_SEGMENT_KEYS:
            self.assertIn(key, POST_DBR_KEYS)


class SchedulerTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")

    def test_daily_always_included(self):
        from datetime import date

        t = PrayerTopic.objects.create(
            owner=self.user,
            topic_text="health",
            target_frequency=TargetFrequency.DAILY,
            narration_text="Pray for health",
        )
        selected = select_topics_for_session(self.user, date.today())
        self.assertIn(t, selected)


class PlaylistBuilderTests(TestCase):
    def setUp(self):
        import tempfile

        from django.contrib.auth import get_user_model

        from apps.dbr.models import ReadingDay
        from apps.guide.services.build_log import BuildLogger

        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")
        self.tmpdir = tempfile.mkdtemp()
        self.reading = ReadingDay.objects.create(
            guid="test-guid",
            title="Genesis 1",
            pub_date=timezone.now(),
            audio_cached_path="",
        )
        self.log = BuildLogger()

    @patch("apps.guide.services.playlist.segment_path")
    @patch("apps.guide.services.playlist.ensure_silence")
    def test_playlist_orders_segments_dbr_topics(self, ensure_silence, segment_path_mock):
        from pathlib import Path

        from apps.guide.services.playlist import build_session_playlist
        from apps.prayer.models import PrayerTopic

        segment_path_mock.return_value = Path(self.tmpdir) / "segment.mp3"
        (segment_path_mock.return_value).write_bytes(b"mp3")
        ensure_silence.return_value = Path(self.tmpdir) / "silence.mp3"

        dbr_file = Path(self.tmpdir) / "dbr.mp3"
        dbr_file.write_bytes(b"mp3")
        self.reading.audio_cached_path = str(dbr_file)
        self.reading.save()

        topic = PrayerTopic.objects.create(
            owner=self.user,
            topic_text="health",
            narration_text="Pray for health",
            audio_file=str(Path(self.tmpdir) / "topic.mp3"),
        )
        Path(topic.audio_file).write_bytes(b"mp3")

        playlist = build_session_playlist(self.reading, [topic], self.log)

        kinds = [c["kind"] for c in playlist]
        self.assertEqual(kinds[0], "segment")
        self.assertIn("dbr", kinds)
        self.assertIn("topic", kinds)
        self.assertIn("pause", kinds)
        topic_clips = [c for c in playlist if c["kind"] == "topic"]
        self.assertEqual(topic_clips[0]["topic_id"], topic.id)
        self.assertTrue(all(c["audio_url"].startswith("/api/guide/audio/") for c in playlist))


class SessionCompilerTests(TestCase):
    def setUp(self):
        import tempfile

        from django.contrib.auth import get_user_model

        from apps.dbr.models import ReadingDay

        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")
        self.tmpdir = tempfile.mkdtemp()
        self.reading_audio = f"{self.tmpdir}/dbr.mp3"
        with open(self.reading_audio, "wb") as f:
            f.write(b"mp3")
        ReadingDay.objects.create(
            guid="compile-guid",
            title="Genesis 1",
            pub_date=timezone.now(),
            audio_cached_path=self.reading_audio,
        )

    @patch("apps.guide.services.compiler._run_ffmpeg_concat")
    @patch("apps.guide.services.compiler.session_audio_path")
    @patch("apps.guide.services.compiler.ensure_silence")
    @patch("apps.guide.services.compiler.segment_path")
    @patch("apps.guide.services.compiler.topic_audio_path")
    @patch("apps.guide.services.compiler.shutil.which")
    def test_compile_stitches_single_session_audio(
        self,
        which,
        topic_audio_path_mock,
        segment_path_mock,
        ensure_silence,
        session_audio_path_mock,
        run_ffmpeg_concat,
    ):
        from pathlib import Path

        from apps.guide.services.compiler import compile_session_for_owner
        from apps.prayer.models import PrayerSession

        which.return_value = "/usr/bin/ffmpeg"
        segment_file = Path(self.tmpdir) / "segment.mp3"
        segment_file.write_bytes(b"mp3")
        segment_path_mock.return_value = segment_file
        silence_file = Path(self.tmpdir) / "silence.mp3"
        silence_file.write_bytes(b"mp3")
        ensure_silence.return_value = silence_file
        topic_audio_path_mock.return_value = Path(self.tmpdir) / "canonical-topic.mp3"
        output = Path(self.tmpdir) / "session.mp3"
        session_audio_path_mock.return_value = output

        def write_output(_manifest, output_path):
            output_path.write_bytes(b"stitched")

        run_ffmpeg_concat.side_effect = write_output

        topic_audio = Path(self.tmpdir) / "topic.mp3"
        topic_audio.write_bytes(b"mp3")
        PrayerTopic.objects.create(
            owner=self.user,
            topic_text="health",
            narration_text="Pray for health",
            audio_file=str(topic_audio),
            target_frequency=TargetFrequency.DAILY,
        )
        PrayerSession.objects.create(
            owner=self.user,
            session_date=timezone.localdate(),
            playlist=[{"id": "old-playlist-clip"}],
        )

        session = compile_session_for_owner(self.user, timezone.localdate())

        self.assertEqual(session.audio_file, str(output))
        self.assertEqual(session.playlist, [])
        self.assertTrue(output.exists())
        run_ffmpeg_concat.assert_called_once()
