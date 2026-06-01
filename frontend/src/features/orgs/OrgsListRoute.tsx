import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrgs, ORG_TYPES, type Organization, type OrgType } from "./api";
import { Illustration } from "@/components/Illustration";

const FILTERS: Array<{ value: OrgType | ""; label: string }> = [
  { value: "", label: "All" },
  ...ORG_TYPES,
];

const ORG_TYPE_LABEL: Record<string, string> = {
  church: "Church",
  ministry: "Ministry",
  work: "Work",
  school: "School",
  community: "Community",
  household: "Household",
  other: "Other",
};

export default function OrgsListRoute() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [q, setQ] = useState("");
  const [orgType, setOrgType] = useState<OrgType | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await listOrgs({ q, org_type: orgType });
        if (!cancelled) {
          setOrgs(resp.results);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => { cancelled = true; };
  }, [q, orgType]);

  return (
    <main className="container">
      <div className="row row--between" style={{ marginBottom: "var(--space-4)" }}>
        <h1 style={{ margin: 0 }}>Organizations</h1>
        <Link to="/orgs/new"><button className="secondary">+ Add</button></Link>
      </div>
      <div className="row row--wrap" style={{ marginBottom: "var(--space-4)", gap: "var(--space-2)" }}>
        <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType | "")} style={{ width: "auto", flexShrink: 0 }}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {error && <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>}
      {orgs.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">No organizations yet.</p>
          <Link to="/orgs/new"><button className="primary-pill">Add your first</button></Link>
        </div>
      ) : (
        <div className="stack">
          {orgs.map((o) => (
            <Link
              to={`/orgs/${o.id}`}
              key={o.id}
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
              {/* ILLUSTRATION_PLACEHOLDER: org-{org_type}.svg */}
              <Illustration slot={`org-${o.org_type}`} size="lg" label={o.org_type[0].toUpperCase()} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--color-text)", fontSize: "var(--text-body-lg)", fontWeight: 600, fontFamily: "var(--font-serif)" }}>
                  {o.name}
                </div>
                {o.parent_name && (
                  <div className="muted" style={{ fontSize: "var(--text-caption)" }}>↑ {o.parent_name}</div>
                )}
              </div>
              <div className="row row--wrap" style={{ gap: "var(--space-1)" }}>
                <span className="chip">{ORG_TYPE_LABEL[o.org_type] ?? o.org_type}</span>
                {o.child_count > 0 && <span className="chip">{o.child_count} sub</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
