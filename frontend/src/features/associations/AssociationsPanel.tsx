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

  // Group types by category for the add form
  const byCategory = types.reduce<Record<string, AssociationType[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <section style={{ marginTop: "1rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Associations</h2>
        <button
          className="secondary"
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
        >
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showAdd && (
        <div className="card stack">
          <div>
            <label>Type</label>
            <select value={draftType} onChange={(e) => setDraftType(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— pick one —</option>
              {Object.entries(byCategory).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
          <button onClick={add} disabled={busy || !draftPerson || !draftType}>Save</button>
        </div>
      )}

      {associations.length === 0 ? (
        <p className="muted">No associations yet.</p>
      ) : (
        <ul className="bare">
          {associations.map((a) => (
            <li key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <span>
                <em>{a.association_type_name.replace(/_/g, " ")}</em>{" "}
                <Link to={`/people/${a.to_person}`}>{a.to_person_name}</Link>
              </span>
              <button className="danger" onClick={() => remove(a.id)} disabled={busy} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
