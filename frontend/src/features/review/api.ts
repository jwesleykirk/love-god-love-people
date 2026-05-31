import { apiFetch } from "@/lib/api";

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
