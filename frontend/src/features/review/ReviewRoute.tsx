import { useEffect, useState } from "react";
import {
  approveProperty,
  archivePropertyDef,
  createProposedPerson,
  editPropertyValue,
  getPending,
  keepPropertyDef,
  listActivePropertyDefs,
  listNewPropertyDefs,
  listProposedPersons,
  mergePropertyDef,
  rejectProperty,
  rejectProposedPerson,
  renamePropertyDef,
  updatePropertyDefTopic,
  type PendingResponse,
  type PendingValue,
  type ProposedPerson,
  type PropertyDef,
} from "./api";
import { propertyDefItems, relationshipCategoryCreateItems } from "@/components/optionItems";
import { SearchPicker } from "@/components/SearchPicker";
import type { RelationshipCategory } from "../people/api";


const TOPIC_PICKER_ITEMS = [
  { id: "bio", label: "Bio" },
  { id: "family", label: "Family" },
  { id: "work", label: "Work" },
  { id: "interests", label: "Interests" },
  { id: "faith", label: "Faith" },
  { id: "health", label: "Health" },
  { id: "other", label: "Other" },
];

type Tab = "values" | "definitions" | "persons";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "values", label: "Pending values" },
  { value: "definitions", label: "New properties" },
  { value: "persons", label: "Proposed people" },
];

export default function ReviewRoute() {
  const [tab, setTab] = useState<Tab>("values");
  return (
    <main className="container">
      <h1>Review</h1>
      <div className="tab-row">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={tab === t.value ? "tab tab--active" : "tab"}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "values" && <PendingValuesPane />}
      {tab === "definitions" && <NewPropertyDefsPane />}
      {tab === "persons" && <ProposedPersonsPane />}
    </main>
  );
}

// ---------- Pending Values ----------

