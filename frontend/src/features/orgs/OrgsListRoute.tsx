import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrgs, ORG_TYPES, type Organization, type OrgType } from "./api";

const FILTERS: Array<{ value: OrgType | ""; label: string }> = [
  { value: "", label: "All" },
  ...ORG_TYPES,
];

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
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Organizations</h1>
        <Link to="/orgs/new">+ Add organization</Link>
      </div>
      <div className="row stack" style={{ marginTop: "1rem", gap: "0.5rem" }}>
        <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType | "")}>
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {orgs.length === 0 ? (
        <p className="muted" style={{ marginTop: "2rem" }}>
          No organizations yet. <Link to="/orgs/new">Add your first</Link>.
        </p>
      ) : (
        <ul className="bare" style={{ marginTop: "1rem" }}>
          {orgs.map((o) => (
            <li key={o.id}>
              <Link to={`/orgs/${o.id}`}><strong>{o.name}</strong></Link>
              <span className="pill" style={{ marginLeft: "0.5rem" }}>{o.org_type}</span>
              {o.parent_name && <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>↑ {o.parent_name}</span>}
              {o.child_count > 0 && <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>· {o.child_count} child{o.child_count === 1 ? "" : "ren"}</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
