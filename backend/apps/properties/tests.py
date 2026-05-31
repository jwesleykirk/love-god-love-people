from django.test import TestCase
from rest_framework.test import APIClient

from apps.people.models import Person, RelationshipCategory

from .models import PersonProperty, PersonPropertyStatus, PropertyDef


class PropertyReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.get("/api/auth/me/")
        person_resp = self.client.post(
            "/api/people/",
            {"full_name": "Test", "relationship_category": RelationshipCategory.FRIEND},
            format="json",
        )
        self.person_id = person_resp.json()["id"]

    def test_approve_property_value(self):
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(username="wesley@local")
        person = Person.objects.get(pk=self.person_id)
        pdef = PropertyDef.objects.create(owner=user, name="birthday")
        pp = PersonProperty.objects.create(
            owner=user,
            person=person,
            property_def=pdef,
            value_text="1996-12-28",
            status=PersonPropertyStatus.PENDING_REVIEW,
        )
        resp = self.client.post(f"/api/properties/{pp.pk}/approve/")
        self.assertEqual(resp.status_code, 200, resp.content)
        pp.refresh_from_db()
        self.assertEqual(pp.status, PersonPropertyStatus.APPROVED)
