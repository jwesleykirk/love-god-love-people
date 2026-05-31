import { apiFetch } from "@/lib/api";

export type RelationshipCategory = "family" | "friend" | "work" | "neighbor" | "ministry" | "other";

export type LifeStage = "infant" | "toddler" | "child" | "teen" | "young_adult" | "adult" | "senior" | "";

export type Person = {
  id: number;
  full_name: string;
  preferred_name: string;
  relationship_category: RelationshipCategory;
  life_stage: LifeStage;
  birthday: string | null;
  deceased_at: string | null;
  notes_markdown: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type PersonList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Person[];
};

export const RELATIONSHIP_CATEGORIES: Array<{ value: RelationshipCategory; label: string }> = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "work", label: "Work" },
  { value: "neighbor", label: "Neighbor" },
  { value: "ministry", label: "Ministry" },
  { value: "other", label: "Other" },
];

export const LIFE_STAGES: Array<{ value: LifeStage; label: string }> = [
  { value: "", label: "—" },
  { value: "infant", label: "Infant (0–1)" },
  { value: "toddler", label: "Toddler (1–3)" },
  { value: "child", label: "Child (4–12)" },
  { value: "teen", label: "Teen (13–17)" },
  { value: "young_adult", label: "Young adult (18–29)" },
  { value: "adult", label: "Adult (30–64)" },
  { value: "senior", label: "Senior (65+)" },
];

export function listPeople(params: { q?: string; category?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  const tail = qs.toString();
  return apiFetch<PersonList>(`/api/people/${tail ? `?${tail}` : ""}`);
}
export function getPerson(id: number) {
  return apiFetch<Person>(`/api/people/${id}/`);
}
export function createPerson(data: Partial<Person>) {
  return apiFetch<Person>("/api/people/", { method: "POST", body: data });
}
export function updatePerson(id: number, data: Partial<Person>) {
  return apiFetch<Person>(`/api/people/${id}/`, { method: "PATCH", body: data });
}

export type PersonProperty = {
  id: number;
  person: number;
  person_name: string;
  property_def: number;
  property_def_name: string;
  value_text: string;
  ai_confidence: number;
  source_entry: number | null;
  status: "pending_review" | "approved" | "rejected" | "edited";
  created_at: string;
};
export type PersonPropertyList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: PersonProperty[];
};
export function listPersonProperties(personId: number) {
  return apiFetch<PersonPropertyList>(`/api/properties/?person_id=${personId}`);
}
