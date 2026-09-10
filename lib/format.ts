import type { ComputedStatus } from "@/lib/status";
import type { StatusCode } from "@/schema/roadmap";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026-08-14 → 14 Aug 2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function fmtWindow(w: { start: string; end: string } | null | undefined): string {
  if (!w) return "no stated window";
  if (w.start === w.end) return fmtDate(w.start);
  return `${fmtDate(w.start)} – ${fmtDate(w.end)}`;
}

export const STATUS_LABEL: Record<StatusCode, string> = {
  ON_TIME: "On time",
  LATE: "Late",
  PENDING: "Pending",
  OVERDUE: "Overdue",
  DROPPED: "Dropped",
  CANCELLED: "Cancelled",
  SCOPE_CHANGED: "Scope changed",
};

/** Tailwind classes per status — text + background, AA contrast in both themes. */
export const STATUS_CLASS: Record<StatusCode, string> = {
  ON_TIME: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100",
  LATE: "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
  PENDING: "bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100",
  OVERDUE: "bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-100",
  DROPPED: "bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-stone-100",
  CANCELLED: "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
  SCOPE_CHANGED: "bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100",
};

/** Hex fill per status for SVG. */
export const STATUS_HEX: Record<StatusCode, string> = {
  ON_TIME: "#059669",
  LATE: "#d97706",
  PENDING: "#0284c7",
  OVERDUE: "#e11d48",
  DROPPED: "#78716c",
  CANCELLED: "#52525b",
  SCOPE_CHANGED: "#7c3aed",
};

export function statusSentence(s: ComputedStatus): string {
  switch (s.code) {
    case "LATE":
      return `Late by ${s.late_by_days} day${s.late_by_days === 1 ? "" : "s"}`;
    case "SCOPE_CHANGED":
      return `Scope changed (${s.paired_with === "LATE" ? `late by ${s.late_by_days} days` : "on time"} on the delivery date)`;
    default:
      return STATUS_LABEL[s.code];
  }
}

export function slipSentence(n: number): string {
  if (n === 0) return "never slipped";
  return `slipped ${n === 1 ? "once" : n === 2 ? "twice" : `${n} times`}`;
}

export function pct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}
