import { apiFetch } from "@/lib/api";

export type AssociationCategory = "love" | "family" | "friend" | "work" | "ministry" | "other";

export type AssociationType = {
  id: number;
  name: string;
  inverse_name: string;
  is_symmetric: boolean;
  category: AssociationCategory;
  description: string;
  system: boolean;
  sort_order: number;
};

export type AssociationTypeList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AssociationType[];
};

export function listAssociationTypes() {
  return apiFetch<AssociationTypeList>("/api/association-types/");
}

export type PersonAssociation = {
  id: number;
  from_person: number;
  from_person_name: string;
  to_person: number;
  to_person_name: string;
  association_type: number;
  association_type_name: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string;
  paired_id: number | null;
  created_at: string;
  updated_at: string;
};

export type AssocList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: PersonAssociation[];
};

export function listAssociationsForPerson(personId: number) {
  return apiFetch<AssocList>(`/api/person-associations/?person_id=${personId}`);
}

export function createAssociation(data: {
  from_person: number;
  to_person: number;
  association_type: number;
  started_at?: string;
  ended_at?: string;
  notes?: string;
}) {
  return apiFetch<PersonAssociation>("/api/person-associations/", { method: "POST", body: data });
}

export function deleteAssociation(id: number) {
  return apiFetch<void>(`/api/person-associations/${id}/`, { method: "DELETE" });
}
