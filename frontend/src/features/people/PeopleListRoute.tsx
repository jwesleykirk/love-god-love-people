import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listPeople, RELATIONSHIP_CATEGORIES, type Person, type RelationshipCategory } from "./api";
import { listEntries, type JournalEntry } from "../entries/api";

const FILTERS: Array<{ value: RelationshipCategory | ""; label: string }> = [
  { value: "", label: "All" },
  ...RELATIONSHIP_CATEGORIES,
];

const POLL_MS = 5000;

export default function PeopleListRoute() {
  const [people, setPeople] = useState<Person[]>([]);
  const [recent, setRecent] = useState<JournalEntry[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<RelationshipCategory | "">("");
  const [error, setError] = useState<string | null>(null);
  const peopleById = useRef<Map<number, Person>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await listPeople({ q, category });
        if (!cancelled) {
          setPeople(resp.results);
          peopleById.current = new Map(resp.results.map((p) => [p.id, p]));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => { cancelled = true; };
  }, [q, category]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function pull() {
      try {
        const resp = await listEntries();
        if (cancelled) return;
        const recent6 = resp.results.slice(0, 6);
        setRecent(recent6);
        const anyInFlight = recent6.some(
          (e) => e.extraction_status === "pending" || e.extraction_status === "running",
        );
        if (anyInFlight) {
          timer = setTimeout(pull, POLL_MS);
        }
      } catch { /* silent */ }
    }
    void pull();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>People</h1>
        <Link to="/people/new">+ Add person</Link>
      </div>
      <div className="row stack" style={{ marginTop: "1rem", gap: "0.5rem" }}>
        <input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value as RelationshipCategory | "")}>
          {FILTERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {people.length === 0 ? (
        <p className="muted" style={{ marginTop: "2rem" }}>
          No people yet. <Link to="/people/new">Add your first person</Link>.
        </p>
      ) : (
        <ul className="bare" style={{ marginTop: "1rem" }}>
          {people.map((p) => (
            <li key={p.id}>
              <Link to={`/people/${p.id}`}><strong>{p.preferred_name || p.full_name}</strong></Link>
              <span className="pill" style={{ marginLeft: "0.5rem" }}>{p.relationship_category}</span>
              {p.life_stage && <span className="pill" style={{ marginLeft: "0.3rem" }}>{p.life_stage.replace("_", " ")}</span>}
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <section style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Recent entries</h2>
          <ul className="bare">
            {recent.map((e) => {
              const tagged = e.person_id_list
                .map((id) => peopleById.current.get(id)?.preferred_name || peopleById.current.get(id)?.full_name)
                .filter(Boolean)
                .join(", ");
              return (
                <li key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {new Date(e.created_at).toLocaleString()}
                      {tagged && ` · ${tagged}`}
                    </div>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.content_markdown}
                    </div>
                  </div>
                  <StatusPill status={e.extraction_status} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: JournalEntry["extraction_status"] }) {
  const map: Record<JournalEntry["extraction_status"], { label: string; color: string }> = {
    pending: { label: "queued", color: "var(--muted)" },
    running: { label: "AI…", color: "var(--warn)" },
    done: { label: "done", color: "var(--good)" },
    skipped: { label: "AI off", color: "var(--muted)" },
    error: { label: "error", color: "var(--bad)" },
  };
  const m = map[status] ?? { label: status, color: "var(--muted)" };
  return (
    <span className="pill" style={{ color: m.color, borderColor: m.color, alignSelf: "center", flexShrink: 0 }}>
      {m.label}
    </span>
  );
}
