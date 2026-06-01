import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createMembership, deleteMembership, getOrg, listMemberships, listOrgs, ORG_TYPES, updateOrg, type Membership, type Organization, type OrgType } from "./api";
import { listPeople, type Person } from "../people/api";
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

export default function OrgDetailRoute() {
  const params = useParams<{ id: string }>();
  const orgId = Number(params.id);
  const [org, setOrg] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [children, setChildren] = useState<Organization[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<OrgType>("other");
  const [draftNotes, setDraftNotes] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberPersonId, setMemberPersonId] = useState<number | "">("");
  const [memberRole, setMemberRole] = useState("");

  async function load() {
    try {
      const [o, ms, kids, pp] = await Promise.all([
        getOrg(orgId),
        listMemberships({ organization_id: orgId }),
        listOrgs({ parent_id: orgId }),
        listPeople(),
      ]);
      setOrg(o);
      setMemberships(ms.results);
      setChildren(kids.results);
      setPeople(pp.results);
      setDraftName(o.name);
      setDraftType(o.org_type);
      setDraftNotes(o.notes_markdown);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  useEffect(() => { void load(); }, [orgId]);

  if (error) return <main className="container"><p style={{ color: "var(--color-warning)" }}>{error}</p></main>;
  if (!org) return <main className="container"><p className="muted">Loading…</p></main>;

  async function saveEdit() {
    await updateOrg(orgId, { name: draftName, org_type: draftType, notes_markdown: draftNotes });
    setEditing(false);
    await load();
  }

  async function addMember() {
    if (!memberPersonId) return;
    await createMembership({
      person: memberPersonId as number,
      organization: orgId,
      role: memberRole.trim() || undefined,
    });
    setShowAddMember(false);
    setMemberPersonId("");
    setMemberRole("");
    await load();
  }

  async function removeMember(id: number) {
    await deleteMembership(id);
    await load();
  }

  return (
    <main className="container">
      <Link to="/orgs" style={{ display: "inline-block", marginBottom: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--text-label)" }}>
        ← Organizations
      </Link>

      <div className="card" style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
        {/* ILLUSTRATION_PLACEHOLDER: org-{org_type}.svg */}
        <Illustration slot={`org-${org.org_type}`} size="xl" label={org.org_type[0].toUpperCase()} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{org.name}</h1>
          <div className="row row--wrap" style={{ gap: "var(--space-1)", marginTop: 4 }}>
            <span className="chip">{ORG_TYPE_LABEL[org.org_type] ?? org.org_type}</span>
            {org.parent_name && <span className="muted" style={{ fontSize: "var(--text-label)" }}>inside <Link to={`/orgs/${org.parent}`}>{org.parent_name}</Link></span>}
          </div>
        </div>
        <button className="secondary" onClick={() => setEditing(!editing)} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="card stack">
          <div><label>Name</label><input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></div>
          <div><label>Type</label>
            <select value={draftType} onChange={(e) => setDraftType(e.target.value as OrgType)}>
              {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label>Notes</label><textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} /></div>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button onClick={saveEdit}>Save</button>
            <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!editing && org.notes_markdown && (
        <div className="card">
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{org.notes_markdown}</p>
        </div>
      )}

      <div className="card">
        <div className="row row--between" style={{ marginBottom: "var(--space-3)" }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-h3)" }}>Members</h3>
          <button
            className="secondary"
            onClick={() => setShowAddMember(!showAddMember)}
            style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-caption)" }}
          >
            {showAddMember ? "Cancel" : "+ Add"}
          </button>
        </div>
        {showAddMember && (
          <div className="stack" style={{ marginBottom: "var(--space-4)", padding: "var(--space-3)", background: "var(--color-bg)", borderRadius: "var(--radius-md)" }}>
            <div>
              <label>Person</label>
              <select value={memberPersonId} onChange={(e) => setMemberPersonId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— pick one —</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label>Role (optional)</label>
              <input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} placeholder="e.g. elder, member, student" />
            </div>
            <button onClick={addMember} disabled={!memberPersonId}>Add</button>
          </div>
        )}
        {memberships.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No members yet.</p>
        ) : (
          memberships.map((m, i) => (
            <div key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", gap: "var(--space-2)" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link to={`/people/${m.person}`} style={{ fontWeight: 500, color: "var(--color-text)" }}>{m.person_name}</Link>
                  {m.role && <div className="muted" style={{ fontSize: "var(--text-caption)" }}>{m.role}</div>}
                </div>
                <div className="row" style={{ gap: "var(--space-2)" }}>
                  {!m.current && <span className="chip">past</span>}
                  <button className="secondary" onClick={() => removeMember(m.id)} style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-caption)" }}>×</button>
                </div>
              </div>
              {i < memberships.length - 1 && <div className="divider" style={{ margin: 0 }} />}
            </div>
          ))
        )}
      </div>

      {children.length > 0 && (
        <div className="card">
          <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h3)" }}>Sub-organizations</h3>
          {children.map((c, i) => (
            <div key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0" }}>
                <Link to={`/orgs/${c.id}`} style={{ color: "var(--color-text)" }}>{c.name}</Link>
                <span className="chip">{c.org_type}</span>
              </div>
              {i < children.length - 1 && <div className="divider" style={{ margin: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