function PendingValuesPane() {
  const [data, setData] = useState<PendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    try { setData(await getPending()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "failed"); }
  }
  useEffect(() => { void refresh(); }, []);
  async function act(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    try { await fn(); await refresh(); } finally { setBusyId(null); }
  }
  if (error) return <p style={{ color: "var(--color-warning)" }}>{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        AI-extracted property values from your journal entries. Approve, edit, or reject each one.
      </p>

      {data.errors.length > 0 && (
        <section style={{ marginBottom: "var(--space-6)" }}>
          <h3 style={{ fontSize: "var(--text-h3)" }}>Extraction errors</h3>
          {data.errors.map((e) => (
            <div className="card" key={e.entry_id} style={{ borderLeft: "3px solid var(--color-warning)" }}>
              <div className="muted" style={{ fontSize: "var(--text-caption)", marginBottom: "var(--space-2)" }}>
                {new Date(e.entry_created_at).toLocaleString()}
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginBottom: "var(--space-2)" }}>{e.entry_content}</div>
              <div style={{ color: "var(--color-warning)", fontSize: "var(--text-label)" }}>{e.error}</div>
            </div>
          ))}
        </section>
      )}

      {data.entries.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">Nothing to review.</p>
        </div>
      ) : (
        data.entries.map((group) => (
          <div key={group.entry_id ?? "orphan"} className="card">
            <div className="muted" style={{ fontSize: "var(--text-caption)", marginBottom: "var(--space-2)" }}>
              {group.entry_created_at && new Date(group.entry_created_at).toLocaleString()}
              {" · "}
              <span className="chip" style={{ marginRight: "var(--space-1)" }}>{group.prompt_version}</span>
              <span className="chip">{group.model}</span>
            </div>
            <div style={{
              whiteSpace: "pre-wrap",
              padding: "var(--space-3)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              fontStyle: "italic",
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-body)",
              marginBottom: "var(--space-4)",
              borderLeft: "3px solid var(--color-border-strong)",
            }}>
              "{group.entry_content}"
            </div>
            {group.values.map((v, i) => (
              <div key={v.id}>
                <PendingRow
                  value={v}
                  busy={busyId === v.id}
                  onApprove={() => act(v.id, () => approveProperty(v.id))}
                  onReject={() => act(v.id, () => rejectProperty(v.id))}
                  onEdit={(text) => act(v.id, () => editPropertyValue(v.id, text))}
                />
                {i < group.values.length - 1 && <div className="divider" style={{ margin: 0 }} />}
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}

function PendingRow({ value, busy, onApprove, onReject, onEdit }: {
  value: PendingValue;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.value_text);

  return (
    <div style={{ padding: "var(--space-3) 0" }}>
      <div style={{ marginBottom: "var(--space-2)" }}>
        <div className="muted" style={{ fontSize: "var(--text-caption)" }}>
          {value.person_name} · {value.property_def_name.replace(/_/g, " ")}
        </div>
        {editing ? (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} style={{ marginTop: "var(--space-1)" }} />
        ) : (
          <div style={{ fontWeight: 500, fontSize: "var(--text-body-lg)", marginTop: 2 }}>{value.value_text}</div>
        )}
        <div style={{ marginTop: "var(--space-1)" }}>
          <span className="chip">conf {value.ai_confidence.toFixed(2)}</span>
        </div>
      </div>
      <div className="row" style={{ gap: "var(--space-2)" }}>
        {editing ? (
          <>
            <button disabled={busy} onClick={() => onEdit(draft)} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Save</button>
            <button className="secondary" onClick={() => { setEditing(false); setDraft(value.value_text); }} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="primary-pill" disabled={busy} onClick={onApprove} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Approve</button>
            <button className="secondary" disabled={busy} onClick={() => setEditing(true)} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Edit</button>
            <button className="danger" disabled={busy} onClick={onReject} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Reject</button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- New Property Defs ----------

function NewPropertyDefsPane() {
  const [items, setItems] = useState<PropertyDef[]>([]);
  const [activeDefs, setActiveDefs] = useState<PropertyDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  async function refresh() {
    try {
      const [n, a] = await Promise.all([listNewPropertyDefs(), listActivePropertyDefs()]);
      setItems(n.results); setActiveDefs(a.results); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "failed"); }
  }
  useEffect(() => { void refresh(); }, []);
  async function act(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    try { await fn(); await refresh(); } finally { setBusyId(null); }
  }
  if (error) return <p style={{ color: "var(--color-warning)" }}>{error}</p>;
  return (
    <>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        Brand-new property types the AI proposed. Keep, rename, merge, or archive.
      </p>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">Nothing new to review.</p>
        </div>
      ) : items.map((pd) => (
        <PropertyDefRow
          key={pd.id}
          pd={pd}
          busy={busyId === pd.id}
          activeDefs={activeDefs.filter((x) => x.id !== pd.id)}
          onKeep={() => act(pd.id, () => keepPropertyDef(pd.id))}
          onArchive={() => act(pd.id, () => archivePropertyDef(pd.id))}
          onRename={(name, desc, topic) => act(pd.id, async () => {
            await renamePropertyDef(pd.id, name, desc);
            if (topic !== pd.topic) await updatePropertyDefTopic(pd.id, topic);
          })}
          onMerge={(t) => act(pd.id, () => mergePropertyDef(pd.id, t))}
        />
      ))}
    </>
  );
}

function PropertyDefRow({ pd, busy, activeDefs, onKeep, onArchive, onRename, onMerge }: {
  pd: PropertyDef;
  busy: boolean;
  activeDefs: PropertyDef[];
  onKeep: () => void;
  onArchive: () => void;
  onRename: (name: string, description: string, topic: string) => void;
  onMerge: (targetId: number) => void;
}) {
  const [mode, setMode] = useState<"default" | "rename" | "merge">("default");
  const [draftName, setDraftName] = useState(pd.name);
  const [draftDesc, setDraftDesc] = useState(pd.description);
  const [draftTopic, setDraftTopic] = useState<string>(pd.topic);
  const [mergeTarget, setMergeTarget] = useState<number | "">("");
  return (
    <div className="card">
      <div className="muted" style={{ fontSize: "var(--text-caption)", marginBottom: "var(--space-2)" }}>
        proposed {new Date(pd.first_proposed_at).toLocaleString()}
      </div>
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ fontWeight: 500, fontSize: "var(--text-body-lg)", fontFamily: "var(--font-serif)" }}>{pd.name.replace(/_/g, " ")}</div>
        {pd.description && <div className="muted" style={{ marginTop: 2 }}>{pd.description}</div>}
      </div>
      <div className="row row--wrap" style={{ gap: "var(--space-1)", marginBottom: "var(--space-3)" }}>
        <span className="chip pill--primary">{pd.topic}</span>
        <span className="chip">{pd.data_type_hint}</span>
        <span className="chip">conf {pd.ai_confidence_on_creation.toFixed(2)}</span>
        <span className="chip">used {pd.usage_count}×</span>
      </div>

      {mode === "rename" && (
        <div className="stack">
          <div><label>Name</label><input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></div>
          <div><label>Description</label><input value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} /></div>
          <SearchPicker
            label="Topic"
            items={TOPIC_PICKER_ITEMS}
            value={draftTopic}
            onChange={(id) => setDraftTopic(String(id))}
          />
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button disabled={busy || !draftName.trim()} onClick={() => onRename(draftName.trim(), draftDesc, draftTopic)}>Save</button>
            <button className="secondary" onClick={() => { setMode("default"); setDraftName(pd.name); setDraftDesc(pd.description); setDraftTopic(pd.topic); }}>Cancel</button>
          </div>
        </div>
      )}
      {mode === "merge" && (
        <div className="stack">
          <SearchPicker
            label="Merge into"
            items={propertyDefItems(activeDefs.filter((d) => d.id !== pd.id))}
            value={mergeTarget}
            onChange={(id) => setMergeTarget(id === "" ? "" : Number(id))}
            placeholder="Search properties…"
            listAriaLabel="Property definitions"
          />
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button disabled={busy || !mergeTarget} onClick={() => mergeTarget && onMerge(mergeTarget)}>Merge</button>
            <button className="secondary" onClick={() => { setMode("default"); setMergeTarget(""); }}>Cancel</button>
          </div>
        </div>
      )}
      {mode === "default" && (
        <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
          <button className="primary-pill" disabled={busy} onClick={onKeep} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Keep</button>
          <button className="secondary" disabled={busy} onClick={() => setMode("rename")} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Rename</button>
          <button className="secondary" disabled={busy || activeDefs.length === 0} onClick={() => setMode("merge")} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Merge</button>
          <button className="danger" disabled={busy} onClick={onArchive} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Archive</button>
        </div>
      )}
    </div>
  );
}

// ---------- Proposed Persons ----------

function ProposedPersonsPane() {
  const [items, setItems] = useState<ProposedPerson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    try {
      const resp = await listProposedPersons();
      setItems(resp.results);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "failed"); }
  }
  useEffect(() => { void refresh(); }, []);

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    try { await fn(); await refresh(); } finally { setBusyId(null); }
  }

  if (error) return <p style={{ color: "var(--color-warning)" }}>{error}</p>;

  return (
    <>
      <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
        People the AI detected in journal entries but you didn't tag. Create or reject.
      </p>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="muted">Nothing to review.</p>
        </div>
      ) : items.map((p) => (
        <ProposedPersonRow
          key={p.id}
          proposal={p}
          busy={busyId === p.id}
          onCreate={(category) =>
            act(p.id, () => createProposedPerson(p.id, { relationship_category: category as RelationshipCategory }))
          }
          onReject={() => act(p.id, () => rejectProposedPerson(p.id))}
        />
      ))}
    </>
  );
}

