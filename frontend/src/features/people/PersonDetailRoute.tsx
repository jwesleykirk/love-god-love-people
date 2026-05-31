import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getPerson,
  listPersonProperties,
  updatePerson,
  type Person,
  type PersonProperty,
  type RelationshipCategory,
} from "./api";
import { listEntries, type JournalEntry } from "../entries/api";

const CATEGORIES: Array<{ value: RelationshipCategory; label: string }> = [
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family" },
  { value: "bridge_student", label: "Bridge student" },
  { value: "other", label: "Other" },
];

export default function PersonDetailRoute() {
  const params = useParams<{ id: string }>();
  const personId = Number(params.id);
  const [person, setPerson] = useState<Person | null>(null);
  const [properties, setProperties] = useState<PersonProperty[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // edit draft
  const [draftFullName, setDraftFullName] = useState("");
  const [draftPreferred, setDraftPreferred] = useState("");
  const [draftCategory, setDraftCategory] = useState<RelationshipCategory>("friend");
  const [draftNotes, setDraftNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    try {
      const [p, props, ents] = await Promise.all([
        getPerson(personId),
        listPersonProperties(personId),
        listEntries({ personId }),
      ]);
      setPerson(p);
      setProperties(props.results);
      setEntries(ents.results);
      setError(null);
      // sync draft
      setDraftFullName(p.full_name);
      setDraftPreferred(p.preferred_name);
      setDraftCategory(p.relationship_category);
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
          <div>
            <label>Full name</label>
            <input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} autoFocus />
          </div>
          <div>
            <label>Preferred name</label>
            <input value={draftPreferred} onChange={(e) => setDraftPreferred(e.target.value)} />
          </div>
          <div>
            <label>Relationship</label>
            <select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value as RelationshipCategory)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label>Notes</label>
            <textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
          </div>
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
            {person.full_name} · <span className="pill">{person.relationship_category.replace("_", " ")}</span>
          </p>
          {person.notes_markdown && (
            <div className="card">
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{person.notes_markdown}</p>
            </div>
          )}
        </>
      )}

      <section>
        <h2>Properties</h2>
        {approved.length === 0 && pending.length === 0 && (
          <p className="muted">No properties yet. Write an entry tagged to this person and the AI will start extracting.</p>
        )}
        {approved.length > 0 && (
          <ul className="bare">
            {approved.map((pp) => (
              <li key={pp.id}>
                <strong>{pp.property_def_name}:</strong> {pp.value_text}
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 && (
          <>
            <h3 style={{ marginTop: "1rem" }}>Pending review</h3>
            <p className="muted">Go to <Link to="/review">Review</Link> to approve or reject these.</p>
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

      <section>
        <h2>Entries</h2>
        {entries.length === 0 ? (
          <p className="muted">No entries tagged to this person.</p>
        ) : (
          <ul className="bare">
            {entries.map((e) => (
              <li key={e.id}>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  {new Date(e.created_at).toLocaleString()} · {entryStatusLabel(e.extraction_status)}
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

function entryStatusLabel(s: JournalEntry["extraction_status"]) {
  switch (s) {
    case "pending": return "queued for AI";
    case "running": return "AI processing…";
    case "done": return "AI done";
    case "skipped": return "AI off (no API key)";
    case "error": return "AI error";
    default: return s;
  }
}
