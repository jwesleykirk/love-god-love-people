import type { Person, Group, PrayerImportSuggestion, PrayerTopic, PrayerSession, GuideSettings } from "./types";
import { apiFetch } from "@/lib/api";

type Paginated<T> = { results: T[] };

function unwrapList<T>(data: T[] | Paginated<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export function fetchTodayGuide() {
  return apiFetch<PrayerSession | { session_date: string; build_status: string; detail?: string }>(
    "/api/guide/today/",
  );
}

export function buildGuideNow() {
  return apiFetch<PrayerSession>("/api/guide/build/", { method: "POST" });
}

export function fetchGuideSettings() {
  return apiFetch<GuideSettings>("/api/guide/settings/");
}

export function regenerateSegments() {
  return apiFetch<{ ok: boolean }>("/api/guide/segments/regenerate/", { method: "POST" });
}

export function regenerateTodaysGuide() {
  return apiFetch<{ ok: boolean; message: string; build_status: string }>(
    "/api/guide/regenerate/",
    { method: "POST" },
  );
}

export function sessionAmen(sessionId: number) {
  return apiFetch<{ ok: boolean }>(`/api/prayer/sessions/${sessionId}/amen/`, { method: "POST" });
}

export function sessionTopicAction(
  sessionId: number,
  topicId: number,
  action: "answered" | "record_answer",
  answer_note?: string,
) {
  return apiFetch<{ ok: boolean }>(
    `/api/prayer/sessions/${sessionId}/topics/${topicId}/action/`,
    { method: "POST", body: { action, answer_note } },
  );
}

export function fetchPeople() {
  return apiFetch<Person[] | Paginated<Person>>("/api/people/").then(unwrapList);
}

export function fetchPerson(id: number) {
  return apiFetch<Person>(`/api/people/${id}/`);
}

export function savePerson(data: Partial<Person> & { member_ids?: never }, id?: number) {
  if (id) {
    return apiFetch<Person>(`/api/people/${id}/`, { method: "PATCH", body: data });
  }
  return apiFetch<Person>("/api/people/", { method: "POST", body: data });
}

export function fetchGroups() {
  return apiFetch<Group[] | Paginated<Group>>("/api/groups/").then(unwrapList);
}

export function fetchGroup(id: number) {
  return apiFetch<Group>(`/api/groups/${id}/`);
}

export function saveGroup(data: Partial<Group>, id?: number) {
  if (id) {
    return apiFetch<Group>(`/api/groups/${id}/`, { method: "PATCH", body: data });
  }
  return apiFetch<Group>("/api/groups/", { method: "POST", body: data });
}

export function fetchTopics(params?: Record<string, string>) {
  const search = params ? `?${new URLSearchParams(params)}` : "";
  return apiFetch<PrayerTopic[] | Paginated<PrayerTopic>>(`/api/prayer/topics/${search}`).then(unwrapList);
}

export function fetchTopic(id: number) {
  return apiFetch<PrayerTopic>(`/api/prayer/topics/${id}/`);
}

export function saveTopic(data: Partial<PrayerTopic>, id?: number) {
  if (id) {
    return apiFetch<PrayerTopic>(`/api/prayer/topics/${id}/`, { method: "PATCH", body: data });
  }
  return apiFetch<PrayerTopic>("/api/prayer/topics/", { method: "POST", body: data });
}

export function previewPrayerImport(text: string) {
  return apiFetch<{ suggestions: PrayerImportSuggestion[] }>("/api/prayer/import/preview/", {
    method: "POST",
    body: { text },
  });
}

export function commitPrayerImport(
  topics: Array<{
    topic_text: string;
    target_frequency: PrayerTopic["target_frequency"];
    person_id?: number | null;
    group_id?: number | null;
  }>,
) {
  return apiFetch<{ topics: PrayerTopic[] }>("/api/prayer/import/commit/", {
    method: "POST",
    body: { topics },
  });
}

export function fetchTopicHistory(id: number) {
  return apiFetch<Array<{ prayed_on: string; answered: boolean; answer_note: string; session_id: number }>>(
    `/api/prayer/topics/${id}/history/`,
  );
}

export function fetchSessions() {
  return apiFetch<PrayerSession[] | Paginated<PrayerSession>>("/api/prayer/sessions/").then(unwrapList);
}

export function fetchSession(id: number) {
  return apiFetch<PrayerSession>(`/api/prayer/sessions/${id}/`);
}
