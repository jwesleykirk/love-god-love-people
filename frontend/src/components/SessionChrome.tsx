import { Link } from "react-router-dom";

type Props = {
  backTo: string;
  backLabel?: string;
  progress?: { current: number; total: number };
  caption?: string;
};

export function SessionChrome({
  backTo,
  backLabel = "Back",
  progress,
  caption,
}: Props) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <header className="session-chrome">
      <Link to={backTo} className="session-back">
        ← {backLabel}
      </Link>
      {caption && <p className="session-caption muted">{caption}</p>}
      {progress && progress.total > 0 && (
        <div className="session-progress" aria-hidden>
          <div className="session-progress-track">
            <div className="session-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="session-progress-label muted">
            {progress.current} of {progress.total}
          </span>
        </div>
      )}
    </header>
  );
}
