import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createMembership, deleteMembership, getOrg, listMemberships, listOrgs, ORG_TYPES, updateOrg, type Membership, type Organization, type OrgType } from "./api";
import { listPeople, type Person } from "../people/api";

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

  if (error) return <main className="container"><p style={{ color: "crimson" }}>{error}</p></main>;
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
      <Link to="/orgs">← Organizations</Link>
      {editing ? (
        <div className="stack" style={{ marginTop: "1rem" }}>
          <div><label>Name</label><input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></div>
          <div><label>Type</label>
            <select value={draftType} onChange={(e) => setDraftType(e.target.value as OrgType)}>
              {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label>Notes</label><textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} /></div>
          <div className="row" style={{ gap: "0.5rem" }}>
            <button onClick={saveEdit}>Save</button>
            <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h1 style={{ marginBottom: 0 }}>{org.name}</h1>
            <button className="secondary" onClick={() => setEditing(true)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}>Edit</button>
          </div>
          <p className="muted">
            <span className="pill">{org.org_type}</span>
            {org.parent_name && <> · inside <Link to={`/orgs/${org.parent}`}>{org.parent_name}</Link></>}
          </p>
          {org.notes_markdown && <div className="card"><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{org.notes_markdown}</p></div>}
        </>
      )}

      <section style={{ marginTop: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Members</h2>
          <button className="secondary" onClick={() => setShowAddMember(!showAddMember)} style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}>
            {showAddMember ? "Cancel" : "+ Add"}
          </button>
        </div>
        {showAddMember && (
          <div className="card stack">
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
            <button onClick={addMember} disabled={!memberPersonId}>Add member</button>
          </div>
        )}
        {memberships.length === 0 ? (
          <p className="muted">No members yet.</p>
        ) : (
          <ul className="bare">
            {memberships.map((m) => (
              <li key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <span>
                  <Link to={`/people/${m.person}`}>{m.person_name}</Link>
                  {m.role && <span className="muted" style={{ marginLeft: "0.5rem" }}>· {m.role}</span>}
                  {!m.current && <span className="pill" style={{ marginLeft: "0.5rem" }}>past</span>}
                </span>
                <button className="danger" onClick={() => removeMember(m.id)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {children.length > 0 && (
        <section style={{ marginTop: "1rem" }}>
          <h2 style={{ margin: 0 }}>Sub-organizations</h2>
          <ul className="bare">
            {children.map((c) => (
              <li key={c.id}>
                <Link to={`/orgs/${c.id}`}>{c.name}</Link>
                <span className="pill" style={{ marginLeft: "0.5rem" }}>{c.org_type}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