function ProposedPersonRow({ proposal, busy, onCreate, onReject }: {
  proposal: ProposedPerson;
  busy: boolean;
  onCreate: (category: RelationshipCategory | "") => void;
  onReject: () => void;
}) {
  const [category, setCategory] = useState<RelationshipCategory | "">("");
  const payload = proposal.proposal_payload || {};
  const associations = payload.associations || [];
  const properties = payload.properties || [];

  return (
    <div className="card">
      <div className="muted" style={{ fontSize: "var(--text-caption)", marginBottom: "var(--space-2)" }}>
        from entry {new Date(proposal.source_entry_created_at).toLocaleString()}
      </div>
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ fontWeight: 600, fontSize: "var(--text-h3)", fontFamily: "var(--font-serif)" }}>{proposal.full_name}</div>
        <div className="row row--wrap" style={{ gap: "var(--space-1)", marginTop: 4 }}>
          {proposal.life_stage && <span className="chip">{proposal.life_stage.replace("_", " ")}</span>}
          <span className="chip">conf {proposal.ai_confidence.toFixed(2)}</span>
        </div>
      </div>

      {associations.length > 0 && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <div className="muted" style={{ fontSize: "var(--text-caption)", marginBottom: "var(--space-1)" }}>Proposed relationships</div>
          {associations.map((a, i) => (
            <div key={i} style={{ fontSize: "var(--text-label)" }}>
              <em>{a.association_type.replace(/_/g, " ")}</em> → person #{a.to_person_id}
            </div>
          ))}
        </div>
      )}

      {properties.length > 0 && (
        <div style={{ marginBottom: "var(--space-3)" }}>
          <div className="muted" style={{ fontSize: "var(--text-caption)", marginBottom: "var(--space-1)" }}>Proposed properties</div>
          {properties.map((p, i) => (
            <div key={i} style={{ fontSize: "var(--text-label)" }}>
              <span className="muted">{p.property_name.replace(/_/g, " ")}:</span> {p.value}
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <SearchPicker
          label="Create as"
          items={relationshipCategoryCreateItems()}
          value={category}
          onChange={(id) => setCategory(id as RelationshipCategory | "")}
          lockWhenSelected={false}
          placeholder="Search categories…"
          listAriaLabel="Relationship categories"
        />
        <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
          <button className="primary-pill" disabled={busy || !category} onClick={() => onCreate(category)} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Create</button>
          <button className="danger" disabled={busy} onClick={onReject} style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-label)" }}>Reject</button>
        </div>
      </div>
    </div>
  );
}
