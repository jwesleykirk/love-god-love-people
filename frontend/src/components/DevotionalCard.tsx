import type { ReactNode } from "react";

type Variant = "remember" | "prayer";

type Props = {
  variant: Variant;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  revealed?: boolean;
  onReveal?: () => void;
  className?: string;
};

/**
 * Full-width study/devotional card — vocabulary.com editorial feel.
 */
export function DevotionalCard({
  variant,
  eyebrow,
  title,
  subtitle,
  body,
  footer,
  revealed = true,
  onReveal,
  className = "",
}: Props) {
  const surfaceClass =
    variant === "prayer" ? "devotional-card devotional-card--prayer" : "devotional-card devotional-card--remember";

  return (
    <article className={`${surfaceClass} ${className}`.trim()}>
      {eyebrow && <p className="devotional-eyebrow">{eyebrow}</p>}
      <div
        className={`devotional-prompt${!revealed && onReveal ? " devotional-prompt--tap" : ""}`}
        role={!revealed && onReveal ? "button" : undefined}
        tabIndex={!revealed && onReveal ? 0 : undefined}
        onClick={!revealed && onReveal ? onReveal : undefined}
        onKeyDown={
          !revealed && onReveal
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onReveal();
                }
              }
            : undefined
        }
      >
        <h2 className="devotional-title">{title}</h2>
        {subtitle && <p className="devotional-subtitle">{subtitle}</p>}
      </div>
      {revealed && body && <div className="devotional-body">{body}</div>}
      {!revealed && onReveal && (
        <p className="devotional-hint muted">Tap to reveal</p>
      )}
      {footer && <div className="devotional-footer">{footer}</div>}
    </article>
  );
}
