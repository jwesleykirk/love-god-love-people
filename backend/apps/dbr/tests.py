from django.test import TestCase

from .models import ReadingDay


class ReadingDayModelTests(TestCase):
    def test_create_reading_day(self):
        ReadingDay.objects.create(guid="test-guid", title="June 16")
        self.assertEqual(ReadingDay.objects.count(), 1)
