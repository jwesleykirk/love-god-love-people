import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPeople, type Person } from "../people/api";
import { listOrgs, type Organization } from "../orgs/api";
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

  function toggle(set: Set<number>, setter: (s: Set<number>) => void, id: number) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

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
      <h1>New entry</h1>
      <form onSubmit={submit} className="stack">
        <div>
          <label>What happened? Who were you with?</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Walked with Karie tonight — she mentioned her mom's birthday is coming up…"
            autoFocus
            rows={8}
          />
        </div>
        <div>
          <label>Tag people</label>
          {people.length === 0 ? (
            <p className="muted">Add some people first.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {people.map((p) => {
                const on = selectedP.has(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(selectedP, setSelectedP, p.id)}
                    className={on ? "" : "secondary"}
                    style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
                  >
                    {p.preferred_name || p.full_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <label>Tag organizations (optional)</label>
          {orgs.length === 0 ? (
            <p className="muted">No organizations yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {orgs.map((o) => {
                const on = selectedO.has(o.id);
                return (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => toggle(selectedO, setSelectedO, o.id)}
                    className={on ? "" : "secondary"}
                    style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}
                  >
                    {o.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={busy || !content.trim()}>{busy ? "Saving…" : "Save entry"}</button>
        <p className="muted">
          Saves immediately. AI extraction runs in the background — results appear in <a href="/review">Review</a>.
        </p>
      </form>
    </main>
  );
}
