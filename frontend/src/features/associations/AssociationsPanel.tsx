import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPeople, type Person } from "../people/api";
import {
  createAssociation,
  deleteAssociation,
  listAssociationsForPerson,
  listAssociationTypes,
  type AssociationType,
  type PersonAssociation,
} from "./api";

type Props = { personId: number };

export function AssociationsPanel({ personId }: Props) {
  const [associations, setAssociations] = useState<PersonAssociation[]>([]);
  const [types, setTypes] = useState<AssociationType[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [draftPerson, setDraftPerson] = useState<number | "">("");
  const [draftType, setDraftType] = useState<number | "">("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [a, t, p] = await Promise.all([
      listAssociationsForPerson(personId),
      listAssociationTypes(),
      listPeople(),
    ]);
    setAssociations(a.results);
    setTypes(t.results);
    setPeople(p.results.filter((x) => x.id !== personId));
  }
  useEffect(() => { void load(); }, [personId]);

  async function add() {
    if (!draftPerson || !draftType) return;
    setBusy(true);
    try {
      await createAssociation({
        from_person: personId,
        to_person: draftPerson as number,
        association_type: draftType as number,
      });
      setShowAdd(false);
      setDraftPerson("");
      setDraftType("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await deleteAssociation(id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const byCategory = types.reduce<Record<string, AssociationType[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  if (associations.length === 0 && !showAdd) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted">No associations yet.</p>
        <button className="secondary" onClick={() => setShowAdd(true)}>+ Add association</button>
      </div>
    );
  }

  return (
    <>
      {showAdd && (
        <div className="card stack">
          <div>
            <label>Type</label>
            <select value={draftType} onChange={(e) => setDraftType(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— pick one —</option>
              {Object.entries(byCategory).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((t) => <option key={t.id} value={t.id}>{t.name.replace(/_/g, " ")}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label>To person</label>
            <select value={draftPerson} onChange={(e) => setDraftPerson(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— pick one —</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button onClick={add} disabled={busy || !draftPerson || !draftType}>Save</button>
            <button className="secondary" onClick={() => { setShowAdd(false); setDraftPerson(""); setDraftType(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {associations.length > 0 && (
        <div className="card">
          <div className="row row--between" style={{ marginBottom: "var(--space-2)" }}>
            <span className="muted">{associations.length} {associations.length === 1 ? "person" : "people"}</span>
            {!showAdd && <button className="secondary" onClick={() => setShowAdd(true)} style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-caption)" }}>+ Add</button>}
          </div>
          {associations.map((a, i) => (
            <div key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", gap: "var(--space-2)" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="muted" style={{ fontSize: "var(--text-caption)", textTransform: "lowercase" }}>
                    {a.association_type_name.replace(/_/g, " ")}
                  </span>
                  <div>
                    <Link to={`/people/${a.to_person}`} style={{ fontWeight: 500, color: "var(--color-text)" }}>{a.to_person_name}</Link>
                  </div>
                </div>
                <button
                  className="secondary"
                  onClick={() => remove(a.id)}
                  disabled={busy}
                  style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-caption)", color: "var(--color-text-muted)" }}
                  aria-label="Remove association"
                >
                  ×
                </button>
              </div>
              {i < associations.length - 1 && <div className="divider" style={{ margin: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
