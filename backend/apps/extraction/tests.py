"""Extraction unit tests (v0.3).

Two layers:
1. Persistence tests: feed a mocked LLM JSON output through _persist_extraction
   and assert the right rows land in PersonProperty / PropertyDef / ProposedPerson.
2. Prompt structural tests: assert v2.1 contains the uncertainty discipline,
   plural-pronoun rules, and positive worked examples for loves_music and
   religion. The Alfonso Morales paragraph is a documented negative
   fixture — the live-extraction verification happens at deploy time.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.entries.models import JournalEntry, PersonJournalEntry
from apps.people.models import Person, RelationshipCategory
from apps.properties.models import (
    PersonProperty,
    PersonPropertyStatus,
    PropertyDef,
)

from .models import ProposedPerson, ProposedPersonStatus
from .prompts import v2_1 as prompt_v2
from .tasks import _persist_extraction


# Verbatim from Wesley's brief — the canonical uncertainty-discipline fixture.
ALFONSO_PARAGRAPH = (
    "Alfonso Morales is one of my coworkers him and his wife Kimberly have "
    "a son named Jack was about seven or eight. They love music and Alfonso "
    "and Kimberly our diehard members of the Dave Matthews Band band club. "
    "Their son Jack is in a Lutheran school and I know they are at least "
    "nominally Christian but I've never heard Alfonso pray during our prayer "
    "meeting openers so I'm not sure how devout they are."
)


class PromptV2StructureTests(TestCase):
    """The prompt itself encodes the rules. If these assertions fail, the prompt regressed."""

    def test_version_is_v2_1(self):
        self.assertEqual(prompt_v2.VERSION, "v2.1")

    def test_uncertainty_discipline_present(self):
        s = prompt_v2.SYSTEM_PROMPT.lower()
        self.assertIn("uncertainty", s)
        self.assertIn("never heard", s, "Alfonso negative example should be embedded as a guard.")
        self.assertIn("speculation", s)

    def test_plural_pronoun_rule_present(self):
        s = prompt_v2.SYSTEM_PROMPT.lower()
        self.assertIn("plural", s)
        self.assertIn("never combine", s)

    def test_proposed_persons_schema_present(self):
        self.assertIn("proposed_persons", prompt_v2.SYSTEM_PROMPT)
        self.assertIn("proposed_associations", prompt_v2.SYSTEM_PROMPT)
        self.assertIn("proposed_properties", prompt_v2.SYSTEM_PROMPT)

    def test_first_class_records_negative_list_present(self):
        s = prompt_v2.SYSTEM_PROMPT
        # All four common "redundant property" cases must be in the prompt.
        for needle in ["spouse_name", "parent_name", "church", "manager"]:
            self.assertIn(needle, s, f"prompt should explicitly forbid extracting '{needle}'")

    def test_standardized_names_present(self):
        s = prompt_v2.SYSTEM_PROMPT
        for name in ["loves_music", "current_school_type", "current_school_name", "approximate_birth_year", "religion"]:
            self.assertIn(name, s, f"prompt should mention standardized property '{name}'")

    def test_loves_music_positive_worked_example_present(self):
        s = prompt_v2.SYSTEM_PROMPT.lower()
        self.assertIn("positive worked examples", s)
        self.assertIn("they love music", s)
        self.assertIn("loves_music=true", s)

    def test_religion_positive_worked_example_present(self):
        s = prompt_v2.SYSTEM_PROMPT.lower()
        self.assertIn("at least nominally christian", s)
        self.assertIn("religion=nominal christian", s)
        self.assertIn("different attribute", s)

    def test_alfonso_paragraph_builds_user_prompt(self):
        # Just verifies the prompt builder runs cleanly with realistic input —
        # the actual AI output shape is verified end-to-end at deploy time.
        user_prompt = prompt_v2.build_user_prompt(
            ALFONSO_PARAGRAPH,
            persons_context=[{"person_id": 1, "name": "Alfonso Morales"}],
            organizations_context=[],
            available_association_types=[{"name": "spouse_of"}],
        )
        self.assertIn("Alfonso Morales", user_prompt)


class ExistingPropertyPersistenceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(username="wesley@local", email="wesley@local")
        self.person = Person.objects.create(
            owner=self.user,
            full_name="Karie",
            relationship_category=RelationshipCategory.FAMILY,
        )
        self.entry = JournalEntry.objects.create(
            owner=self.user,
            content_markdown="Karie's mom Linda has a birthday in April.",
        )
        PersonJournalEntry.objects.create(person=self.person, entry=self.entry)

    def test_persist_new_property_proposal(self):
        result = {
            "narrative_only": False,
            "existing_property_values": [],
            "new_property_proposals": [
                {
                    "person_id": self.person.pk,
                    "proposed_name": "mother_name",
                    "proposed_description": "First name of this person's mother.",
                    "proposed_data_type": "text",
                    "value": "Linda",
                    "confidence": 0.9,
                }
            ],
            "proposed_persons": [],
        }
        _persist_extraction(self.entry, result)
        self.assertEqual(PropertyDef.objects.count(), 1)
        self.assertEqual(PersonProperty.objects.count(), 1)
        pp = PersonProperty.objects.first()
        self.assertEqual(pp.status, PersonPropertyStatus.PENDING_REVIEW)
        self.assertEqual(pp.prompt_version, "v2.1")


class ProposedPersonsPersistenceTests(TestCase):
    """Verifies that proposed_persons in the AI output land as ProposedPerson rows."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(username="wesley@local", email="wesley@local")
        self.alfonso = Person.objects.create(
            owner=self.user,
            full_name="Alfonso Morales",
            relationship_category=RelationshipCategory.WORK,
        )
        self.entry = JournalEntry.objects.create(
            owner=self.user, content_markdown=ALFONSO_PARAGRAPH
        )
        PersonJournalEntry.objects.create(person=self.alfonso, entry=self.entry)

    def test_persist_proposed_kimberly(self):
        # Simulated AI output reflecting the EXPECTED v2 behavior on the
        # Alfonso paragraph. CRITICAL: no devotion property anywhere.
        result = {
            "narrative_only": False,
            "existing_property_values": [],
            "new_property_proposals": [
                {
                    "person_id": self.alfonso.pk,
                    "proposed_name": "loves_music",
                    "proposed_description": "Whether the person loves music.",
                    "proposed_data_type": "boolean",
                    "value": "true",
                    "confidence": 0.85,
                },
                {
                    "person_id": self.alfonso.pk,
                    "proposed_name": "religion",
                    "proposed_description": "Religious self-identification.",
                    "proposed_data_type": "text",
                    "value": "nominal Christian",
                    "confidence": 0.7,
                },
            ],
            "proposed_persons": [
                {
                    "full_name": "Kimberly Morales",
                    "preferred_name": "",
                    "life_stage": "adult",
                    "confidence": 0.9,
                    "proposed_associations": [
                        {"to_person_id": self.alfonso.pk, "association_type": "spouse_of"}
                    ],
                    "proposed_properties": [
                        {"property_name": "loves_music", "value": "true",
                         "data_type": "boolean", "confidence": 0.85},
                    ],
                },
                {
                    "full_name": "Jack Morales",
                    "preferred_name": "",
                    "life_stage": "child",
                    "confidence": 0.85,
                    "proposed_associations": [
                        {"to_person_id": self.alfonso.pk, "association_type": "child_of"}
                    ],
                    "proposed_properties": [
                        {"property_name": "current_school_type", "value": "Lutheran",
                         "data_type": "text", "confidence": 0.95},
                        {"property_name": "approximate_birth_year", "value": "2017-2018",
                         "data_type": "text", "confidence": 0.7},
                    ],
                },
            ],
        }
        _persist_extraction(self.entry, result)

        proposals = ProposedPerson.objects.filter(owner=self.user).order_by("full_name")
        self.assertEqual(proposals.count(), 2)
        names = sorted(p.full_name for p in proposals)
        self.assertEqual(names, ["Jack Morales", "Kimberly Morales"])

        jack = proposals.get(full_name="Jack Morales")
        self.assertEqual(jack.life_stage, "child")
        self.assertEqual(jack.status, ProposedPersonStatus.PENDING_REVIEW)
        payload_props = {p["property_name"] for p in jack.proposal_payload["properties"]}
        self.assertIn("current_school_type", payload_props)
        self.assertIn("approximate_birth_year", payload_props)

        # CRITICAL: zero devotion-related properties anywhere.
        all_property_names = set()
        for pp in PersonProperty.objects.all():
            all_property_names.add(pp.property_def.name)
        for proposal in proposals:
            for prop in proposal.proposal_payload.get("properties", []):
                all_property_names.add(prop["property_name"])

        devotion_keywords = ["devout", "devotion", "pray", "prays", "praying", "prayerful"]
        for name in all_property_names:
            for kw in devotion_keywords:
                self.assertNotIn(kw, name.lower(), f"Devotion-related property '{name}' leaked through — prompt regressed")


