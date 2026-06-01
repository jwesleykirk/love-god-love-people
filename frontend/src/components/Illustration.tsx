import type { CSSProperties } from "react";

/**
 * Illustration slot. Renders a styled placeholder until Wesley drops a real
 * SVG/PNG into frontend/public/illustrations/<slot>.svg.
 *
 * Convention: every placeholder is tagged with ILLUSTRATION_PLACEHOLDER in source
 * so swap-in is grep-able.
 */
type Props = {
  slot: string;
  size?: "sm" | "lg" | "xl";
  label?: string;
  className?: string;
};

export function Illustration({ slot, size = "sm", label, className }: Props) {
  const sizeClass = size === "sm" ? "" : size === "lg" ? "illust--lg" : "illust--xl";
  const cls = `illust ${sizeClass} ${className ?? ""}`.trim();
  // ILLUSTRATION_PLACEHOLDER: ${slot}.svg
  return (
    <span
      className={cls}
      role="img"
      aria-label={slot}
      title={`illustration slot: ${slot}`}
    >
      {label ?? slot}
    </span>
  );
}

export function IllustrationBanner({ slot, label, style }: { slot: string; label?: string; style?: CSSProperties }) {
  // ILLUSTRATION_PLACEHOLDER: ${slot}.svg
  return (
    <div
      role="img"
      aria-label={slot}
      title={`illustration slot: ${slot}`}
      style={{
        width: "100%",
        height: 120,
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-muted)",
        fontSize: "var(--text-caption)",
        ...style,
      }}
    >
      {label ?? `[ illustration: ${slot} ]`}
    </div>
  );
}
