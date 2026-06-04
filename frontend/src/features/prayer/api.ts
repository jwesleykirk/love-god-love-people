import { apiFetch } from "@/lib/api";

export type PrayerFrequency = "daily" | "weekly" | "monthly" | "none";

export type PrayerSegment = {
  person_id: number;
  person_name: string;
  full_name: string;
  relationship_category: string;
  frequency: PrayerFrequency;
  context_lines: string[];
  guided_text: string;
  ai_generated: boolean;
};

export type PrayerSession = {
  intro: string;
  pause_seconds_default: number;
  segments: PrayerSegment[];
  stats: {
    due_count: number;
    scheduled_count: number;
    estimated_minutes: number;
  };
  ai_enabled: boolean;
  fetched_at: string;
};

/** Lightweight queue for Home hero stats. */
export type PrayerQueue = {
  due: Array<{
    person_id: number;
    person_name: string;
    prompts: string[];
  }>;
  stats: {
    due_count: number;
    scheduled_count: number;
    estimated_minutes: number;
  };
  fetched_at: string;
};

export type PrayerScheduleRow = {
  person_id: number;
  person_name: string;
  relationship_category: string;
  frequency: PrayerFrequency;
  last_prayed_at: string | null;
  next_due_at: string | null;
};

const PAUSE_KEY = "prayer_pause_seconds";

export function getPauseSeconds(): number {
  const raw = localStorage.getItem(PAUSE_KEY);
  const n = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(n) ? Math.max(10, Math.min(100, n)) : 30;
}

export function setPauseSeconds(seconds: number) {
  localStorage.setItem(PAUSE_KEY, String(Math.max(10, Math.min(100, seconds))));
}

export function fetchPrayerQueue() {
  return apiFetch<PrayerQueue>("/api/prayer/queue/");
}

export function fetchPrayerSession(pauseSeconds?: number) {
  const pause = pauseSeconds ?? getPauseSeconds();
  return apiFetch<PrayerSession>(`/api/prayer/session/?pause_seconds=${pause}`);
}

export function completePrayerSession(personIds: number[]) {
  return apiFetch<{ marked_person_ids: number[]; count: number }>(
    "/api/prayer/session/complete/",
    { method: "POST", body: { person_ids: personIds } },
  );
}

export function fetchPrayerSchedules() {
  return apiFetch<{ schedules: PrayerScheduleRow[] }>("/api/prayer/schedules/");
}

export function updatePrayerSchedule(personId: number, frequency: PrayerFrequency) {
  return apiFetch(`/api/prayer/schedules/${personId}/`, {
    method: "PATCH",
    body: { frequency },
  });
}

export const PRAYER_FREQUENCIES: Array<{ value: PrayerFrequency; label: string }> = [
  { value: "none", label: "Not scheduled" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
