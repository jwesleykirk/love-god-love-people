import { useMemo } from "react";
import type { Organization } from "@/features/orgs/api";
import { ORG_TYPES, type OrgType } from "@/features/orgs/api";
import { SearchMultiPicker, SearchPicker, type PickerItem } from "./SearchPicker";

const ORG_TYPE_LABEL: Record<OrgType, string> = {
  church: "Church",
  ministry: "Ministry",
  work: "Work",
  school: "School",
  community: "Community",
  household: "Household",
  other: "Other",
};

function orgsToItems(orgs: Organization[]): PickerItem[] {
  return orgs.map((o) => ({
    id: o.id,
    label: o.name,
    sublabel: ORG_TYPE_LABEL[o.org_type] ?? o.org_type,
  }));
}

type SingleProps = {
  orgs: Organization[];
  value: number | "";
  onChange: (id: number | "") => void;
  excludeIds?: number[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
};

export function OrgPicker({
  orgs,
  value,
  onChange,
  excludeIds = [],
  label,
  placeholder = "Search organizations…",
  disabled = false,
  allowEmpty = false,
  emptyOptionLabel = "— none —",
}: SingleProps) {
  const items = useMemo(() => orgsToItems(orgs), [orgs]);
  return (
    <SearchPicker
      items={items}
      value={value}
      onChange={(id) => onChange(id === "" ? "" : Number(id))}
      excludeIds={excludeIds}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      allowEmpty={allowEmpty}
      emptyOptionLabel={emptyOptionLabel}
      listAriaLabel="Organizations"
    />
  );
}

type MultiProps = {
  orgs: Organization[];
  value: Set<number>;
  onChange: (ids: Set<number>) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function OrgMultiPicker({
  orgs,
  value,
  onChange,
  label,
  placeholder = "Search organizations…",
  disabled = false,
}: MultiProps) {
  const items = useMemo(() => orgsToItems(orgs), [orgs]);
  return (
    <SearchMultiPicker
      items={items}
      value={value}
      onChange={(ids) => onChange(new Set([...ids].map(Number)))}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      listAriaLabel="Organizations"
    />
  );
}

export function orgTypePickerItems(): PickerItem[] {
  return ORG_TYPES.map((t) => ({ id: t.value, label: t.label }));
}

export function orgTypeFilterItems(): PickerItem[] {
  return [{ id: "", label: "All types" }, ...orgTypePickerItems()];
}
