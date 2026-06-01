export type PickerItem = {
  id: string | number;
  label: string;
  sublabel?: string;
  group?: string;
};

export function filterPickerItems(items: PickerItem[], query: string): PickerItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
      (item.group && item.group.toLowerCase().includes(q)),
  );
}

export function groupPickerItems(items: PickerItem[]): Array<{ group: string | null; items: PickerItem[] }> {
  const hasGroups = items.some((i) => i.group);
  if (!hasGroups) return [{ group: null, items }];
  const map = new Map<string, PickerItem[]>();
  for (const item of items) {
    const key = item.group ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupItems]) => ({ group: group || null, items: groupItems }));
}
