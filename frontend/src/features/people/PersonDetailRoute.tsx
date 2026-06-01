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
import { SearchPicker } from "@/components/SearchPicker";

type Tab = "profile" | "entries";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "profile", label: "Profile" },
  { value: "entries", label: "Entries" },
];

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  work: "Work",
  neighbor: "Neighbor",
  ministry: "Ministry",
  other: "Other",
};

const TOPIC_ORDER = ["bio", "family", "work", "interests", "faith", "health", "other"] as const;
const TOPIC_LABEL: Record<string, string> = {
  bio: "Bio",
  family: "Family",
  work: "Work",
  interests: "Interests",
  faith: "Faith",
  health: "Health",
  other: "Other",
};

function isMeaningful(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v.length > 0 && v !== "null" && v !== "none" && v !== "n/a" && v !== "—";
}

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

const LIFE_STAGE_PICKER_ITEMS = LIFE_STAGES.map((s) => ({
  id: s.value || "_none",
  label: s.label,
}));
const CATEGORY_PICKER_ITEMS = RELATIONSHIP_CATEGORIES.map((c) => ({
  id: c.value,
  label: c.label,
}));

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

  // Approved or edited values, with non-empty content. Group by topic.
  const visibleProps = properties.filter(
    (p) =>
      (p.status === "approved" || p.status === "edited") &&
      isMeaningful(p.value_text)
  );
  const propsByTopic = new Map<string, PersonProperty[]>();
  for (const pp of visibleProps) {
    const topic = pp.property_def_topic || "other";
    if (!propsByTopic.has(topic)) propsByTopic.set(topic, []);
    propsByTopic.get(topic)!.push(pp);
  }
  const topicsToRender = TOPIC_ORDER.filter((t) => propsByTopic.has(t));
  for (const extra of propsByTopic.keys()) {
    if (!topicsToRender.includes(extra as (typeof TOPIC_ORDER)[number])) {
      topicsToRender.push(extra as (typeof TOPIC_ORDER)[number]);
    }
  }
  const pendingCount = properties.filter((p) => p.status === "pending_review").length;

  const ageDisplay = (() => {
    if (person.birthday) {
      const b = new Date(person.birthday);
      const ageMs = Date.now() - b.getTime();
      const ageYears = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
      return `${ageYears} years old`;
    }
    const approx = properties.find(
      (p) => p.property_def_name === "approximate_birth_year" && (p.status === "approved" || p.status === "edited")
    );
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

      {editing && (
        <div className="card stack">
          <div><label>Full name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} /></div>
          <div><label>Preferred name</label><input value={draftPreferred} onChange={(e) => setDraftPreferred(e.target.value)} /></div>
          <SearchPicker
            label="Relationship"
            items={CATEGORY_PICKER_ITEMS}
            value={draftCategory}
            onChange={(id) => setDraftCategory(String(id) as RelationshipCategory)}
          />
          <SearchPicker
            label="Life stage"
            items={LIFE_STAGE_PICKER_ITEMS}
            value={draftLifeStage || "_none"}
            onChange={(id) => setDraftLifeStage(id === "_none" ? "" : (String(id) as LifeStage))}
          />
          <div><label>Birthday</label><input type="date" value={draftBirthday} onChange={(e) => setDraftBirthday(e.target.value)} /></div>
          <div><label>Deceased</label><input type="date" value={draftDeceased} onChange={(e) => setDraftDeceased(e.target.value)} /></div>
          <div><label>Notes</label><textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} /></div>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving…" : "Save"}</button>
            <button className="secondary" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
          </div>
        </div>
      )}

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
            <>
              {/* Notes (free text) */}
              {person.notes_markdown && (
                <div className="card">
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{person.notes_markdown}</p>
                </div>
              )}

              {/* Properties grouped by topic — only non-null approved values */}
              {topicsToRender.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    {pendingCount > 0 ? (
                      <>No approved properties yet. <Link to="/review">Review {pendingCount} pending</Link>.</>
                    ) : (
                      <>No properties yet. Write a journal entry tagged to this person.</>
                    )}
                  </p>
                </div>
              ) : (
                topicsToRender.map((topic) => {
                  const rows = propsByTopic.get(topic)!;
                  return (
                    <div key={topic} className="card">
                      <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h3)" }}>
                        {TOPIC_LABEL[topic] ?? topic}
                      </h3>
                      {rows.map((pp, i) => (
                        <div key={pp.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "var(--space-2) 0", gap: "var(--space-3)" }}>
                            <span className="muted">{pp.property_def_name.replace(/_/g, " ")}</span>
                            <span style={{ fontWeight: 500, textAlign: "right" }}>{pp.value_text}</span>
                          </div>
                          {i < rows.length - 1 && <div className="divider" style={{ margin: 0 }} />}
                        </div>
                      ))}
                    </div>
                  );
                })
              )}

              {pendingCount > 0 && topicsToRender.length > 0 && (
                <div className="muted" style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
                  <Link to="/review">{pendingCount} pending property value{pendingCount === 1 ? "" : "s"} →</Link>
                </div>
              )}

              {/* Associations */}
              <h2 style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-2)" }}>Associations</h2>
              <AssociationsPanel personId={personId} />

              {/* Memberships */}
              <h2 style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-2)" }}>Memberships</h2>
              {memberships.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p className="muted" style={{ margin: 0 }}>No org memberships yet.</p>
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

          {tab === "entries" && (
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
