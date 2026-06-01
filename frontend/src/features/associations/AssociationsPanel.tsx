import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { associationTypeItems } from "@/components/optionItems";
import { PersonMultiPicker } from "@/components/PersonPicker";
import { SearchPicker } from "@/components/SearchPicker";
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
  const [draftPeople, setDraftPeople] = useState<Set<number>>(new Set());
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
    if (draftPeople.size === 0 || !draftType) return;
    setBusy(true);
    try {
      for (const toPersonId of draftPeople) {
        await createAssociation({
          from_person: personId,
          to_person: toPersonId,
          association_type: draftType as number,
        });
      }
      setShowAdd(false);
      setDraftPeople(new Set());
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

  const typeItems = associationTypeItems(types);
  const associatedPersonIds = associations.map((a) => a.to_person);

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
          <SearchPicker
            label="Association type"
            items={typeItems}
            value={draftType}
            onChange={(id) => setDraftType(id === "" ? "" : Number(id))}
            allowEmpty
            emptyOptionLabel="— choose type —"
            placeholder="Search association types…"
            listAriaLabel="Association types"
          />
          <PersonMultiPicker
            label="People"
            people={people}
            value={draftPeople}
            onChange={setDraftPeople}
            excludeIds={associatedPersonIds}
            emptyMessage="No one left to associate — everyone is already linked."
          />
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button onClick={add} disabled={busy || draftPeople.size === 0 || !draftType}>
              {draftPeople.size <= 1 ? "Save" : `Save (${draftPeople.size})`}
            </button>
            <button className="secondary" onClick={() => { setShowAdd(false); setDraftPeople(new Set()); setDraftType(""); }}>Cancel</button>
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
