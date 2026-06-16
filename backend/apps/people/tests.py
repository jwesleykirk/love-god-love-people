from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Child, Person


class ChildAgeTests(TestCase):
    def test_birthdate_age(self):
        from datetime import date

        child = Child(name="Sam", birthdate=date(2015, 6, 1))
        from apps.people.utils import child_age_display

        self.assertIn("years old", child_age_display(child, today=date(2026, 6, 16)))

    def test_birth_year_approximate(self):
        from datetime import date

        child = Child(name="Sam", birth_year=2015)
        from apps.people.utils import child_age_display

        self.assertTrue(child_age_display(child, today=date(2026, 6, 16)).startswith("~"))


class PersonApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")

    def test_create_person(self):
        self.client.force_login(self.user)
        response = self.client.post(
            "/api/people/",
            data={
                "name": "Eric",
                "life_stage": "single",
                "children": [{"name": "Kid", "birth_year": 2020}],
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Person.objects.count(), 1)
        self.assertEqual(Child.objects.count(), 1)
