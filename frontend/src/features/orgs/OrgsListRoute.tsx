import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { orgTypeFilterItems } from "@/components/OrgPicker";
import { SearchPicker } from "@/components/SearchPicker";
import { listOrgs, type Organization, type OrgType } from "./api";
import { Illustration } from "@/components/Illustration";

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
        <div className="search-picker--inline">
          <SearchPicker
            items={orgTypeFilterItems()}
            value={orgType}
            onChange={(id) => setOrgType(id as OrgType | "")}
            lockWhenSelected={false}
            placeholder="Filter type…"
            listAriaLabel="Organization types"
          />
        </div>
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
