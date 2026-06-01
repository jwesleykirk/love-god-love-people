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
  photo_url: string | null;
  photo_thumbnail_url: string | null;
  photo_updated_at: string | null;
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
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "young_adult", label: "Young adult" },
  { value: "adult", label: "Adult" },
  { value: "senior", label: "Senior" },
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
  property_def_topic: string;
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


/**
 * Photo upload / delete helpers.
 *
 * Note: upload uses multipart/form-data, so we call fetch() directly rather
 * than going through apiFetch (which JSON-encodes the body). CSRF token is
 * read from cookies the same way.
 */
function getCsrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export async function uploadPersonPhoto(id: number, file: File): Promise<Person> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`/api/people/${id}/photo/`, {
    method: "POST",
    headers: { "X-CSRFToken": getCsrfToken() },
    credentials: "same-origin",
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `upload failed (${resp.status})`);
  }
  return (await resp.json()) as Person;
}

export async function deletePersonPhoto(id: number): Promise<Person> {
  return apiFetch<Person>(`/api/people/${id}/photo/`, { method: "DELETE" });
}
