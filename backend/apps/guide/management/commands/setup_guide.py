from django.core.management.base import BaseCommand

from apps.guide.services.narration import generate_liturgy_segments
from apps.guide.schedules import ensure_schedules


class Command(BaseCommand):
    help = "Generate liturgy segments and ensure django-q schedules."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Regenerate existing segments")

    def handle(self, *args, **options):
        ensure_schedules()
        count = generate_liturgy_segments(force=options["force"])
        self.stdout.write(self.style.SUCCESS(f"Generated {count} liturgy segments."))
