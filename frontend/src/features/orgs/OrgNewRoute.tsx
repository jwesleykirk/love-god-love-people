import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrgPicker, orgTypePickerItems } from "@/components/OrgPicker";
import { SearchPicker } from "@/components/SearchPicker";
import { createOrg, listOrgs, type Organization, type OrgType } from "./api";

export default function OrgNewRoute() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("church");
  const [parent, setParent] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [parents, setParents] = useState<Organization[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resp = await listOrgs();
        setParents(resp.results);
      } catch { /* ignore */ }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const org = await createOrg({
        name: name.trim(),
        org_type: orgType,
        parent: parent === "" ? null : parent,
        notes_markdown: notes,
      });
      navigate(`/orgs/${org.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Add organization</h1>
      <form onSubmit={submit} className="card stack">
        <div><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <SearchPicker
          label="Type"
          items={orgTypePickerItems()}
          value={orgType}
          onChange={(id) => setOrgType(id as OrgType)}
          lockWhenSelected={false}
          placeholder="Search types…"
          listAriaLabel="Organization types"
        />
        <OrgPicker
          label="Parent organization (optional)"
          orgs={parents}
          value={parent}
          onChange={setParent}
          allowEmpty
          emptyOptionLabel="— none —"
        />
        <div><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p style={{ color: "var(--color-warning)" }}>{error}</p>}
        <button type="submit" disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}
