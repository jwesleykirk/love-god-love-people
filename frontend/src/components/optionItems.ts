import { LIFE_STAGES, RELATIONSHIP_CATEGORIES } from "@/features/people/api";
import type { PickerItem } from "./searchPickerUtils";

export function relationshipCategoryItems(): PickerItem[] {
  return RELATIONSHIP_CATEGORIES.map((c) => ({ id: c.value, label: c.label }));
}

/** For create flows — no default category pre-selected. */
export function relationshipCategoryCreateItems(): PickerItem[] {
  return [{ id: "", label: "— choose category —" }, ...relationshipCategoryItems()];
}

export function relationshipCategoryFilterItems(): PickerItem[] {
  return [{ id: "", label: "All categories" }, ...relationshipCategoryItems()];
}

export function lifeStageItems(): PickerItem[] {
  return LIFE_STAGES.map((s) => ({ id: s.value, label: s.label }));
}

export function associationTypeItems(types: Array<{ id: number; name: string; category: string }>): PickerItem[] {
  return types.map((t) => ({
    id: t.id,
    label: t.name.replace(/_/g, " "),
    group: t.category,
  }));
}

export function propertyDefItems(
  defs: Array<{ id: number; name: string; description?: string }>,
): PickerItem[] {
  return defs.map((d) => ({
    id: d.id,
    label: d.name.replace(/_/g, " "),
    sublabel: d.description || undefined,
  }));
}
