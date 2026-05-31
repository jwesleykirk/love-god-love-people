import { apiFetch } from "@/lib/api";

export type RelationshipCategory = "friend" | "family" | "bridge_student" | "other";

export type Person = {
  id: number;
  full_name: string;
  preferred_name: string;
  relationship_category: RelationshipCategory;
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

// Properties (PersonProperty) on a person
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
