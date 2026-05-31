from django.test import TestCase

from .models import Note


class NoteModelTests(TestCase):
    def test_creates_note(self):
        Note.objects.create(body="hello")
        self.assertEqual(Note.objects.count(), 1)
