import { apiFetch } from "@/lib/api";

export type OrgType = "church" | "ministry" | "work" | "school" | "community" | "household" | "other";

export type Organization = {
  id: number;
  name: string;
  org_type: OrgType;
  parent: number | null;
  parent_name: string | null;
  notes_markdown: string;
  archived: boolean;
  child_count: number;
  created_at: string;
  updated_at: string;
};

export type OrgList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Organization[];
};

export function listOrgs(params: { q?: string; org_type?: string; parent_id?: number | "null" } = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.org_type) qs.set("org_type", params.org_type);
  if (params.parent_id !== undefined) qs.set("parent_id", String(params.parent_id));
  const tail = qs.toString();
  return apiFetch<OrgList>(`/api/organizations/${tail ? `?${tail}` : ""}`);
}
export function getOrg(id: number) {
  return apiFetch<Organization>(`/api/organizations/${id}/`);
}
export function createOrg(data: Partial<Organization>) {
  return apiFetch<Organization>("/api/organizations/", { method: "POST", body: data });
}
export function updateOrg(id: number, data: Partial<Organization>) {
  return apiFetch<Organization>(`/api/organizations/${id}/`, { method: "PATCH", body: data });
}

// Memberships
export type Membership = {
  id: number;
  person: number;
  person_name: string;
  organization: number;
  organization_name: string;
  role: string;
  started_at: string | null;
  ended_at: string | null;
  current: boolean;
  notes: string;
};
export type MembershipList = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Membership[];
};
export function listMemberships(params: { person_id?: number; organization_id?: number; current?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (params.person_id) qs.set("person_id", String(params.person_id));
  if (params.organization_id) qs.set("organization_id", String(params.organization_id));
  if (params.current !== undefined) qs.set("current", params.current ? "1" : "0");
  const tail = qs.toString();
  return apiFetch<MembershipList>(`/api/memberships/${tail ? `?${tail}` : ""}`);
}
export function createMembership(data: { person: number; organization: number; role?: string; started_at?: string; ended_at?: string }) {
  return apiFetch<Membership>("/api/memberships/", { method: "POST", body: data });
}
export function deleteMembership(id: number) {
  return apiFetch<void>(`/api/memberships/${id}/`, { method: "DELETE" });
}

export const ORG_TYPES: Array<{ value: OrgType; label: string }> = [
  { value: "church", label: "Church" },
  { value: "ministry", label: "Ministry" },
  { value: "work", label: "Work" },
  { value: "school", label: "School" },
  { value: "community", label: "Community" },
  { value: "household", label: "Household" },
  { value: "other", label: "Other" },
];