class CreateProposedPersonTests(TestCase):
    """End-to-end materialization of a ProposedPerson → Person."""

    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.client.get("/api/auth/me/")
        # Create Alfonso as a real Person
        resp = self.client.post(
            "/api/people/",
            {"full_name": "Alfonso Morales", "relationship_category": "work"},
            format="json",
        )
        self.alfonso_id = resp.json()["id"]
        # Manually create a ProposedPerson for Kimberly
        from django.contrib.auth import get_user_model
        user = get_user_model().objects.get(username="wesley@local")
        entry = JournalEntry.objects.create(owner=user, content_markdown="…")
        self.proposal = ProposedPerson.objects.create(
            owner=user,
            source_entry=entry,
            full_name="Kimberly Morales",
            life_stage="adult",
            ai_confidence=0.9,
            proposal_payload={
                "associations": [
                    {"to_person_id": self.alfonso_id, "association_type": "spouse_of"}
                ],
                "properties": [
                    {"property_name": "loves_music", "value": "true",
                     "data_type": "boolean", "confidence": 0.85},
                ],
            },
            prompt_version="v2.1",
        )

    def test_create_person_materializes_associations_and_properties(self):
        resp = self.client.post(
            f"/api/proposed-persons/{self.proposal.pk}/create-person/",
            {"relationship_category": "family"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertEqual(body["status"], "created")
        # Person exists
        kim = Person.objects.get(full_name="Kimberly Morales")
        self.assertEqual(kim.life_stage, "adult")
        self.assertEqual(kim.relationship_category, "family")
        # Spouse association both directions
        from apps.associations.models import PersonAssociation
        rows = PersonAssociation.objects.filter(from_person=kim)
        self.assertGreaterEqual(rows.count(), 1)
        # PersonProperty materialized
        pp = PersonProperty.objects.get(person=kim, property_def__name="loves_music")
        self.assertEqual(pp.value_text, "true")
        self.assertEqual(pp.status, PersonPropertyStatus.PENDING_REVIEW)


class SupersessionSignalTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(username="wesley@local", email="wesley@local")
        self.person = Person.objects.create(
            owner=self.user,
            full_name="Jack Morales",
            relationship_category=RelationshipCategory.OTHER,
        )
        self.pdef = PropertyDef.objects.create(
            owner=self.user,
            name="approximate_birth_year",
            description="auto-seeded",
            data_type_hint="text",
        )
        self.pp = PersonProperty.objects.create(
            owner=self.user,
            person=self.person,
            property_def=self.pdef,
            value_text="2017-2018",
            status=PersonPropertyStatus.APPROVED,
        )

    def test_setting_birthday_supersedes_approximate(self):
        self.person.birthday = "2017-08-04"
        self.person.save()
        self.pp.refresh_from_db()
        self.assertEqual(self.pp.status, PersonPropertyStatus.SUPERSEDED)
        self.assertIsNotNone(self.pp.reviewed_at)

    def test_unsetting_birthday_does_not_resurrect(self):
        # Saving without a birthday leaves status alone.
        self.person.full_name = "Jack M. Morales"
        self.person.save()
        self.pp.refresh_from_db()
        self.assertEqual(self.pp.status, PersonPropertyStatus.APPROVED)
