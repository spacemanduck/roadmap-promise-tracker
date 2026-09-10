/**
 * Status computation — mechanical, at build time, never stored.
 * Rules: docs/roadmap-methodology.md §Status codes.
 */
import type { RoadmapItem, RoadmapSnapshot, RoadmapSource, StatusCode } from "@/schema/roadmap";

export interface ComputedStatus {
  code: StatusCode;
  /** For SCOPE_CHANGED the delivery-date status it is paired with. */
  paired_with?: "ON_TIME" | "LATE";
  late_by_days?: number;
  slipped: number;
  current_window: RoadmapItem["window_history"][number]["window_normalised"];
  rationale?: string;
}

/**
 * "Slipped N times": the number of consecutive roadmap versions in which the normalised window end
 * moved later. A narrowing (Q4 → November) or a re-wording that keeps the end date is recorded in
 * window_history but is not a slip. A window that goes from a date to "TBA" counts as a slip.
 */
export function slipCount(history: RoadmapItem["window_history"]): number {
  let n = 0;
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].window_normalised;
    const cur = history[i].window_normalised;
    if (!prev) continue;
    if (!cur || cur.end > prev.end) n++;
  }
  return n;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

/**
 * Snapshots that count for the "absent from the two most recent snapshots" rule.
 * living_page: all snapshots of the game.
 * periodic_posts: only snapshots whose stated coverage includes the item's window end
 * (a Jan–Apr roadmap post cannot "drop" an item promised for September).
 */
export function relevantSnapshots(
  item: RoadmapItem,
  snapshots: RoadmapSnapshot[],
  source: Pick<RoadmapSource, "roadmap_style">,
): RoadmapSnapshot[] {
  const mine = snapshots.filter((s) => s.game_id === item.game_id);
  if (source.roadmap_style === "living_page") return mine;
  const win = item.window_history[item.window_history.length - 1].window_normalised;
  const firstSeen = item.first_seen.date;
  return mine.filter((s) => {
    if (s.captured_at.slice(0, 10) < firstSeen) return false;
    if (!s.covers) return true; // an uncovered snapshot is treated as global
    if (!win) return false; // no window → no post can be said to cover it
    return s.covers.start <= win.end && s.covers.end >= win.end;
  });
}

export function computeStatus(
  item: RoadmapItem,
  snapshots: RoadmapSnapshot[],
  source: Pick<RoadmapSource, "roadmap_style">,
  today: string,
): ComputedStatus {
  const history = item.window_history;
  const current = history[history.length - 1].window_normalised;
  const slipped = slipCount(history);

  // Human overrides (both require a Source or rationale — enforced by the schema).
  if (item.status_override?.code === "CANCELLED") {
    return { code: "CANCELLED", slipped, current_window: current, rationale: item.status_override.rationale };
  }

  if (item.delivery) {
    const late = current ? daysBetween(current.end, item.delivery.date) : 0;
    const paired: "ON_TIME" | "LATE" = current && late > 0 ? "LATE" : "ON_TIME";
    if (item.status_override?.code === "SCOPE_CHANGED") {
      return {
        code: "SCOPE_CHANGED",
        paired_with: paired,
        late_by_days: paired === "LATE" ? late : undefined,
        slipped,
        current_window: current,
        rationale: item.status_override.rationale,
      };
    }
    return paired === "LATE"
      ? { code: "LATE", late_by_days: late, slipped, current_window: current }
      : { code: "ON_TIME", slipped, current_window: current };
  }

  // No delivery.
  if (!current || current.end >= today) {
    return { code: "PENDING", slipped, current_window: current };
  }

  // Window end in the past. Present in the latest relevant snapshot → OVERDUE.
  const relevant = relevantSnapshots(item, snapshots, source).sort((a, b) =>
    a.captured_at < b.captured_at ? 1 : -1,
  );
  const latestTwo = relevant.slice(0, 2).map((s) => s.id);
  const presentInLatest = latestTwo.length > 0 && latestTwo[0] === item.last_seen.snapshot_id;
  if (presentInLatest || latestTwo.length < 2) {
    // Fewer than two later snapshots exist: not enough evidence to call it dropped.
    return { code: "OVERDUE", slipped, current_window: current };
  }
  const absentFromBoth = !latestTwo.includes(item.last_seen.snapshot_id);
  if (absentFromBoth) {
    return { code: "DROPPED", slipped, current_window: current };
  }
  return { code: "OVERDUE", slipped, current_window: current };
}

export interface GameStats {
  total: number;
  with_window: number;
  without_window: number;
  delivered: number;
  on_time: number;
  late: number;
  pending: number;
  overdue: number;
  dropped: number;
  cancelled: number;
  scope_changed: number;
  /** on_time / (on_time + late), items with a window and a delivery; null when denominator is 0. */
  on_time_rate: number | null;
  denominator: number;
  verified: number;
}

export function gameStats(statuses: { item: RoadmapItem; status: ComputedStatus }[]): GameStats {
  const st: GameStats = {
    total: statuses.length, with_window: 0, without_window: 0, delivered: 0, on_time: 0, late: 0,
    pending: 0, overdue: 0, dropped: 0, cancelled: 0, scope_changed: 0, on_time_rate: null,
    denominator: 0, verified: 0,
  };
  for (const { item, status } of statuses) {
    if (status.current_window) st.with_window++; else st.without_window++;
    if (item.verified_by) st.verified++;
    if (item.delivery) st.delivered++;
    const effective = status.code === "SCOPE_CHANGED" ? status.paired_with! : status.code;
    if (status.code === "SCOPE_CHANGED") st.scope_changed++;
    switch (effective) {
      case "ON_TIME": if (status.current_window) st.on_time++; break;
      case "LATE": st.late++; break;
      case "PENDING": st.pending++; break;
      case "OVERDUE": st.overdue++; break;
      case "DROPPED": st.dropped++; break;
      case "CANCELLED": st.cancelled++; break;
    }
  }
  st.denominator = st.on_time + st.late;
  st.on_time_rate = st.denominator > 0 ? st.on_time / st.denominator : null;
  return st;
}
