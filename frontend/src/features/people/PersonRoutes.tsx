import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchPerson, savePerson } from "../api";
import type { Child, LifeStage, Person } from "../types";

const LIFE_STAGES: { value: LifeStage; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "adult", label: "Adult" },
];

const emptyChild = (): Child => ({ name: "", birthdate: null, birth_year: null });

export function PersonFormRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<Partial<Person>>({
    name: "",
    life_stage: "adult",
    career: "",
    school: "",
    major: "",
    partner_name: "",
    notes: "",
    children: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      void fetchPerson(Number(id)).then(setForm);
    }
  }, [id]);

  const schoolLabel = form.life_stage === "student" ? "School" : "Alma Mater";

  const updateChild = (idx: number, patch: Partial<Child>) => {
    const children = [...(form.children ?? [])];
    children[idx] = { ...children[idx], ...patch };
    setForm({ ...form, children });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await savePerson(form, id ? Number(id) : undefined);
      navigate(`/people/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container stack-lg">
      <Link to={isEdit ? `/people/${id}` : "/people"} className="session-back">← Back</Link>
      <h1>{isEdit ? "Edit person" : "New person"}</h1>
      <form className="stack-lg" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label>Name</label>
          <input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label>Life stage</label>
          <select
            value={form.life_stage ?? "adult"}
            onChange={(e) => setForm({ ...form, life_stage: e.target.value as LifeStage })}
          >
            {LIFE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Career</label>
          <input value={form.career ?? ""} onChange={(e) => setForm({ ...form, career: e.target.value })} />
        </div>
        <div>
          <label>{schoolLabel}</label>
          <input value={form.school ?? ""} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        </div>
        <div>
          <label>Major</label>
          <input value={form.major ?? ""} onChange={(e) => setForm({ ...form, major: e.target.value })} />
        </div>
        <div>
          <label>Partner name</label>
          <input value={form.partner_name ?? ""} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} />
        </div>

        <div className="stack">
          <div className="row row--between">
            <h3>Children</h3>
            <button type="button" className="secondary" onClick={() => setForm({ ...form, children: [...(form.children ?? []), emptyChild()] })}>
              + Add child
            </button>
          </div>
          {(form.children ?? []).map((child, idx) => (
            <div key={idx} className="card card--inset stack">
              <input
                placeholder="Name"
                value={child.name}
                onChange={(e) => updateChild(idx, { name: e.target.value })}
              />
              <input
                type="date"
                placeholder="Birthdate"
                value={child.birthdate ?? ""}
                onChange={(e) => updateChild(idx, { birthdate: e.target.value || null, birth_year: null })}
              />
              <input
                type="number"
                placeholder="Or birth year"
                value={child.birth_year ?? ""}
                onChange={(e) => updateChild(idx, { birth_year: e.target.value ? Number(e.target.value) : null, birthdate: null })}
              />
            </div>
          ))}
        </div>

        <div>
          <label>Notes</label>
          <textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}

export function PersonDetailRoute() {
  const { id } = useParams();
  const [person, setPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (id) void fetchPerson(Number(id)).then(setPerson);
  }, [id]);

  if (!person) return <main className="container"><p className="muted">Loading…</p></main>;

  const schoolLabel = person.life_stage === "student" ? "School" : "Alma Mater";

  return (
    <main className="container stack-lg">
      <Link to="/people" className="session-back">← People</Link>
      <h1>{person.name}</h1>
      <div className="card stack">
        <p><span className="muted">Life stage</span><br />{person.life_stage}</p>
        {person.career && <p><span className="muted">Career</span><br />{person.career}</p>}
        {person.school && <p><span className="muted">{schoolLabel}</span><br />{person.school}</p>}
        {person.major && <p><span className="muted">Major</span><br />{person.major}</p>}
        {person.partner_name && <p><span className="muted">Partner</span><br />{person.partner_name}</p>}
        {(person.children ?? []).length > 0 && (
          <div>
            <span className="muted">Children</span>
            <ul className="bare">
              {person.children!.map((c, i) => (
                <li key={i}>{c.name}{c.age_display ? ` · ${c.age_display}` : ""}</li>
              ))}
            </ul>
          </div>
        )}
        {person.notes && <p><span className="muted">Notes</span><br />{person.notes}</p>}
      </div>
      <Link className="action-link" to={`/people/${id}/edit`}>Edit</Link>
    </main>
  );
}
