import { apiFetch } from "@/lib/api";

// ----- Pending Property Values -----

export type PendingValue = {
  id: number;
  person_id: number;
  person_name: string;
  property_def_id: number;
  property_def_name: string;
  value_text: string;
  ai_confidence: number;
  created_at: string;
};

export type PendingEntryGroup = {
  entry_id: number | null;
  entry_content: string;
  entry_created_at: string | null;
  prompt_version: string;
  model: string;
  values: PendingValue[];
};

export type ExtractionError = {
  entry_id: number;
  entry_content: string;
  entry_created_at: string;
  error: string;
};

export type PendingResponse = {
  entries: PendingEntryGroup[];
  errors: ExtractionError[];
  fetched_at: string;
};

export function getPending() {
  return apiFetch<PendingResponse>("/api/review/pending-values/");
}

export function approveProperty(id: number) {
  return apiFetch(`/api/properties/${id}/approve/`, { method: "POST" });
}
export function rejectProperty(id: number) {
  return apiFetch(`/api/properties/${id}/reject/`, { method: "POST" });
}
export function editPropertyValue(id: number, value_text: string) {
  return apiFetch(`/api/properties/${id}/edit_value/`, {
    method: "POST",
    body: { value_text },
  });
}

// ----- New Property Definitions -----

export type PropertyDef = {
  id: number;
  name: string;
  description: string;
  data_type_hint: "text" | "date" | "integer" | "boolean" | "enum" | "url";
  topic: string;
  status: "active" | "archived" | "merged";
  first_proposed_at: string;
  first_proposed_from_entry: number | null;
  ai_confidence_on_creation: number;
  merged_into: number | null;
  usage_count: number;
  reviewed_at: string | null;
};

export type PropertyDefList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: PropertyDef[];
};

export function listNewPropertyDefs() {
  return apiFetch<PropertyDefList>("/api/property-defs/?needs_review=1");
}

export function listActivePropertyDefs() {
  return apiFetch<PropertyDefList>("/api/property-defs/?status=active");
}

export function keepPropertyDef(id: number) {
  return apiFetch(`/api/property-defs/${id}/keep/`, { method: "POST" });
}
export function archivePropertyDef(id: number) {
  return apiFetch(`/api/property-defs/${id}/archive/`, { method: "POST" });
}
export function renamePropertyDef(id: number, name: string, description?: string) {
  const body: Record<string, string> = { name };
  if (description !== undefined) body.description = description;
  return apiFetch(`/api/property-defs/${id}/`, { method: "PATCH", body });
}
export function mergePropertyDef(id: number, target_id: number) {
  return apiFetch(`/api/property-defs/${id}/merge/`, {
    method: "POST",
    body: { target_id },
  });
}

// ----- Proposed Persons (v0.3) -----

export type ProposedPerson = {
  id: number;
  full_name: string;
  preferred_name: string;
  life_stage: string;
  ai_confidence: number;
  proposal_payload: {
    associations?: Array<{ to_person_id: number; association_type: string }>;
    properties?: Array<{ property_name: string; value: string; data_type: string; confidence: number }>;
  };
  prompt_version: string;
  model: string;
  status: "pending_review" | "created" | "rejected";
  resolved_to_person: number | null;
  source_entry: number;
  source_entry_text: string;
  source_entry_created_at: string;
  created_at: string;
  reviewed_at: string | null;
};

export type ProposedPersonList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProposedPerson[];
};

export function listProposedPersons() {
  return apiFetch<ProposedPersonList>("/api/proposed-persons/?status=pending_review");
}

export function createProposedPerson(id: number, overrides: { full_name?: string; preferred_name?: string; relationship_category?: string }) {
  return apiFetch<ProposedPerson>(`/api/proposed-persons/${id}/create-person/`, {
    method: "POST",
    body: overrides,
  });
}

export function rejectProposedPerson(id: number) {
  return apiFetch<ProposedPerson>(`/api/proposed-persons/${id}/reject/`, { method: "POST" });
}

// ----- PersonProperty history (v0.3) -----

export type PersonPropertyHistoryEntry = {
  id: number;
  date: string;
  type: "+" | "~" | "-";  // create / update / delete
  change_reason: string;
  value_text: string;
  status: string;
};

export function getPersonPropertyHistory(id: number) {
  return apiFetch<{ history: PersonPropertyHistoryEntry[] }>(`/api/properties/${id}/history/`);
}


export function updatePropertyDefTopic(id: number, topic: string) {
  return apiFetch(`/api/property-defs/${id}/`, { method: "PATCH", body: { topic } });
}
