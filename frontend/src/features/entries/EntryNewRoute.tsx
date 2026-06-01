import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPeople, type Person } from "../people/api";
import { listOrgs, type Organization } from "../orgs/api";
import { OrgMultiPicker } from "@/components/OrgPicker";
import { PersonMultiPicker } from "@/components/PersonPicker";
import { createEntry } from "./api";

export default function EntryNewRoute() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedP, setSelectedP] = useState<Set<number>>(new Set());
  const [selectedO, setSelectedO] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [pp, oo] = await Promise.all([listPeople(), listOrgs()]);
        if (!cancelled) {
          setPeople(pp.results);
          setOrgs(oo.results);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed loading");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await createEntry({
        content_markdown: content.trim(),
        person_ids: Array.from(selectedP),
        organization_ids: Array.from(selectedO),
      });
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1 style={{ marginBottom: "var(--space-2)" }}>New entry</h1>
      <p className="muted" style={{ marginBottom: "var(--space-6)" }}>
        Tell the page what happened. The AI fills in the structure later.
      </p>

      <form onSubmit={submit}>
        <div className="card card--paper" style={{ marginBottom: "var(--space-6)" }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Walked with Karie tonight — she mentioned her mom's birthday is coming up…"
            autoFocus
            rows={10}
            style={{
              border: "none",
              padding: 0,
              fontSize: "var(--text-body-lg)",
              fontFamily: "var(--font-serif)",
              lineHeight: 1.6,
              minHeight: "10rem",
              background: "transparent",
            }}
          />
        </div>

        <div className="stack-lg">
          {people.length === 0 ? (
            <p className="muted">Add some people first.</p>
          ) : (
            <PersonMultiPicker
              label="Tag people"
              people={people}
              value={selectedP}
              onChange={setSelectedP}
            />
          )}

          {orgs.length === 0 ? (
            <p className="muted">No organizations yet.</p>
          ) : (
            <OrgMultiPicker
              label="Tag organizations (optional)"
              orgs={orgs}
              value={selectedO}
              onChange={setSelectedO}
            />
          )}

          {error && <p className="muted" style={{ color: "var(--color-warning)" }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button type="submit" disabled={busy || !content.trim()} style={{ minWidth: 200 }}>
              {busy ? "Saving…" : "Save entry"}
            </button>
          </div>
          <p className="muted" style={{ textAlign: "center", fontSize: "var(--text-caption)" }}>
            Saves immediately. AI extraction runs in the background.
          </p>
        </div>
      </form>
    </main>
  );
}
