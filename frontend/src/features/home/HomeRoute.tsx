import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEntries, type JournalEntry } from "../entries/api";
import { fetchPrayerQueue } from "../prayer/api";
import { fetchFlashcardQueue } from "../remember/api";
import { listPeople, type Person } from "../people/api";
import { Illustration, IllustrationBanner } from "@/components/Illustration";
import { useAuth } from "../auth/AuthProvider";

const POLL_MS = 5000;

function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Quiet morning";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night";
}

function statusPillClass(s: JournalEntry["extraction_status"]) {
  switch (s) {
    case "done": return "pill pill--success";
    case "running": return "pill pill--primary";
    case "error": return "pill pill--warning";
    default: return "pill";
  }
}

function statusLabel(s: JournalEntry["extraction_status"]) {
  switch (s) {
    case "pending": return "queued";
    case "running": return "AI…";
    case "done": return "done";
    case "skipped": return "AI off";
    case "error": return "error";
    default: return s;
  }
}

export default function HomeRoute() {
  const { auth } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [dueFlashcards, setDueFlashcards] = useState(0);
  const [duePrayers, setDuePrayers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pull() {
      try {
        const [ee, pp, flash, prayer] = await Promise.all([
          listEntries(),
          listPeople(),
          fetchFlashcardQueue().catch(() => null),
          fetchPrayerQueue().catch(() => null),
        ]);
        if (cancelled) return;
        setEntries(ee.results.slice(0, 5));
        setPeople(pp.results);
        setDueFlashcards(flash?.stats.due_count ?? 0);
        setDuePrayers(prayer?.stats.due_count ?? 0);
        setError(null);
        if (ee.results.some((e) => e.extraction_status === "pending" || e.extraction_status === "running")) {
          timer = setTimeout(pull, POLL_MS);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      }
    }
    void pull();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const firstName = auth?.user?.first_name || "friend";

  return (
    <main className="container">
      <h1 className="hero-title">{greetingFor()}, {firstName}.</h1>
      <p className="hero-sub">Who is on your heart today?</p>

      <Link to="/pray" className="card card--paper home-prayer-altar">
        <div className="row" style={{ gap: "var(--space-4)", alignItems: "center" }}>
          {/* ILLUSTRATION_PLACEHOLDER: prayer-hero.svg */}
          <Illustration slot="prayer-hero" size="lg" label="prayer" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="home-prayer-altar-title">Prayer time</h2>
            <p className="muted" style={{ margin: 0 }}>
              {duePrayers > 0
                ? `${duePrayers} ${duePrayers === 1 ? "person" : "people"} · guided session`
                : "Begin a quiet guided prayer"}
            </p>
          </div>
        </div>
        <span className="home-prayer-altar-cta">Begin →</span>
      </Link>

      {dueFlashcards > 0 && (
        <Link to="/remember" className="home-remember-link muted">
          Remember · {dueFlashcards} {dueFlashcards === 1 ? "card" : "cards"} due today →
        </Link>
      )}

      {/* Recent journaling */}
      <div className="card">
        <div className="row row--between" style={{ marginBottom: "var(--space-3)" }}>
          <h3 style={{ margin: 0 }}>Recent journaling</h3>
          <Link to="/entries/new">+ Entry</Link>
        </div>
        {error && <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>}
        {entries.length === 0 ? (
          <>
            {/* ILLUSTRATION_PLACEHOLDER: journal-hero.svg */}
            <IllustrationBanner slot="journal-hero" label="No entries yet. Write your first." />
            <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "center" }}>
              <Link to="/entries/new"><button className="primary-pill">Write your first entry</button></Link>
            </div>
          </>
        ) : (
          <ul className="bare">
            {entries.map((e) => {
              const tagged = e.person_id_list
                .map((id) => peopleById.get(id)?.preferred_name || peopleById.get(id)?.full_name)
                .filter(Boolean)
                .join(", ");
              return (
                <li key={e.id}>
                  <div className="row row--between" style={{ marginBottom: 4 }}>
                    <div className="muted" style={{ fontSize: "var(--text-caption)" }}>
                      {new Date(e.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      {tagged && <> · {tagged}</>}
                    </div>
                    <span className={statusPillClass(e.extraction_status)}>{statusLabel(e.extraction_status)}</span>
                  </div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {e.content_markdown}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* People glance */}
      <div className="card">
        <div className="row row--between" style={{ marginBottom: "var(--space-3)" }}>
          <h3 style={{ margin: 0 }}>People</h3>
          <Link to="/people">View all →</Link>
        </div>
        {people.length === 0 ? (
          <p className="muted">No people yet. <Link to="/people/new">Add your first</Link>.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {people.slice(0, 8).map((p) => (
              <Link
                to={`/people/${p.id}`}
                key={p.id}
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}
              >
                {/* ILLUSTRATION_PLACEHOLDER: {category}.svg */}
                <Illustration slot={p.relationship_category} label={p.relationship_category[0].toUpperCase()} />
                <span style={{ color: "var(--color-text)", fontSize: "var(--text-label)" }}>
                  {p.preferred_name || p.full_name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--space-6)", display: "flex", justifyContent: "center" }}>
        <Link to="/entries/new"><button>+ Add entry</button></Link>
      </div>
    </main>
  );
}
