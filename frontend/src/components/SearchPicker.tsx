import { useMemo, useState } from "react";
import { filterPickerItems, groupPickerItems, type PickerItem } from "./searchPickerUtils";

export type { PickerItem };

type SingleProps = {
  items: PickerItem[];
  value: string | number | "";
  onChange: (id: string | number | "") => void;
  excludeIds?: Array<string | number>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Optional pickers: show selected row + Change. Inline pickers: keep list visible. */
  lockWhenSelected?: boolean;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  listAriaLabel?: string;
};

export function SearchPicker({
  items,
  value,
  onChange,
  excludeIds = [],
  label,
  placeholder = "Search…",
  disabled = false,
  lockWhenSelected = true,
  allowEmpty = false,
  emptyOptionLabel = "— none —",
  listAriaLabel = "Options",
}: SingleProps) {
  const [query, setQuery] = useState("");
  const exclude = useMemo(() => new Set(excludeIds.map(String)), [excludeIds]);
  const pool = useMemo(
    () => items.filter((item) => !exclude.has(String(item.id))),
    [items, exclude],
  );
  const filtered = useMemo(() => filterPickerItems(pool, query), [pool, query]);
  const grouped = useMemo(() => groupPickerItems(filtered), [filtered]);
  const selected = value === "" ? null : items.find((i) => String(i.id) === String(value)) ?? null;
  const showList = !lockWhenSelected || !selected;

  function clear() {
    setQuery("");
    onChange("");
  }

  function pick(id: string | number | "") {
    onChange(id);
    setQuery("");
  }

  function renderOption(item: PickerItem, selectedId: string | number | "") {
    const on = String(item.id) === String(selectedId);
    return (
      <li key={String(item.id)}>
        <button
          type="button"
          className={`search-picker-option${on ? " search-picker-option--selected" : ""}`}
          role="option"
          aria-selected={on}
          disabled={disabled}
          onClick={() => pick(item.id)}
        >
          <span className="search-picker-name">{item.label}</span>
          {item.sublabel && <span className="muted search-picker-sub">{item.sublabel}</span>}
          {on && !lockWhenSelected && (
            <span className="search-picker-check" aria-hidden>✓</span>
          )}
        </button>
      </li>
    );
  }

  return (
    <div className="search-picker">
      {label && <label>{label}</label>}
      {lockWhenSelected && selected && (
        <div className="search-picker-selected">
          <div className="search-picker-selected-text">
            <span className="search-picker-name">{selected.label}</span>
            {selected.sublabel && <span className="muted search-picker-sub">{selected.sublabel}</span>}
          </div>
          <button type="button" className="secondary search-picker-clear" onClick={clear} disabled={disabled}>
            Change
          </button>
        </div>
      )}
      {showList && (
        <>
          <input
            type="search"
            className="search-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            aria-label={label ?? placeholder}
          />
          <ul className="search-picker-list" role="listbox" aria-label={listAriaLabel}>
            {allowEmpty && !query.trim() && (
              <li>
                <button
                  type="button"
                  className={`search-picker-option${value === "" ? " search-picker-option--selected" : ""}`}
                  role="option"
                  aria-selected={value === ""}
                  disabled={disabled}
                  onClick={() => pick("")}
                >
                  <span className="search-picker-name">{emptyOptionLabel}</span>
                </button>
              </li>
            )}
            {filtered.length === 0 && !(allowEmpty && !query.trim()) ? (
              <li className="search-picker-empty muted">{query.trim() ? "No matches" : "Nothing to choose"}</li>
            ) : (
              grouped.map(({ group, items: groupItems }) => (
                <li key={group ?? "_"} style={{ listStyle: "none" }}>
                  {group && (
                    <div className="search-picker-group muted">{group}</div>
                  )}
                  <ul className="search-picker-group-list">
                    {groupItems.map((item) => renderOption(item, value))}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

type MultiProps = {
  items: PickerItem[];
  value: Set<string | number>;
  onChange: (ids: Set<string | number>) => void;
  excludeIds?: Array<string | number>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  listAriaLabel?: string;
};

export function SearchMultiPicker({
  items,
  value,
  onChange,
  excludeIds = [],
  label,
  placeholder = "Search…",
  disabled = false,
  listAriaLabel = "Options",
}: MultiProps) {
  const [query, setQuery] = useState("");
  const exclude = useMemo(() => new Set(excludeIds.map(String)), [excludeIds]);
  const pool = useMemo(
    () => items.filter((item) => !exclude.has(String(item.id))),
    [items, exclude],
  );
  const filtered = useMemo(() => filterPickerItems(pool, query), [pool, query]);
  const selectedItems = useMemo(
    () => items.filter((i) => value.has(i.id)),
    [items, value],
  );

  function toggle(id: string | number) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function remove(id: string | number) {
    const next = new Set(value);
    next.delete(id);
    onChange(next);
  }

  return (
    <div className="search-picker">
      {label && <label>{label}</label>}
      {selectedItems.length > 0 && (
        <div className="row row--wrap search-picker-chips" style={{ gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          {selectedItems.map((item) => (
            <span key={String(item.id)} className="pill pill--primary row" style={{ gap: "var(--space-1)" }}>
              {item.label}
              <button
                type="button"
                className="search-picker-chip-remove"
                onClick={() => remove(item.id)}
                disabled={disabled}
                aria-label={`Remove ${item.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="search"
        className="search-picker-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-label={label ?? placeholder}
      />
      <ul className="search-picker-list" role="listbox" aria-label={listAriaLabel} aria-multiselectable="true">
        {filtered.length === 0 ? (
          <li className="search-picker-empty muted">{query.trim() ? "No matches" : "Nothing to choose"}</li>
        ) : (
          filtered.map((item) => {
            const on = value.has(item.id);
            return (
              <li key={String(item.id)}>
                <button
                  type="button"
                  className={`search-picker-option${on ? " search-picker-option--selected" : ""}`}
                  role="option"
                  aria-selected={on}
                  disabled={disabled}
                  onClick={() => toggle(item.id)}
                >
                  <span className="search-picker-name">{item.label}</span>
                  {item.sublabel && <span className="muted search-picker-sub">{item.sublabel}</span>}
                  {on && <span className="search-picker-check" aria-hidden>✓</span>}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
