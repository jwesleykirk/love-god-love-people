import { useEffect, useState } from "react";
import {
  approveProperty,
  editPropertyValue,
  getPending,
  rejectProperty,
  type PendingResponse,
  type PendingValue,
} from "./api";

export default function ReviewRoute() {
  const [data, setData] = useState<PendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    try {
      const next = await getPending();
      setData(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await fn();
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <main className="container"><p style={{ color: "crimson" }}>{error}</p></main>;
  if (!data) return <main className="container"><p className="muted">Loading…</p></main>;

  return (
    <main className="container">
      <h1>Review</h1>
      <p className="muted">
        Pending property values extracted by AI. Approve, edit, or reject each one.
      </p>

      {data.errors.length > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Extraction errors</h2>
          {data.errors.map((e) => (
            <div className="card" key={e.entry_id}>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {new Date(e.entry_created_at).toLocaleString()} · entry #{e.entry_id}
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: "0.3rem" }}>{e.entry_content}</div>
              <div style={{ color: "var(--bad)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
                {e.error}
              </div>
            </div>
          ))}
        </section>
      )}

      {data.entries.length === 0 ? (
        <p className="muted" style={{ marginTop: "2rem" }}>
          Nothing to review. Either no entries have been processed yet, or
          everything's been resolved.
        </p>
      ) : (
        data.entries.map((group) => (
          <section key={group.entry_id ?? "orphan"} className="card">
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {group.entry_created_at && new Date(group.entry_created_at).toLocaleString()}
              {" · "}
              <span className="pill">{group.prompt_version}</span>
              {" "}
              <span className="pill">{group.model}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", margin: "0.5rem 0 1rem" }}>
              {group.entry_content}
            </div>
            <ul className="bare">
              {group.values.map((v) => (
                <PendingRow
                  key={v.id}
                  value={v}
                  busy={busyId === v.id}
                  onApprove={() => act(v.id, () => approveProperty(v.id))}
                  onReject={() => act(v.id, () => rejectProperty(v.id))}
                  onEdit={(text) => act(v.id, () => editPropertyValue(v.id, text))}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

function PendingRow({
  value,
  busy,
  onApprove,
  onReject,
  onEdit,
}: {
  value: PendingValue;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.value_text);

  return (
    <li>
      <div>
        <strong>{value.person_name}</strong> · <em>{value.property_def_name}:</em>{" "}
        {editing ? (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} style={{ display: "inline-block", width: "60%" }} />
        ) : (
          <span>{value.value_text}</span>
        )}
        <span className="pill" style={{ marginLeft: "0.5rem" }}>
          conf {value.ai_confidence.toFixed(2)}
        </span>
      </div>
      <div className="row" style={{ marginTop: "0.4rem", gap: "0.4rem" }}>
        {editing ? (
          <>
            <button disabled={busy} onClick={() => onEdit(draft)}>Save</button>
            <button className="secondary" onClick={() => { setEditing(false); setDraft(value.value_text); }}>Cancel</button>
          </>
        ) : (
          <>
            <button disabled={busy} onClick={onApprove}>Approve</button>
            <button className="secondary" disabled={busy} onClick={() => setEditing(true)}>Edit</button>
            <button className="danger" disabled={busy} onClick={onReject}>Reject</button>
          </>
        )}
      </div>
    </li>
  );
}
