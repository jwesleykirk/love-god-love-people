import { apiFetch } from "@/lib/api";

export type ExtractionStatus = "pending" | "running" | "done" | "skipped" | "error";

export type JournalEntry = {
  id: number;
  content_markdown: string;
  mood_tag: string;
  person_id_list: number[];
  extraction_status: ExtractionStatus;
  extraction_error: string;
  created_at: string;
  updated_at: string;
};

export type EntryList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: JournalEntry[];
};

export function listEntries(params: { personId?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.personId) qs.set("person_id", String(params.personId));
  const tail = qs.toString();
  return apiFetch<EntryList>(`/api/entries/${tail ? `?${tail}` : ""}`);
}

export function createEntry(data: { content_markdown: string; person_ids: number[] }) {
  return apiFetch<JournalEntry>("/api/entries/", { method: "POST", body: data });
}

export function reExtract(entryId: number) {
  return apiFetch(`/api/entries/${entryId}/re-extract/`, { method: "POST" });
}
