import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPeople, type Person, type RelationshipCategory } from "./api";

const CATEGORIES: Array<{ value: RelationshipCategory | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "friend", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "bridge_student", label: "Bridge students" },
  { value: "other", label: "Other" },
];

export default function PeopleListRoute() {
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<RelationshipCategory | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await listPeople({ q, category });
        if (!cancelled) {
          setPeople(resp.results);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => { cancelled = true; };
  }, [q, category]);

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>People</h1>
        <Link to="/people/new">+ Add person</Link>
      </div>

      <div className="row stack" style={{ marginTop: "1rem", gap: "0.5rem" }}>
        <input
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as RelationshipCategory | "")}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
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
              <Link to={`/people/${p.id}`}>
                <strong>{p.preferred_name || p.full_name}</strong>
              </Link>
              <span className="pill" style={{ marginLeft: "0.5rem" }}>
                {p.relationship_category.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
