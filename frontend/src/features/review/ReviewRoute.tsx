import { useEffect, useState } from "react";
import {
  approveProperty,
  archivePropertyDef,
  editPropertyValue,
  getPending,
  keepPropertyDef,
  listActivePropertyDefs,
  listNewPropertyDefs,
  mergePropertyDef,
  rejectProperty,
  renamePropertyDef,
  type PendingResponse,
  type PendingValue,
  type PropertyDef,
} from "./api";

type Tab = "values" | "definitions";

export default function ReviewRoute() {
  const [tab, setTab] = useState<Tab>("values");
  return (
    <main className="container">
      <h1>Review</h1>
      <div className="row" style={{ gap: "0.4rem", marginBottom: "1rem" }}>
        <button onClick={() => setTab("values")} className={tab === "values" ? "" : "secondary"}>
          Pending values
        </button>
        <button onClick={() => setTab("definitions")} className={tab === "definitions" ? "" : "secondary"}>
          New properties
        </button>
      </div>
      {tab === "values" ? <PendingValuesPane /> : <NewPropertyDefsPane />}
    </main>
  );
}

// ---------- Pending Values ----------

function PendingValuesPane() {
  const [data, setData] = useState<PendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    try {
      setData(await getPending());
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

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <p className="muted">
        AI-extracted property values. Approve, edit, or reject each one.
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
              <div style={{ color: "var(--bad)", marginTop: "0.5rem", fontSize: "0.85rem" }}>{e.error}</div>
            </div>
          ))}
        </section>
      )}

      {data.entries.length === 0 ? (
        <p className="muted" style={{ marginTop: "2rem" }}>
          Nothing to review here.
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
    </>
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

// ---------- New Property Definitions ----------

function NewPropertyDefsPane() {
  const [items, setItems] = useState<PropertyDef[]>([]);
  const [activeDefs, setActiveDefs] = useState<PropertyDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    try {
      const [newOnes, allActive] = await Promise.all([
        listNewPropertyDefs(),
        listActivePropertyDefs(),
      ]);
      setItems(newOnes.results);
      setActiveDefs(allActive.results);
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

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <>
      <p className="muted">
        Brand-new property types the AI proposed. Keep, rename, merge into an existing one, or archive.
      </p>
      {items.length === 0 ? (
        <p className="muted" style={{ marginTop: "2rem" }}>
          Nothing new to review.
        </p>
      ) : (
        items.map((pd) => (
          <PropertyDefRow
            key={pd.id}
            pd={pd}
            busy={busyId === pd.id}
            activeDefs={activeDefs.filter((x) => x.id !== pd.id)}
            onKeep={() => act(pd.id, () => keepPropertyDef(pd.id))}
            onArchive={() => act(pd.id, () => archivePropertyDef(pd.id))}
            onRename={(name, desc) => act(pd.id, () => renamePropertyDef(pd.id, name, desc))}
            onMerge={(targetId) => act(pd.id, () => mergePropertyDef(pd.id, targetId))}
          />
        ))
      )}
    </>
  );
}

function PropertyDefRow({
  pd,
  busy,
  activeDefs,
  onKeep,
  onArchive,
  onRename,
  onMerge,
}: {
  pd: PropertyDef;
  busy: boolean;
  activeDefs: PropertyDef[];
  onKeep: () => void;
  onArchive: () => void;
  onRename: (name: string, description: string) => void;
  onMerge: (targetId: number) => void;
}) {
  const [mode, setMode] = useState<"default" | "rename" | "merge">("default");
  const [draftName, setDraftName] = useState(pd.name);
  const [draftDesc, setDraftDesc] = useState(pd.description);
  const [mergeTarget, setMergeTarget] = useState<number | "">("");

  return (
    <section className="card">
      <div className="muted" style={{ fontSize: "0.8rem" }}>
        proposed {new Date(pd.first_proposed_at).toLocaleString()}
        {" · "}<span className="pill">{pd.data_type_hint}</span>
        {" "}<span className="pill">conf {pd.ai_confidence_on_creation.toFixed(2)}</span>
        {" "}<span className="pill">used {pd.usage_count}×</span>
      </div>
      <div style={{ margin: "0.5rem 0" }}>
        <strong>{pd.name}</strong>
        {pd.description && <div className="muted">{pd.description}</div>}
      </div>

      {mode === "rename" && (
        <div className="stack" style={{ margin: "0.5rem 0" }}>
          <div>
            <label>Name (snake_case)</label>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div>
            <label>Description</label>
            <input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} />
          </div>
          <div className="row" style={{ gap: "0.4rem" }}>
            <button disabled={busy || !draftName.trim()} onClick={() => onRename(draftName.trim(), draftDesc)}>
              Save
            </button>
            <button className="secondary" onClick={() => { setMode("default"); setDraftName(pd.name); setDraftDesc(pd.description); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "merge" && (
        <div className="stack" style={{ margin: "0.5rem 0" }}>
          <label>Merge into existing property:</label>
          <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value ? Number(e.target.value) : "")}>
            <option value="">— pick one —</option>
            {activeDefs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="row" style={{ gap: "0.4rem" }}>
            <button disabled={busy || !mergeTarget} onClick={() => mergeTarget && onMerge(mergeTarget)}>
              Merge
            </button>
            <button className="secondary" onClick={() => { setMode("default"); setMergeTarget(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "default" && (
        <div className="row" style={{ gap: "0.4rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
          <button disabled={busy} onClick={onKeep}>Keep</button>
          <button className="secondary" disabled={busy} onClick={() => setMode("rename")}>Rename</button>
          <button className="secondary" disabled={busy || activeDefs.length === 0} onClick={() => setMode("merge")}>Merge</button>
          <button className="danger" disabled={busy} onClick={onArchive}>Archive</button>
        </div>
      )}
    </section>
  );
}
