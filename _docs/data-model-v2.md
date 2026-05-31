# Data Model v0.2 — Foundational Graph

> Status: **proposal, awaiting approval**. Once approved, this becomes the basis for migrations and replaces the v0.1 schema. Existing prod data (Phase 1 v0.1) will be wiped.

## Goal

Lock the foundational graph so AI discovery feels like *breaking in a glove, not building one from scratch*. The EAV property bag (`PropertyDef` + `PersonProperty`) stays — that's where AI gets to invent. What sits above it — Person, Organization, person-to-person associations, entry tagging — gets pre-loaded with structure informed by established personal-CRM and social-graph designs.

## Research summary

Five reference points anchor every design call below:

1. **Monica HQ** (open-source personal CRM, Laravel) — closest precedent to LGLP. Models contacts, a `relationship_types` catalog grouped into `relationship_type_groups` (love / family / friend / work), and stores person-to-person edges as **two rows**, one per direction, with the type carrying a `name_reverse_relationship` string. See [Monica API docs · relationshiptypes](https://www.monicahq.com/api/relationshiptypes) and the [DeepWiki overview](https://deepwiki.com/monicahq/monica).
2. **HubSpot CRM** — `Contacts` and `Companies` are separate objects linked by associations. Companies have a `parent`/`child` association label, **single level only**, and a child can only have one parent. See [Add a parent or child company](https://knowledge.hubspot.com/records/add-a-parent-or-child-company).
3. **FOAF + RELATIONSHIP vocabulary** — the semantic-web reference for typed person-to-person edges. `foaf:knows` is the root; `RELATIONSHIP` adds 30+ refinements (`spouseOf`, `parentOf`/`childOf`, `closeFriendOf`, `mentorOf`/`apprenticeTo`, `colleagueOf`, etc.). Each property declares whether it's symmetric and what its inverse is. See [FOAF spec](https://xmlns.com/foaf/spec/) and [RELATIONSHIP vocab](https://vocab.org/relationship/).
4. **Modern personal CRMs** (Folk, Clay, Dex, Cloze) — UI surface is consistent: People + Companies + Interactions, with relationships and tags overlaid. Schemas aren't open-source, but the UI consistency confirms the People + Org + Activity + typed-edges pattern is the prevailing shape. Cited via [Folk's personal-CRM guide](https://www.folk.app/articles/personal-crm-guide).
5. **Hierarchical data in Postgres** — for shallow trees (≤4 levels), the field consensus is **adjacency list with `parent_id` self-reference**, queried with recursive CTEs when needed. Materialized path and nested sets win on deep trees and read-heavy workloads, but pay write complexity. See [Ackee's comparison](https://www.ackee.agency/blog/hierarchical-models-in-postgresql).

---

## Design questions and recommendations

### A. People + Organizations + Membership

The standard pattern across HubSpot, Folk, Clay, and Monica (minus the org piece, which Monica leaves implicit):

- `Person` and `Organization` are sibling top-level objects.
- A `Membership` join links them, carrying **role** and **temporal validity** (`started_at`, `ended_at`).
- Activities/notes tag *either* a Person *or* an Org (or both).

**Recommendation:** adopt this shape. `Person`, `Organization`, `OrganizationMembership` as a typed join, `JournalEntry` taggable to both via two explicit join tables.

### B. Sub-organization hierarchy depth

For LGLP's expected depth (3–4 max: "my small group" → "Bridge ministry" → "Compass Bible Church"), the field default is adjacency list. Recursive CTEs handle ancestor queries cleanly in Postgres 8.4+. Materialized path adds an indexable `path` column for fast prefix queries, but is overkill at this depth.

HubSpot's design constraint is worth noting: they allow only a single level (parent → child, no grandchildren) — too restrictive for ministry hierarchies. Monica doesn't model orgs at all. So we cherry-pick: n-level adjacency list, no artificial depth cap.

**Recommendation:** `Organization.parent_id` self-referential FK. n-level by design. Use Django's `select_related` for shallow walks, a recursive CTE for full-tree queries when needed.

### C. Person-to-person associations: storage shape

The trade-off:

- **Two-row storage** (Monica): one row per direction. `(Karie, spouse_of, Wesley)` and `(Wesley, spouse_of, Karie)`. Pros: trivial query — `SELECT * WHERE from_person_id = X` returns *all* of X's relationships, regardless of edge direction. Cons: double-writes; type definitions must encode inverses so the second row knows what label to wear.
- **One-row storage** (relational graph orthodoxy): a single row per logical edge. Pros: half the rows; no risk of asymmetric drift. Cons: every query needs a UNION on both endpoints; harder for symmetric vs asymmetric semantics to ride along cleanly.

For LGLP's scale (hundreds of people, maybe thousands of edges over time), the query-simplicity win of two-row dominates the storage cost. Monica's precedent has held up well across years and contributors.

**Recommendation:** two-row storage, with an `AssociationType` catalog that declares each type's `inverse_name` and `is_symmetric` flag. On create, the API inserts both rows in a transaction.

### D. Children as full Person records

Monica treats children as full `Contact` records, linked via a `parent_of` / `child_of` relationship. Embedding children as properties of the parent fails as soon as kids grow, get tagged in their own entries, or have their own properties to discover.

**Recommendation:** every child is a `Person`. The parent-child link is a `PersonAssociation` row. The "less properties on children" concern from Wesley is a **prompt-engineering issue**, not a schema one — handled in §H.

### E. `relationship_category` as a separate flat tag

Several personal CRMs carry both:

- A flat single-value tag *on the contact* ("family", "friend", "colleague")
- A typed-edges layer between contacts

They answer different questions:

- The flat tag answers "*how do I relate to this person?*" — useful for filters in lists, single-value, easy to model.
- The edges answer "*how do these two people relate to each other?*" — graph queries, n:m, typed.

They're complementary, not redundant. Monica uses both (groups + relationship types).

**Recommendation:** keep `Person.relationship_category` as a single-value enum on the Person record (renamed from v0.1 with broader options). Add `PersonAssociation` for typed edges between two specific people.

### F. Entry tagging: two join tables vs Django generic relations

Django's `contenttypes` framework can model "tag entry to any object," but the cost is real: querysets need `prefetch_generic_relation` workarounds, joins get ugly, the AI prompt context-building code needs to walk a polymorphic relation, and indexes get less effective.

For exactly two taggable types (Person, Organization), explicit join tables are simpler, faster, and clearer to a future reader.

**Recommendation:** two explicit join tables (`PersonJournalEntry`, `OrganizationJournalEntry`). Revisit if a third taggable entity emerges.

### G. Spouse modeling

Wesley initially asked for "spouse" as a `relationship_category` option alongside "family" and "work." Three reasons to reject that and model spouse as a typed person-to-person edge instead:

1. **FOAF and RELATIONSHIP both treat `spouseOf` as a symmetric edge between two `foaf:Person` entities.** It is a *between-two-people* fact, not a *between-me-and-the-world* fact.
2. **Monica places "spouse" under the "love" relationship-type group** — alongside "partner," "ex-spouse," "engaged to" — and uses the edges layer to model it.
3. **Temporal validity matters.** Spouse has a start (wedding) and a possible end (divorce, death). A category enum can't carry dates; an edge with `started_at` / `ended_at` can.

Karie is already in the system as `relationship_category = family`. Add a `PersonAssociation` row of type `spouse` linking you to her. Both facts coexist: she's family, *and* she's specifically your spouse.

**Recommendation:** `spouse` is an `AssociationType`, not a category. `relationship_category` covers the wider buckets (family, friend, work, bridge_student, neighbor, ministry, other).

### H. Life stage / child-specific properties

Personal CRMs don't fork the schema for minors — the data model is unified. What changes is the **AI prompt context**. If the AI knows a Person's life stage, it won't propose "favorite_bourbon" for a two-year-old.

**Recommendation:** add `Person.life_stage` (enum: `infant` / `toddler` / `child` / `teen` / `young_adult` / `adult` / `senior`, nullable). Add `Person.birthday` (date, nullable) — derivable for adults too. Pass both into the extraction prompt; the prompt instructs the AI to scope proposed properties to the life stage.

---

## Proposed schema (Django)

Tables to **drop** on migration: existing `Person` (in v0.1), `JournalEntry` columns will get adjusted but rows wiped, EAV tables wiped (data, not schema — they get refilled).

### Person

```python
class RelationshipCategory(models.TextChoices):
    FAMILY = "family"
    FRIEND = "friend"
    WORK = "work"
    BRIDGE_STUDENT = "bridge_student"
    NEIGHBOR = "neighbor"
    MINISTRY = "ministry"        # broader than bridge_student — pastor, fellow leader, etc.
    OTHER = "other"

class LifeStage(models.TextChoices):
    INFANT = "infant"            # 0–1
    TODDLER = "toddler"          # 1–3
    CHILD = "child"              # 4–12
    TEEN = "teen"                # 13–17
    YOUNG_ADULT = "young_adult"  # 18–29
    ADULT = "adult"              # 30–64
    SENIOR = "senior"            # 65+

class Person(models.Model):
    owner = FK(User)
    full_name = CharField(200)
    preferred_name = CharField(100, blank=True)
    relationship_category = CharField(choices=RelationshipCategory.choices)
    life_stage = CharField(choices=LifeStage.choices, blank=True, null=True)
    birthday = DateField(null=True, blank=True)
    notes_markdown = TextField(blank=True)
    archived = BooleanField(default=False)
    created_at, updated_at
```

### Organization

```python
class OrgType(models.TextChoices):
    CHURCH = "church"
    MINISTRY = "ministry"        # sub-orgs of churches, e.g., Bridge
    WORK = "work"
    SCHOOL = "school"
    COMMUNITY = "community"
    HOUSEHOLD = "household"      # for "the Kirk family" as a unit
    OTHER = "other"

class Organization(models.Model):
    owner = FK(User)
    name = CharField(200)
    org_type = CharField(choices=OrgType.choices)
    parent = FK("self", null=True, blank=True, on_delete=SET_NULL, related_name="children")
    notes_markdown = TextField(blank=True)
    archived = BooleanField(default=False)
    created_at, updated_at
```

### OrganizationMembership

```python
class OrganizationMembership(models.Model):
    owner = FK(User)
    person = FK(Person, related_name="memberships")
    organization = FK(Organization, related_name="memberships")
    role = CharField(100, blank=True)   # freeform: "elder", "small group leader", "engineer"
    started_at = DateField(null=True, blank=True)
    ended_at = DateField(null=True, blank=True)
    notes = TextField(blank=True)
    created_at, updated_at

    class Meta:
        unique_together = [("owner", "person", "organization", "role")]
```

### AssociationType + PersonAssociation

```python
class AssociationCategory(models.TextChoices):
    FAMILY = "family"
    LOVE = "love"
    FRIEND = "friend"
    WORK = "work"
    MINISTRY = "ministry"
    OTHER = "other"

class AssociationType(models.Model):
    name = CharField(64, unique=True)              # e.g., "spouse_of", "parent_of"
    inverse_name = CharField(64)                   # the name of the row written in the reverse direction
    is_symmetric = BooleanField(default=False)     # spouse_of, sibling_of, close_friend_of = True
    category = CharField(choices=AssociationCategory.choices)
    description = TextField(blank=True)
    system = BooleanField(default=True)            # seeded vs user-created

class PersonAssociation(models.Model):
    owner = FK(User)
    from_person = FK(Person, related_name="associations_from")
    to_person = FK(Person, related_name="associations_to")
    association_type = FK(AssociationType)
    started_at = DateField(null=True, blank=True)
    ended_at = DateField(null=True, blank=True)
    notes = TextField(blank=True)
    created_at, updated_at

    class Meta:
        unique_together = [("owner", "from_person", "to_person", "association_type")]
```

#### Seeded `AssociationType` rows (loaded via data migration)

| name | inverse_name | is_symmetric | category |
|---|---|---|---|
| spouse_of | spouse_of | ✓ | love |
| engaged_to | engaged_to | ✓ | love |
| dating | dating | ✓ | love |
| ex_spouse_of | ex_spouse_of | ✓ | love |
| parent_of | child_of |  | family |
| child_of | parent_of |  | family |
| sibling_of | sibling_of | ✓ | family |
| grandparent_of | grandchild_of |  | family |
| grandchild_of | grandparent_of |  | family |
| in_law_of | in_law_of | ✓ | family |
| step_parent_of | step_child_of |  | family |
| step_child_of | step_parent_of |  | family |
| close_friend_of | close_friend_of | ✓ | friend |
| friend_of | friend_of | ✓ | friend |
| acquaintance_of | acquaintance_of | ✓ | friend |
| neighbor_of | neighbor_of | ✓ | friend |
| colleague_of | colleague_of | ✓ | work |
| manages | reports_to |  | work |
| reports_to | manages |  | work |
| mentor_of | mentee_of |  | work |
| mentee_of | mentor_of |  | work |
| disciples | discipled_by |  | ministry |
| discipled_by | disciples |  | ministry |
| co_small_group_member | co_small_group_member | ✓ | ministry |

Names align with FOAF/RELATIONSHIP vocab where possible; deviations are for snake_case and Wesley-specific ministry terms.

### JournalEntry + tagging

```python
class JournalEntry(models.Model):
    owner = FK(User)
    content_markdown = TextField()
    mood_tag = CharField(64, blank=True)
    extraction_status, extraction_error          # unchanged from v0.1.1
    created_at, updated_at

class PersonJournalEntry(models.Model):
    person = FK(Person)
    entry = FK(JournalEntry)
    class Meta: unique_together = [("person", "entry")]

class OrganizationJournalEntry(models.Model):     # NEW
    organization = FK(Organization)
    entry = FK(JournalEntry)
    class Meta: unique_together = [("organization", "entry")]
```

An entry can tag any combination of people and orgs. Extraction prompts will receive both contexts.

### EAV layer — unchanged

`PropertyDef` and `PersonProperty` keep their v0.1 shape. The extraction prompt grows to know about associations, memberships, life_stage, and birthday — it should not propose properties for facts already representable as first-class records.

Open question for v0.2.1: should `Organization` also support EAV properties? Probably yes eventually (`service_times`, `address`, `meeting_location`), but defer the `OrganizationProperty` table until we feel the friction.

---

## Migration plan

1. **Wipe prod data** — `python manage.py flush --noinput` against the Railway Postgres (Wesley confirmed OK).
2. **Drop and recreate the relevant tables**. Approach: drop the existing `people`, `entries`, `properties`, `future` Django app migration history, write fresh `0001_initial.py` migrations for the new schema. Faster than incremental ALTERs and cleaner since the data is wiped anyway.
3. **Data migration** to seed `AssociationType` rows from the table above.
4. **Adjust extraction prompt v1** to:
   - Receive person context including `life_stage` + `birthday`.
   - Receive org context for any orgs tagged on the entry.
   - Discourage proposing properties for facts that belong in `PersonAssociation` or `OrganizationMembership` ("don't propose `spouse_name` if a `spouse_of` association is provided").
   - For minors, narrow proposed properties to life-stage-appropriate ones.
5. **Frontend rebuild** to surface organizations, memberships, associations on Person detail pages, and add Organization CRUD.

---

## Open questions for Wesley before I migrate

1. **`relationship_category` options on Person.** I've proposed `family / friend / work / bridge_student / neighbor / ministry / other`. Keep all? Drop any? Add any?
2. **Seeded `AssociationType` list.** Anything missing? Any in the list that feels like noise you don't want cluttering the autocomplete?
3. **`Household` as an OrgType.** Lets you treat "the Kirk family" as a taggable unit, so an entry about a family gathering can tag the household instead of every member. Worth it, or overkill?
4. **`OrganizationProperty` (EAV for orgs).** Defer to v0.2.1, or ship in v0.2?
5. **Life stage UI.** Required field on Person, or always optional? My lean: optional (you may not always know).
6. **Anything else you want pre-loaded** that I haven't pattern-matched onto?

Once you've answered, I'll write the migrations + the updated extraction prompt and ship v0.2.

---

## Bibliography

- Monica HQ — [API: Relationship Types](https://www.monicahq.com/api/relationshiptypes) · [API: Relationship Type Groups](https://www.monicahq.com/api/relationshiptypegroups) · [API: Relationships](https://www.monicahq.com/api/relationships) · [DeepWiki overview](https://deepwiki.com/monicahq/monica) · [GitHub repo](https://github.com/monicahq/monica)
- HubSpot — [Add a parent or child company](https://knowledge.hubspot.com/records/add-a-parent-or-child-company) · [Understanding the CRM APIs](https://developers.hubspot.com/docs/guides/crm/understanding-the-crm)
- FOAF Vocabulary Specification — [xmlns.com/foaf/spec/](https://xmlns.com/foaf/spec/)
- RELATIONSHIP vocabulary (Ian Davis, Eric Vitiello Jr) — [vocab.org/relationship/](https://vocab.org/relationship/)
- Folk CRM — [Top 5 Personal CRMs](https://www.folk.app/articles/personal-crm-guide)
- Ackee — [Hierarchical models in PostgreSQL](https://www.ackee.agency/blog/hierarchical-models-in-postgresql)

---

## DECISIONS LOCKED (2026-05-31, with Wesley)

1. **`Person.relationship_category` enum (final):** `family / friend / work / neighbor / ministry / other`. Dropped `bridge_student` — properly expressed via `OrganizationMembership(person, organization=Bridge, role="student")`. Don't duplicate facts.
2. **`AssociationType` seeded list (final):** drop `colleague_of`, `co_small_group_member`, `acquaintance_of` — all recoverable from `OrganizationMembership`. Final list:
   - **love:** spouse_of, engaged_to, dating, ex_spouse_of
   - **family:** parent_of/child_of, sibling_of, grandparent_of/grandchild_of, in_law_of, step_parent_of/step_child_of
   - **friend:** close_friend_of, friend_of, neighbor_of
   - **work:** manages/reports_to, mentor_of/mentee_of
   - **ministry:** disciples/discipled_by
3. **`Household` as `OrgType`** — shipping. Justified by the low-friction-journaling goal: tagging "the Kirks" lowers friction vs. tagging three separate people.
4. **`OrganizationProperty` (EAV for orgs)** — deferred to a later version. Most org facts are first-class fields.
5. **`Person.life_stage`** — optional field. Not required.
6. **`Person.deceased_at`** added (nullable date). Pastoral context, prompt scoping, prayer-cadence respect.
