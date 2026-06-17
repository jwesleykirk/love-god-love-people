import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "@/lib/api";
import { commitPrayerImport, fetchGroups, fetchPeople, previewPrayerImport } from "../api";
import type { Group, Person, PrayerImportSuggestion, TargetFrequency } from "../types";

type AttachType = "none" | "person" | "group";

type EditableSuggestion = PrayerImportSuggestion & {
  accepted: boolean;
  attach: AttachType;
};

const FREQUENCIES: { value: TargetFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function initialAttach(suggestion: PrayerImportSuggestion): AttachType {
  if (suggestion.person_id) return "person";
  if (suggestion.group_id) return "group";
  return "none";
}

function initialTopicText(suggestion: PrayerImportSuggestion): string {
  if (!suggestion.name || suggestion.person_id || suggestion.group_id) {
    return suggestion.topic_text;
  }
  return `${suggestion.name}: ${suggestion.topic_text}`;
}

function isReadyToImport(suggestion: EditableSuggestion): boolean {
  if (!suggestion.accepted || !suggestion.topic_text.trim()) return false;
  if (suggestion.attach === "person") return Boolean(suggestion.person_id);
  if (suggestion.attach === "group") return Boolean(suggestion.group_id);
  return true;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = typeof error.body === "object" && error.body && "detail" in error.body
      ? String((error.body as { detail: unknown }).detail)
      : "";
    if (error.status === 503) {
      return detail || "OpenRouter is not configured yet, so the list cannot be parsed.";
    }
    return detail || "Something went wrong with the import.";
  }
  return "Something went wrong with the import.";
}

