/** Human-readable due date for flashcards and prayer queue. */
export function formatDue(iso: string | null): string {
  if (!iso) return "soon";
  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDiff = Math.round(
    (startOfDue.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (dayDiff < 0) return "due now";
  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "tomorrow";
  if (dayDiff < 7) return `in ${dayDiff} days`;
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
