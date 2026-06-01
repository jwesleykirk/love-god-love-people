import { useRef, useState, type ChangeEvent, type DragEvent, type CSSProperties } from "react";

import { PersonAvatar } from "./PersonAvatar";

/**
 * PhotoUpload — drag/drop + click-to-pick image input.
 *
 * Two usage modes:
 *   1. Existing Person:
 *        onUpload(file) → component handles network, returns updated url.
 *        onDelete()    → component handles network.
 *      Pass `photoUrl` so the avatar shows the current image (or silhouette).
 *
 *   2. Pre-creation (PersonNew form):
 *        onFileChange(file | null) → parent holds the File and submits later
 *        after creating the person. `photoUrl` stays null until then.
 *
 * The two modes are mutually exclusive — pass either onUpload+onDelete OR
 * onFileChange, not both.
 */
type CommonProps = {
  photoUrl?: string | null;
  size?: number;
  alt?: string;
};

type ManagedProps = CommonProps & {
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  onFileChange?: never;
};

type DeferredProps = CommonProps & {
  onFileChange: (file: File | null) => void;
  onUpload?: never;
  onDelete?: never;
};

type Props = ManagedProps | DeferredProps;

const MAX_BYTES = 10 * 1024 * 1024;

export function PhotoUpload(props: Props) {
  const { photoUrl, size = 96, alt = "" } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // For deferred mode, hold an object-URL preview so the user sees what they
  // picked before they submit the form.
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const isDeferred = "onFileChange" in props && typeof props.onFileChange === "function";

  function validate(file: File): string | null {
    if (!file.type.startsWith("image/")) return "Please pick an image file.";
    if (file.size > MAX_BYTES) return "That image is over 10 MB. Try a smaller one.";
    return null;
  }

  async function handleFile(file: File) {
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    if (isDeferred) {
      // Defer to parent. Build a preview URL so the user sees the pick.
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      const url = URL.createObjectURL(file);
      setPendingPreview(url);
      (props as DeferredProps).onFileChange(file);
      return;
    }

    setBusy(true);
    try {
      await (props as ManagedProps).onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onPickClick() {
    inputRef.current?.click();
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // reset so picking the same file twice still fires onChange
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  async function onDelete() {
    if (isDeferred) {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingPreview(null);
      (props as DeferredProps).onFileChange(null);
      return;
    }
    setBusy(true);
    try {
      await (props as ManagedProps).onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  }

  const displayedSrc = pendingPreview ?? photoUrl ?? null;
  const hasPhoto = Boolean(displayedSrc);

  const dropZoneStyle: CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2)",
    borderRadius: "var(--radius-xl)",
    border: dragOver
      ? "2px dashed var(--color-primary)"
      : "2px dashed transparent",
    background: dragOver ? "var(--color-bg)" : "transparent",
    transition: "border-color 120ms ease, background-color 120ms ease",
  };

  return (
    <div
      style={dropZoneStyle}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={onPickClick}
        disabled={busy}
        aria-label={hasPhoto ? "Change photo" : "Upload photo"}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        <PersonAvatar src={displayedSrc} alt={alt} size={size} />
      </button>
      <div className="row" style={{ gap: "var(--space-2)" }}>
        <button
          type="button"
          className="secondary"
          onClick={onPickClick}
          disabled={busy}
          style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-caption)" }}
        >
          {busy ? "Working…" : hasPhoto ? "Replace" : "Upload"}
        </button>
        {hasPhoto && (
          <button
            type="button"
            className="secondary"
            onClick={onDelete}
            disabled={busy}
            style={{ padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-caption)" }}
          >
            Remove
          </button>
        )}
      </div>
      {error && (
        <div className="muted" style={{ color: "var(--color-warning)", fontSize: "var(--text-caption)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
