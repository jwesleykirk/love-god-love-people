import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchGroup, fetchPeople, saveGroup } from "../api";
import type { Group } from "../types";

export function GroupFormRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<Partial<Group>>({ name: "", notes: "", member_ids: [] });
  const [people, setPeople] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchPeople().then(setPeople);
    if (id) {
      void fetchGroup(Number(id)).then((g) => {
        setForm({
          ...g,
          member_ids: g.memberships?.map((m) => m.person.id) ?? [],
        });
      });
    }
  }, [id]);

  const toggleMember = (personId: number) => {
    const ids = new Set(form.member_ids ?? []);
    if (ids.has(personId)) ids.delete(personId);
    else ids.add(personId);
    setForm({ ...form, member_ids: [...ids] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveGroup(form, id ? Number(id) : undefined);
      navigate(`/groups/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container stack-lg">
      <Link to="/people" className="session-back">← People</Link>
      <h1>{isEdit ? "Edit group" : "New group"}</h1>
      <form className="stack-lg" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label>Name</label>
          <input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label>Notes</label>
          <textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div>
          <label>Members</label>
          <ul className="bare">
            {people.map((p) => (
              <li key={p.id}>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={(form.member_ids ?? []).includes(p.id)}
                    onChange={() => toggleMember(p.id)}
                  />
                  {p.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}

export function GroupDetailRoute() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (id) void fetchGroup(Number(id)).then(setGroup);
  }, [id]);

  if (!group) return <main className="container"><p className="muted">Loading…</p></main>;

  return (
    <main className="container stack-lg">
      <Link to="/people" className="session-back">← People</Link>
      <h1>{group.name}</h1>
      <div className="card stack">
        {group.notes && <p>{group.notes}</p>}
        <ul className="bare">
          {(group.memberships ?? []).map((m) => (
            <li key={m.id}>
              <Link to={`/people/${m.person.id}`}>{m.person.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      <Link className="action-link" to={`/groups/${id}/edit`}>Edit</Link>
    </main>
  );
}
