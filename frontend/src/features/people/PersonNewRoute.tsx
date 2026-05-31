import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPerson, type RelationshipCategory } from "./api";

const CATEGORIES: Array<{ value: RelationshipCategory; label: string }> = [
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family" },
  { value: "bridge_student", label: "Bridge student" },
  { value: "other", label: "Other" },
];

export default function PersonNewRoute() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [category, setCategory] = useState<RelationshipCategory>("friend");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setBusy(true);
    try {
      const person = await createPerson({
        full_name: fullName.trim(),
        preferred_name: preferredName.trim(),
        relationship_category: category,
        notes_markdown: notes,
      });
      navigate(`/people/${person.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Add person</h1>
      <form onSubmit={submit} className="stack">
        <div>
          <label>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </div>
        <div>
          <label>Preferred name (optional)</label>
          <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
        </div>
        <div>
          <label>Relationship</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as RelationshipCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}
