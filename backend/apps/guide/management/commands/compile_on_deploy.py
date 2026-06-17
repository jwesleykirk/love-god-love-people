from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Recompile today's prayer guides (runs on each deploy)."

    def handle(self, *args, **options):
        from apps.guide.tasks import compile_daily_guides
        from apps.prayer.models import PrayerSession

        compile_daily_guides()

        session = PrayerSession.objects.order_by("-session_date").first()
        if session:
            self.stdout.write(
                f"Latest session {session.session_date}: {session.build_status} "
                f"(clips={'yes' if session.playlist else 'no'}, legacy_audio={'yes' if session.audio_file else 'no'})"
            )
            if session.build_status != "ready":
                raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS("Deploy compile finished."))
