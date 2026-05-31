import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPerson,
  LIFE_STAGES,
  listPersonProperties,
  RELATIONSHIP_CATEGORIES,
  updatePerson,
  type LifeStage,
  type Person,
  type PersonProperty,
  type RelationshipCategory,
} from "./api";
import { listEntries, type JournalEntry } from "../entries/api";
import { listMemberships, type Membership } from "../orgs/api";
import { AssociationsPanel } from "../associations/AssociationsPanel";

export default function PersonDetailRoute() {
  const params = useParams<{ id: string }>();
  const personId = Number(params.id);
  const [person, setPerson] = useState<Person | null>(null);
  const [properties, setProperties] = useState<PersonProperty[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [draftFullName, setDraftFullName] = useState("");
  const [draftPreferred, setDraftPreferred] = useState("");
  const [draftCategory, setDraftCategory] = useState<RelationshipCategory>("friend");
  const [draftLifeStage, setDraftLifeStage] = useState<LifeStage>("");
  const [draftBirthday, setDraftBirthday] = useState("");
  const [draftDeceased, setDraftDeceased] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    try {
      const [p, props, ents, ms] = await Promise.all([
        getPerson(personId),
        listPersonProperties(personId),
        listEntries({ personId }),
        listMemberships({ person_id: personId }),
      ]);
      setPerson(p);
      setProperties(props.results);
      setEntries(ents.results);
      setMemberships(ms.results);
      setError(null);
      setDraftFullName(p.full_name);
      setDraftPreferred(p.preferred_name);
      setDraftCategory(p.relationship_category);
      setDraftLifeStage(p.life_stage);
      setDraftBirthday(p.birthday || "");
      setDraftDeceased(p.deceased_at || "");
      setDraftNotes(p.notes_markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }
  useEffect(() => { void load(); }, [personId]);

  async function saveEdit() {
    setSavingEdit(true);
    try {
      await updatePerson(personId, {
        full_name: draftFullName.trim(),
        preferred_name: draftPreferred.trim(),
        relationship_category: draftCategory,
        life_stage: draftLifeStage,
        birthday: draftBirthday || null,
        deceased_at: draftDeceased || null,
        notes_markdown: draftNotes,
      });
      setEditing(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSavingEdit(false);
    }
  }

  function cancelEdit() {
    if (!person) return;
    setDraftFullName(person.full_name);
    setDraftPreferred(person.preferred_name);
    setDraftCategory(person.relationship_category);
    setDraftLifeStage(person.life_stage);
    setDraftBirthday(person.birthday || "");
    setDraftDeceased(person.deceased_at || "");
    setDraftNotes(person.notes_markdown);
    setEditing(false);
  }

  if (error) return <main className="container"><p style={{ color: "crimson" }}>{error}</p></main>;
  if (!person) return <main className="container"><p className="muted">Loading…</p></main>;

  const approved = properties.filter((p) => p.status === "approved" || p.status === "edited");
  const pending = properties.filter((p) => p.status === "pending_review");

  return (
    <main className="container">
      <Link to="/">← People</Link>

      {editing ? (
        <div className="stack" style={{ marginTop: "1rem" }}>
          <div><label>Full name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} autoFocus /></div>
          <div><label>Preferred name</label><input value={draftPreferred} onChange={(e) => setDraftPreferred(e.target.value)} /></div>
          <div><label>Relationship</label>
            <select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value as RelationshipCategory)}>
              {RELATIONSHIP_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div><label>Life stage</label>
            <select value={draftLifeStage} onChange={(e) => setDraftLifeStage(e.target.value as LifeStage)}>
              {LIFE_STAGES.map((s) => <option key={s.value || "none"} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><label>Birthday</label><input type="date" value={draftBirthday} onChange={(e) => setDraftBirthday(e.target.value)} /></div>
          <div><label>Deceased</label><input type="date" value={draftDeceased} onChange={(e) => setDraftDeceased(e.target.value)} /></div>
          <div><label>Notes</label><textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} /></div>
          <div className="row" style={{ gap: "0.5rem" }}>
            <button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</button>
            <button className="secondary" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h1 style={{ marginBottom: 0 }}>{person.preferred_name || person.full_name}</h1>
            <button className="secondary" onClick={() => setEditing(true)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}>Edit</button>
          </div>
          <p className="muted">
            {person.full_name} · <span className="pill">{person.relationship_category}</span>
            {person.life_stage && <> · <span className="pill">{person.life_stage.replace("_", " ")}</span></>}
            {person.deceased_at && <> · <span className="pill" style={{ color: "var(--muted)" }}>deceased</span></>}
          </p>
          {(person.birthday || person.deceased_at) && (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {person.birthday && <>Born {person.birthday}</>}
              {person.deceased_at && <> · Passed {person.deceased_at}</>}
            </p>
          )}
          {person.notes_markdown && <div className="card"><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{person.notes_markdown}</p></div>}
        </>
      )}

      <AssociationsPanel personId={personId} />

      <section style={{ marginTop: "1rem" }}>
        <h2 style={{ margin: 0 }}>Memberships</h2>
        {memberships.length === 0 ? (
          <p className="muted">No org memberships yet.</p>
        ) : (
          <ul className="bare">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link to={`/orgs/${m.organization}`}>{m.organization_name}</Link>
                {m.role && <span className="muted" style={{ marginLeft: "0.5rem" }}>· {m.role}</span>}
                {!m.current && <span className="pill" style={{ marginLeft: "0.5rem" }}>past</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "1rem" }}>
        <h2>Properties</h2>
        {approved.length === 0 && pending.length === 0 && (
          <p className="muted">No properties yet. Write an entry tagged to this person; the AI will start extracting.</p>
        )}
        {approved.length > 0 && (
          <ul className="bare">
            {approved.map((pp) => <li key={pp.id}><strong>{pp.property_def_name}:</strong> {pp.value_text}</li>)}
          </ul>
        )}
        {pending.length > 0 && (
          <>
            <h3 style={{ marginTop: "1rem" }}>Pending review</h3>
            <p className="muted">Go to <Link to="/review">Review</Link> to approve.</p>
            <ul className="bare">
              {pending.map((pp) => (
                <li key={pp.id}>
                  <strong>{pp.property_def_name}:</strong> {pp.value_text}{" "}
                  <span className="pill">conf {pp.ai_confidence.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section style={{ marginTop: "1rem" }}>
        <h2>Entries</h2>
        {entries.length === 0 ? (
          <p className="muted">No entries tagged to this person.</p>
        ) : (
          <ul className="bare">
            {entries.map((e) => (
              <li key={e.id}>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {new Date(e.created_at).toLocaleString()} · {e.extraction_status}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{e.content_markdown}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