export function PrayerImportRoute() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchPeople().then(setPeople);
    void fetchGroups().then(setGroups);
  }, []);

  const acceptedCount = useMemo(
    () => suggestions.filter(isReadyToImport).length,
    [suggestions],
  );

  const updateSuggestion = (clientId: string, patch: Partial<EditableSuggestion>) => {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.client_id === clientId ? { ...suggestion, ...patch } : suggestion,
      ),
    );
  };

  const handlePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuggestions([]);
    try {
      const result = await previewPrayerImport(text);
      setSuggestions(result.suggestions.map((suggestion) => ({
        ...suggestion,
        accepted: true,
        attach: initialAttach(suggestion),
        topic_text: initialTopicText(suggestion),
      })));
      if (result.suggestions.length === 0) {
        setError("No clear prayer requests were found. Try pasting more context or formatting each line as name — request.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setSaving(true);
    setError("");
    const topics = suggestions
      .filter(isReadyToImport)
      .map((suggestion) => ({
        topic_text: suggestion.topic_text.trim(),
        target_frequency: suggestion.target_frequency,
        person_id: suggestion.attach === "person" ? suggestion.person_id ?? null : null,
        group_id: suggestion.attach === "group" ? suggestion.group_id ?? null : null,
      }));

    try {
      await commitPrayerImport(topics);
      navigate("/prayer");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container stack-lg">
      <Link to="/prayer" className="session-back">← Prayer</Link>
      <header>
        <p className="meta-label">Import</p>
        <h1>Paste a prayer list</h1>
        <p className="section-sub">
          Paste notes, bullets, emails, or any text with names and requests. AI will suggest topics,
          then you can revise and accept each one before anything is saved.
        </p>
      </header>

      <form className="card stack" onSubmit={(event) => void handlePreview(event)}>
        <div>
          <label htmlFor="prayer-import-text">Prayer list text</label>
          <textarea
            id="prayer-import-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"Sarah — job interview Friday\nMen's group: retreat planning\nMom is recovering from surgery"}
            rows={8}
            maxLength={12000}
          />
          <p className="muted">{text.length.toLocaleString()} / 12,000 characters</p>
        </div>
        <button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Reading list…" : "Suggest prayer topics"}
        </button>
      </form>

      {error && <p className="card card--inset">{error}</p>}

      {suggestions.length > 0 && (
        <section className="stack-lg">
          <div>
            <h2>Review suggestions</h2>
            <p className="section-sub">
              Leave accepted topics checked, or edit the wording, frequency, and attachment before importing.
            </p>
          </div>

          {suggestions.map((suggestion, index) => (
            <article key={suggestion.client_id} className="card stack">
              <label className="row row--between" style={{ marginTop: 0 }}>
                <span>
                  Accept topic {index + 1}
                  {suggestion.name && (
                    <span className="muted" style={{ display: "block" }}>
                      Suggested for {suggestion.name}
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={suggestion.accepted}
                  onChange={(event) => updateSuggestion(suggestion.client_id, { accepted: event.target.checked })}
                  style={{ width: "auto" }}
                />
              </label>

              <div>
                <label htmlFor={`${suggestion.client_id}-topic`}>Prayer topic</label>
                <input
                  id={`${suggestion.client_id}-topic`}
                  value={suggestion.topic_text}
                  onChange={(event) => updateSuggestion(suggestion.client_id, { topic_text: event.target.value })}
                  disabled={!suggestion.accepted}
                />
              </div>

              <div>
                <label htmlFor={`${suggestion.client_id}-frequency`}>Frequency</label>
                <select
                  id={`${suggestion.client_id}-frequency`}
                  value={suggestion.target_frequency}
                  onChange={(event) =>
                    updateSuggestion(suggestion.client_id, {
                      target_frequency: event.target.value as TargetFrequency,
                    })
                  }
                  disabled={!suggestion.accepted}
                >
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${suggestion.client_id}-attach`}>Attach to</label>
                <select
                  id={`${suggestion.client_id}-attach`}
                  value={suggestion.attach}
                  onChange={(event) =>
                    updateSuggestion(suggestion.client_id, {
                      attach: event.target.value as AttachType,
                      person_id: null,
                      group_id: null,
                    })
                  }
                  disabled={!suggestion.accepted}
                >
                  <option value="none">General</option>
                  <option value="person">Person</option>
                  <option value="group">Group</option>
                </select>
              </div>

              {suggestion.attach === "person" && (
                <div>
                  <label htmlFor={`${suggestion.client_id}-person`}>Person</label>
                  <select
                    id={`${suggestion.client_id}-person`}
                    value={suggestion.person_id ?? ""}
                    onChange={(event) =>
                      updateSuggestion(suggestion.client_id, {
                        person_id: event.target.value ? Number(event.target.value) : null,
                        group_id: null,
                      })
                    }
                    disabled={!suggestion.accepted}
                  >
                    <option value="">Choose a person…</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                  {!suggestion.person_id && suggestion.accepted && (
                    <p className="muted">Choose a person, or switch back to General.</p>
                  )}
                </div>
              )}

              {suggestion.attach === "group" && (
                <div>
                  <label htmlFor={`${suggestion.client_id}-group`}>Group</label>
                  <select
                    id={`${suggestion.client_id}-group`}
                    value={suggestion.group_id ?? ""}
                    onChange={(event) =>
                      updateSuggestion(suggestion.client_id, {
                        group_id: event.target.value ? Number(event.target.value) : null,
                        person_id: null,
                      })
                    }
                    disabled={!suggestion.accepted}
                  >
                    <option value="">Choose a group…</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  {!suggestion.group_id && suggestion.accepted && (
                    <p className="muted">Choose a group, or switch back to General.</p>
                  )}
                </div>
              )}

              {suggestion.name && !suggestion.person_id && !suggestion.group_id && (
                <p className="muted">
                  No existing person or group was matched automatically. Save as general, or choose an existing record.
                </p>
              )}
            </article>
          ))}

          <button
            type="button"
            className="btn-primary"
            disabled={saving || acceptedCount === 0}
            onClick={() => void handleImport()}
          >
            {saving ? "Importing…" : `Import ${acceptedCount} accepted topic${acceptedCount === 1 ? "" : "s"}`}
          </button>
        </section>
      )}
    </main>
  );
}
