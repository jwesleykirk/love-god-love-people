import { apiFetch } from "@/lib/api";

export type Flashcard = {
  id: number;
  person_property_id: number;
  due_at: string | null;
  due: boolean;
  interval_days: number;
  person_id: number;
  person_name: string;
  person_category: string;
  property_name: string;
  property_label: string;
  property_topic: string;
  prompt: string;
  answer: string;
};

export type FlashcardQueue = {
  due: Flashcard[];
  upcoming: Flashcard[];
  stats: { due_count: number; deck_count: number; upcoming_count: number };
  fetched_at: string;
};

export function fetchFlashcardQueue() {
  return apiFetch<FlashcardQueue>("/api/flashcards/queue/");
}

export function reviewFlashcard(memoId: number, rating: "again" | "good" | "easy") {
  return apiFetch(`/api/flashcards/${memoId}/review/`, {
    method: "POST",
    body: { rating },
  });
}

export function suspendFlashcard(memoId: number) {
  return apiFetch(`/api/flashcards/${memoId}/suspend/`, { method: "POST" });
}
