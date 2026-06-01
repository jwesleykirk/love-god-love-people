import { useMemo } from "react";
import type { Person } from "@/features/people/api";
import { personPrimaryName, personSecondaryName } from "./personDisplay";
import { SearchMultiPicker, SearchPicker, type PickerItem } from "./SearchPicker";

function peopleToItems(people: Person[]): PickerItem[] {
  return people.map((p) => ({
    id: p.id,
    label: personPrimaryName(p),
    sublabel: personSecondaryName(p) ?? undefined,
  }));
}

type SingleProps = {
  people: Person[];
  value: number | "";
  onChange: (id: number | "") => void;
  excludeIds?: number[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function PersonPicker({
  people,
  value,
  onChange,
  excludeIds = [],
  label,
  placeholder = "Search by name…",
  disabled = false,
}: SingleProps) {
  const items = useMemo(() => peopleToItems(people), [people]);
  return (
    <SearchPicker
      items={items}
      value={value}
      onChange={(id) => onChange(id === "" ? "" : Number(id))}
      excludeIds={excludeIds}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      listAriaLabel="People"
    />
  );
}

type MultiProps = {
  people: Person[];
  value: Set<number>;
  onChange: (ids: Set<number>) => void;
  excludeIds?: number[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
};

export function PersonMultiPicker({
  people,
  value,
  onChange,
  excludeIds = [],
  label,
  placeholder = "Search by name…",
  disabled = false,
  emptyMessage,
}: MultiProps) {
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);
  const pool = useMemo(() => people.filter((p) => !exclude.has(p.id)), [people, exclude]);
  const items = useMemo(() => peopleToItems(pool), [pool]);

  if (pool.length === 0 && emptyMessage) {
    return (
      <div className="search-picker">
        {label && <label>{label}</label>}
        <p className="muted" style={{ margin: 0, fontSize: "var(--text-label)" }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <SearchMultiPicker
      items={items}
      value={value}
      onChange={(ids) => onChange(new Set([...ids].map(Number)))}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      listAriaLabel="People"
    />
  );
}
