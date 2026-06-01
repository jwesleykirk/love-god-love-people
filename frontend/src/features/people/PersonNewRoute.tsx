import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { lifeStageItems, relationshipCategoryItems } from "@/components/optionItems";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SearchPicker } from "@/components/SearchPicker";
import { createPerson, uploadPersonPhoto, type LifeStage, type RelationshipCategory } from "./api";

export default function PersonNewRoute() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [category, setCategory] = useState<RelationshipCategory>("friend");
  const [lifeStage, setLifeStage] = useState<LifeStage>("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
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
      // If the user picked a photo before submitting, upload it now that we
      // have a person id. A photo failure should not lose the new record, so
      // we surface a soft warning and still navigate.
      if (pendingPhoto) {
        try {
          await uploadPersonPhoto(person.id, pendingPhoto);
        } catch (photoErr) {
          console.warn("photo upload after create failed:", photoErr);
        }
      }
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
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PhotoUpload
            size={96}
            alt={fullName || "new person"}
            onFileChange={setPendingPhoto}
          />
        </div>
        <div><label>Full name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus /></div>
        <div><label>Preferred name (optional)</label><input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} /></div>
        <SearchPicker
          label="Relationship"
          items={relationshipCategoryItems()}
          value={category}
          onChange={(id) => setCategory(id as RelationshipCategory)}
          lockWhenSelected={false}
          placeholder="Search categories…"
          listAriaLabel="Relationship categories"
        />
        <SearchPicker
          label="Life stage (optional)"
          items={lifeStageItems()}
          value={lifeStage}
          onChange={(id) => setLifeStage(id as LifeStage)}
          lockWhenSelected={false}
          placeholder="Search life stages…"
          listAriaLabel="Life stages"
        />
        <div><label>Birthday (optional)</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></div>
        <div><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p style={{ color: "var(--color-warning)" }}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}
