import type { Person } from "@/features/people/api";

export function personPrimaryName(p: Person): string {
  return p.preferred_name || p.full_name;
}

export function personSecondaryName(p: Person): string | null {
  if (p.preferred_name && p.preferred_name !== p.full_name) return p.full_name;
  return null;
}
