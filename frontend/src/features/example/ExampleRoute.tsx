import { useEffect, useState } from "react";

import { createNote, listNotes, type Note } from "./api";

export default function ExampleRoute() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const { items } = await listNotes();
      setNotes(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    await createNote(draft.trim());
    setDraft("");
    await refresh();
  }

  return (
    <main className="container">
      <h1>Example feature</h1>
      <p>
        Backend: <code>GET/POST /api/example/</code>. Replace this whole feature
        when building something real — copy the structure, keep the boundary.
      </p>
      <form onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note"
          style={{ width: "70%", padding: "0.5em" }}
        />
        <button type="submit" style={{ marginLeft: "0.5em" }}>
          Add
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <ul>
        {notes.map((n) => (
          <li key={n.id}>{n.body}</li>
        ))}
      </ul>
    </main>
  );
}
