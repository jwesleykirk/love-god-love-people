import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPeople, type Person } from "../people/api";
import { createEntry } from "./api";

export default function EntryNewRoute() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await listPeople();
        if (!cancelled) setPeople(resp.results);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed loading people");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await createEntry({
        content_markdown: content.trim(),
        person_ids: Array.from(selected),
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
          <label>Who's this about? (tag one or more)</label>
          {people.length === 0 ? (
            <p className="muted">Add some people first.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {people.map((p) => {
                const on = selected.has(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(p.id)}
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
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={busy || !content.trim()}>
          {busy ? "Saving…" : "Save entry"}
        </button>
        <p className="muted">
          Saves immediately. AI extraction runs in the background — results appear in <a href="/review">Review</a>.
        </p>
      </form>
    </main>
  );
}
