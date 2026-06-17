from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run DBR ingest and compile today's guide (deploy smoke test)."

    def handle(self, *args, **options):
        from apps.guide.tasks import compile_daily_guides, dbr_ingest_task
        from apps.prayer.models import PrayerSession

        count = dbr_ingest_task()
        self.stdout.write(f"DBR ingest: {count} items")

        compile_daily_guides()

        session = PrayerSession.objects.order_by("-session_date").first()
        if session:
            self.stdout.write(
                f"Latest session {session.session_date}: {session.build_status} "
                f"(clips={'yes' if session.playlist else 'no'}, legacy_audio={'yes' if session.audio_file else 'no'})"
            )
            if session.build_status != "ready":
                raise SystemExit(1)
        else:
            self.stdout.write(self.style.ERROR("No PrayerSession created"))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS("Guide smoke test passed."))
