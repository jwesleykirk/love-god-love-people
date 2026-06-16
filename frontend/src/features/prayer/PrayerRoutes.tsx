import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchGroups, fetchPeople, fetchTopic, fetchTopicHistory, saveTopic } from "../api";
import type { Person, Group, PrayerTopic, TargetFrequency } from "../types";

const FREQUENCIES: { value: TargetFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function PrayerFormRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attach, setAttach] = useState<"none" | "person" | "group">("none");
  const [form, setForm] = useState<Partial<PrayerTopic>>({
    topic_text: "",
    target_frequency: "weekly",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchPeople().then(setPeople);
    void fetchGroups().then(setGroups);
    if (id) {
      void fetchTopic(Number(id)).then((t) => {
        setForm(t);
        if (t.person_id) setAttach("person");
        else if (t.group_id) setAttach("group");
        else setAttach("none");
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      person_id: attach === "person" ? form.person_id : null,
      group_id: attach === "group" ? form.group_id : null,
    };
    try {
      const saved = await saveTopic(payload, id ? Number(id) : undefined);
      navigate(`/prayer/${saved.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container stack-lg">
      <Link to={isEdit ? `/prayer/${id}` : "/prayer"} className="session-back">← Back</Link>
      <h1>{isEdit ? "Edit topic" : "New prayer topic"}</h1>
      <form className="stack-lg" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label>Attach to</label>
          <select value={attach} onChange={(e) => setAttach(e.target.value as typeof attach)}>
            <option value="none">General</option>
            <option value="person">Person</option>
            <option value="group">Group</option>
          </select>
        </div>
        {attach === "person" && (
          <div>
            <label>Person</label>
            <select
              value={form.person_id ?? ""}
              onChange={(e) => setForm({ ...form, person_id: Number(e.target.value) })}
            >
              <option value="">Select…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        {attach === "group" && (
          <div>
            <label>Group</label>
            <select
              value={form.group_id ?? ""}
              onChange={(e) => setForm({ ...form, group_id: Number(e.target.value) })}
            >
              <option value="">Select…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label>Pray for…</label>
          <input
            required
            placeholder="their career, health, faith…"
            value={form.topic_text ?? ""}
            onChange={(e) => setForm({ ...form, topic_text: e.target.value })}
          />
        </div>
        <div>
          <label>Frequency</label>
          <select
            value={form.target_frequency ?? "weekly"}
            onChange={(e) => setForm({ ...form, target_frequency: e.target.value as TargetFrequency })}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        {form.narration_text && (
          <p className="muted">Narration: {form.narration_text}</p>
        )}
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
    </main>
  );
}

export function PrayerDetailRoute() {
  const { id } = useParams();
  const [topic, setTopic] = useState<PrayerTopic | null>(null);
  const [history, setHistory] = useState<Array<{ prayed_on: string; answered: boolean; answer_note: string }>>([]);

  useEffect(() => {
    if (id) {
      void fetchTopic(Number(id)).then(setTopic);
      void fetchTopicHistory(Number(id)).then(setHistory);
    }
  }, [id]);

  if (!topic) return <main className="container"><p className="muted">Loading…</p></main>;

  return (
    <main className="container stack-lg">
      <Link to="/prayer" className="session-back">← Prayer</Link>
      <h1>{topic.narration_text || topic.topic_text}</h1>
      <div className="card stack">
        <p className="muted">{topic.target_frequency}</p>
        {topic.person && <p>For {topic.person.name}</p>}
        {topic.group && <p>For group {topic.group.name}</p>}
        {topic.answered_date && <p className="pill pill--success">Answered {topic.answered_date}</p>}
        {topic.answer_note && <p>{topic.answer_note}</p>}
      </div>
      <h2>History</h2>
      <ul className="bare">
        {history.map((h, i) => (
          <li key={i}>
            {h.prayed_on}
            {h.answered && " · answered"}
            {h.answer_note && ` — ${h.answer_note}`}
          </li>
        ))}
      </ul>
      {!topic.answered_date && <Link className="action-link" to={`/prayer/${id}/edit`}>Edit</Link>}
    </main>
  );
}
