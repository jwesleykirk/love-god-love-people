import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPerson, LIFE_STAGES, RELATIONSHIP_CATEGORIES, type LifeStage, type RelationshipCategory } from "./api";

export default function PersonNewRoute() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [category, setCategory] = useState<RelationshipCategory>("friend");
  const [lifeStage, setLifeStage] = useState<LifeStage>("");
  const [birthday, setBirthday] = useState("");
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
        life_stage: lifeStage,
        birthday: birthday || null,
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
      <form onSubmit={submit} className="card stack">
        <div><label>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus /></div>
        <div><label>Preferred name (optional)</label><input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} /></div>
        <div><label>Relationship</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as RelationshipCategory)}>
            {RELATIONSHIP_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div><label>Life stage (optional)</label>
          <select value={lifeStage} onChange={(e) => setLifeStage(e.target.value as LifeStage)}>
            {LIFE_STAGES.map((s) => <option key={s.value || "none"} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div><label>Birthday (optional)</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></div>
        <div><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p style={{ color: "var(--color-warning)" }}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}
