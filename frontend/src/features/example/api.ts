import { apiFetch } from "@/lib/api";

export type Note = {
  id: number;
  body: string;
  created_at: string;
};

export type ListNotesResponse = { items: Note[] };

export function listNotes() {
  return apiFetch<ListNotesResponse>("/api/example/");
}

export function createNote(body: string) {
  return apiFetch<{ id: number; body: string }>("/api/example/", {
    method: "POST",
    body: { body },
  });
}
