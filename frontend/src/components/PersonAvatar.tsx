import type { CSSProperties } from "react";

/**
 * PersonAvatar — circular profile photo, with a CSS-only cream silhouette
 * fallback when no photo is set.
 *
 * The silhouette is an inline SVG (round head + shoulders) in cream tones with
 * a subtle teal accent. Wesley can later swap to a Midjourney-generated SVG
 * dropped into `frontend/public/illustrations/` — this is a deliberate
 * placeholder, not an end state.
 */
type Props = {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function PersonAvatar({ src, alt = "", size = 40, className, style }: Props) {
  const ringStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "var(--radius-pill)",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    ...style,
  };

  if (src) {
    return (
      <span className={className} style={ringStyle} aria-label={alt}>
        <img
          src={src}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </span>
    );
  }

  return (
    <span className={className} style={ringStyle} role="img" aria-label={alt || "no photo"}>
      <Silhouette size={size} />
    </span>
  );
}

function Silhouette({ size }: { size: number }) {
  // Simple round head + shoulders. Stroke uses --color-border-strong for a
  // subtle outline; the teal accent on the shoulders nods to --color-primary.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* shoulders arc */}
      <path
        d="M 4 38 Q 4 26 14 24 Q 20 23 26 24 Q 36 26 36 38 Z"
        fill="var(--color-border)"
        stroke="var(--color-border-strong)"
        strokeWidth="0.6"
      />
      {/* head */}
      <circle
        cx="20"
        cy="15"
        r="7"
        fill="var(--color-border)"
        stroke="var(--color-border-strong)"
        strokeWidth="0.6"
      />
      {/* subtle teal accent — a thin chest line for warmth */}
      <path
        d="M 12 30 Q 20 28 28 30"
        stroke="var(--color-primary)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
