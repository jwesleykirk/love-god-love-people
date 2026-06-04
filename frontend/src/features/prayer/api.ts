import { apiFetch } from "@/lib/api";

export type PrayerFrequency = "daily" | "weekly" | "monthly" | "none";

export type PrayerCard = {
  person_id: number;
  person_name: string;
  full_name: string;
  relationship_category: string;
  frequency: PrayerFrequency;
  last_prayed_at: string | null;
  next_due_at: string | null;
  prompts: string[];
};

export type PrayerQueue = {
  due: PrayerCard[];
  stats: { due_count: number; scheduled_count: number };
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

export function fetchPrayerQueue() {
  return apiFetch<PrayerQueue>("/api/prayer/queue/");
}

export function fetchPrayerSchedules() {
  return apiFetch<{ schedules: PrayerScheduleRow[] }>("/api/prayer/schedules/");
}

export function markPrayed(personId: number) {
  return apiFetch(`/api/prayer/${personId}/prayed/`, { method: "POST" });
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
