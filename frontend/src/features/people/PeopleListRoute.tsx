import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { relationshipCategoryFilterItems } from "@/components/optionItems";
import { SearchPicker } from "@/components/SearchPicker";
import { listPeople, type Person, type RelationshipCategory } from "./api";
import { Illustration } from "@/components/Illustration";

const CATEGORY_LABEL: Record<string, string> = {
  family: "Family",
  friend: "Friend",
  work: "Work",
  neighbor: "Neighbor",
  ministry: "Ministry",
  other: "Other",
};

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
      <div className="row row--between" style={{ marginBottom: "var(--space-4)" }}>
        <h1 style={{ margin: 0 }}>People</h1>
        <Link to="/people/new"><button className="secondary">+ Add</button></Link>
      </div>

      <div className="row row--wrap" style={{ marginBottom: "var(--space-4)", gap: "var(--space-2)" }}>
        <input
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div className="search-picker--inline">
          <SearchPicker
            items={relationshipCategoryFilterItems()}
            value={category}
            onChange={(id) => setCategory(id as RelationshipCategory | "")}
            lockWhenSelected={false}
            placeholder="Filter category…"
            listAriaLabel="Relationship categories"
          />
        </div>
      </div>

      {error && <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>}

      {people.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">No people yet.</p>
          <Link to="/people/new"><button className="primary-pill">Add your first person</button></Link>
        </div>
      ) : (
        <div className="stack">
          {people.map((p) => (
            <Link
              to={`/people/${p.id}`}
              key={p.id}
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                textDecoration: "none",
                marginBottom: "var(--space-3)",
                padding: "var(--space-4) var(--space-6)",
              }}
            >
              {/* ILLUSTRATION_PLACEHOLDER: {p.relationship_category}.svg */}
              <Illustration
                slot={p.relationship_category}
                size="lg"
                label={p.relationship_category[0].toUpperCase()}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--color-text)", fontSize: "var(--text-body-lg)", fontWeight: 600, fontFamily: "var(--font-serif)" }}>
                  {p.preferred_name || p.full_name}
                </div>
                {p.preferred_name && p.preferred_name !== p.full_name && (
                  <div className="muted" style={{ fontSize: "var(--text-caption)" }}>{p.full_name}</div>
                )}
              </div>
              <div className="row" style={{ gap: "var(--space-2)" }}>
                <span className="chip">{CATEGORY_LABEL[p.relationship_category] ?? p.relationship_category}</span>
                {p.life_stage && <span className="chip">{p.life_stage.replace("_", " ")}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
