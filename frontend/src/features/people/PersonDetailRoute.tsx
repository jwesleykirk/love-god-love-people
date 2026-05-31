import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPerson, listPersonProperties, type Person, type PersonProperty } from "./api";
import { listEntries, type JournalEntry } from "../entries/api";

export default function PersonDetailRoute() {
  const params = useParams<{ id: string }>();
  const personId = Number(params.id);
  const [person, setPerson] = useState<Person | null>(null);
  const [properties, setProperties] = useState<PersonProperty[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [p, props, ents] = await Promise.all([
          getPerson(personId),
          listPersonProperties(personId),
          listEntries({ personId }),
        ]);
        if (!cancelled) {
          setPerson(p);
          setProperties(props.results);
          setEntries(ents.results);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => { cancelled = true; };
  }, [personId]);

  if (error) return <main className="container"><p style={{ color: "crimson" }}>{error}</p></main>;
  if (!person) return <main className="container"><p className="muted">Loading…</p></main>;

  // Group properties by approval status
  const approved = properties.filter((p) => p.status === "approved" || p.status === "edited");
  const pending = properties.filter((p) => p.status === "pending_review");

  return (
    <main className="container">
      <Link to="/">← People</Link>
      <h1>{person.preferred_name || person.full_name}</h1>
      <p className="muted">
        {person.full_name} · <span className="pill">{person.relationship_category.replace("_", " ")}</span>
      </p>

      {person.notes_markdown && (
        <div className="card">
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{person.notes_markdown}</p>
        </div>
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
