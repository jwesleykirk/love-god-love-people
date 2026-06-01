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
import { Illustration } from "@/components/Illustration";

type Tab = "profile" | "properties" | "associations" | "memberships" | "journal";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "profile", label: "Profile" },
  { value: "properties", label: "Properties" },
  { value: "associations", label: "Associations" },
  { value: "memberships", label: "Memberships" },
  { value: "journal", label: "Journal" },
];

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  work: "Work",
  neighbor: "Neighbor",
  ministry: "Ministry",
  other: "Other",
};

function entryStatusLabel(s: JournalEntry["extraction_status"]) {
  switch (s) {
    case "pending": return "queued";
    case "running": return "AI processing";
    case "done": return "AI done";
    case "skipped": return "AI off";
    case "error": return "AI error";
    default: return s;
  }
}

function entryStatusPill(s: JournalEntry["extraction_status"]) {
  switch (s) {
    case "done": return "pill pill--success";
    case "running": return "pill pill--primary";
    case "error": return "pill pill--warning";
    default: return "pill";
  }
}

export default function PersonDetailRoute() {
  const params = useParams<{ id: string }>();
  const personId = Number(params.id);
  const [person, setPerson] = useState<Person | null>(null);
  const [properties, setProperties] = useState<PersonProperty[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);

  // edit draft
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

  if (error) return <main className="container"><p style={{ color: "var(--color-warning)" }}>{error}</p></main>;
  if (!person) return <main className="container"><p className="muted">Loading…</p></main>;

  const approved = properties.filter((p) => p.status === "approved" || p.status === "edited");
  const pending = properties.filter((p) => p.status === "pending_review");

  const ageDisplay = (() => {
    if (person.birthday) {
      const b = new Date(person.birthday);
      const ageMs = Date.now() - b.getTime();
      const ageYears = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
      return `${ageYears} years old`;
    }
    const approx = properties.find((p) => p.property_def_name === "approximate_birth_year" && (p.status === "approved" || p.status === "edited"));
    if (approx) {
      const match = approx.value_text.match(/(\d{4})/);
      if (match) {
        const now = new Date().getFullYear();
        return `~${now - Number(match[1])} years old (approximate)`;
      }
    }
    return null;
  })();

  return (
    <main className="container">
      <Link to="/people" style={{ display: "inline-block", marginBottom: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--text-label)" }}>
        ← People
      </Link>

      {/* Hero card */}
      <div className="card" style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
        {/* ILLUSTRATION_PLACEHOLDER: {category}.svg */}
        <Illustration
          slot={person.relationship_category}
          size="xl"
          label={person.relationship_category[0].toUpperCase()}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, marginBottom: 4 }}>
            {person.preferred_name || person.full_name}
          </h1>
          {person.preferred_name && person.preferred_name !== person.full_name && (
            <div className="muted" style={{ fontSize: "var(--text-label)", marginBottom: 4 }}>
              {person.full_name}
            </div>
          )}
          <div className="row row--wrap" style={{ gap: "var(--space-1)", marginTop: 4 }}>
            <span className="chip">{CATEGORY_LABEL[person.relationship_category] ?? person.relationship_category}</span>
            {person.life_stage && <span className="chip">{person.life_stage.replace("_", " ")}</span>}
            {person.deceased_at && <span className="chip pill--warning">deceased</span>}
            {ageDisplay && <span className="chip">{ageDisplay}</span>}
          </div>
        </div>
        <button className="secondary" onClick={() => setEditing(!editing)} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Edit form takes over when editing */}
      {editing && (
        <div className="card stack">
          <div><label>Full name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} /></div>
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
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</button>
            <button className="secondary" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tab pill row */}
      {!editing && (
        <>
          <div className="tab-row" style={{ marginTop: "var(--space-4)" }}>
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={tab === t.value ? "tab tab--active" : "tab"}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "profile" && (
            <div className="card">
              {person.notes_markdown ? (
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{person.notes_markdown}</p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>No notes yet. Tap Edit to add some.</p>
              )}
              {(person.birthday || person.deceased_at) && (
                <div className="divider" />
              )}
              {person.birthday && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Birthday</span>
                  <span>{new Date(person.birthday).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
              {person.deceased_at && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-2)" }}>
                  <span className="muted">Passed</span>
                  <span>{new Date(person.deceased_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
            </div>
          )}

          {tab === "properties" && (
            <>
              {approved.length === 0 && pending.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p className="muted">No properties yet. Write a journal entry tagged to this person and the AI will start extracting.</p>
                  <Link to="/entries/new"><button className="primary-pill">Write an entry</button></Link>
                </div>
              ) : (
                <>
                  {approved.length > 0 && (
                    <div className="card">
                      {approved.map((pp, i) => (
                        <div key={pp.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "var(--space-2) 0" }}>
                            <span className="muted">{pp.property_def_name.replace(/_/g, " ")}</span>
                            <span style={{ fontWeight: 500 }}>{pp.value_text}</span>
                          </div>
                          {i < approved.length - 1 && <div className="divider" style={{ margin: 0 }} />}
                        </div>
                      ))}
                    </div>
                  )}
                  {pending.length > 0 && (
                    <div className="card">
                      <div className="row row--between" style={{ marginBottom: "var(--space-2)" }}>
                        <h3 style={{ margin: 0, fontSize: "var(--text-h3)" }}>Pending review</h3>
                        <Link to="/review">Review →</Link>
                      </div>
                      {pending.map((pp, i) => (
                        <div key={pp.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "var(--space-2) 0" }}>
                            <div>
                              <span className="muted">{pp.property_def_name.replace(/_/g, " ")}</span>
                              <div style={{ fontWeight: 500 }}>{pp.value_text}</div>
                            </div>
                            <span className="chip">conf {pp.ai_confidence.toFixed(2)}</span>
                          </div>
                          {i < pending.length - 1 && <div className="divider" style={{ margin: 0 }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "associations" && (
            <AssociationsPanel personId={personId} />
          )}

          {tab === "memberships" && (
            <>
              {memberships.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p className="muted">No org memberships yet.</p>
                  <Link to="/orgs"><button className="secondary">View organizations</button></Link>
                </div>
              ) : (
                <div className="card">
                  {memberships.map((m, i) => (
                    <div key={m.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0" }}>
                        <div>
                          <Link to={`/orgs/${m.organization}`} style={{ fontWeight: 500 }}>{m.organization_name}</Link>
                          {m.role && <div className="muted">{m.role}</div>}
                        </div>
                        {!m.current && <span className="chip">past</span>}
                      </div>
                      {i < memberships.length - 1 && <div className="divider" style={{ margin: 0 }} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "journal" && (
            <>
              {entries.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p className="muted">No entries tagged to this person yet.</p>
                  <Link to="/entries/new"><button className="primary-pill">Write an entry</button></Link>
                </div>
              ) : (
                <div className="card">
                  {entries.map((e, i) => (
                    <div key={e.id}>
                      <div style={{ padding: "var(--space-3) 0" }}>
                        <div className="row row--between" style={{ marginBottom: 4 }}>
                          <span className="muted" style={{ fontSize: "var(--text-caption)" }}>
                            {new Date(e.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                          <span className={entryStatusPill(e.extraction_status)}>{entryStatusLabel(e.extraction_status)}</span>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{e.content_markdown}</div>
                      </div>
                      {i < entries.length - 1 && <div className="divider" style={{ margin: 0 }} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
