/**
 * Snapshot → item reconciliation. Pure functions so the weekly capture is testable without the
 * network. Given the previous state of a game's items and a new snapshot, produce:
 *   - new item drafts (verified_by null)
 *   - window_history appends where the stated window changed
 *   - last_seen updates for items still present
 * Nothing here ever writes a status.
 */
import type { ExtractedItem, RoadmapItem, RoadmapSnapshot, RoadmapSource } from "@/schema/roadmap";
import { normaliseWindow } from "@/lib/window";

export interface DiffResult {
  created: RoadmapItem[];
  updated: RoadmapItem[];
  /** Items previously seen that are absent from this snapshot (informational — status is computed). */
  absent: RoadmapItem[];
  changes: { item_id: string; kind: "new" | "window_changed" | "still_present"; detail: string }[];
}

export function reconcile(
  source: RoadmapSource,
  snapshot: RoadmapSnapshot,
  existing: RoadmapItem[],
): DiffResult {
  const date = snapshot.captured_at.slice(0, 10);
  const published_at = snapshot.source_published_at ?? date;
  const ctx = { published_at, fiscal_year_start_month: source.fiscal_year_start_month };
  const byKey = new Map<string, RoadmapItem>();
  for (const it of existing) for (const k of it.item_keys) byKey.set(k, it);

  const result: DiffResult = { created: [], updated: [], absent: [], changes: [] };
  const touched = new Set<string>();

  for (const ex of snapshot.items_extracted) {
    // An exact key match is authoritative. Fuzzy matching (phrasing changed between captures) only
    // considers items that are still live for this snapshot — an item whose window ended before the
    // period this snapshot covers is a different promise, even with the same title ("Mokoko Bootcamp"
    // in November and again in June are two items).
    const live = existing.filter((it) => {
      const win = it.window_history[it.window_history.length - 1].window_normalised;
      if (!snapshot.covers || !win) return true;
      return win.end >= snapshot.covers.start;
    });
    const match = byKey.get(ex.item_key) ?? fuzzyMatch(ex, live);
    const win = ex.window_as_stated === "no stated window" ? null : normaliseWindow(ex.window_as_stated, ctx);
    if (!match) {
      // Item ids come from the extraction key (already a stable slug), not the full title.
      const id = uniqueId(`${source.game_id}-${ex.item_key}`, existing, result.created);
      result.created.push({
        id,
        game_id: source.game_id,
        title_normalised: ex.title_as_stated,
        item_keys: [ex.item_key],
        first_seen: { snapshot_id: snapshot.id, date },
        window_history: [{ snapshot_id: snapshot.id, captured_at: date, window_as_stated: ex.window_as_stated, window_normalised: win }],
        last_seen: { snapshot_id: snapshot.id, date },
        delivery: null,
        verified_by: null,
        verified_at: null,
      });
      result.changes.push({ item_id: id, kind: "new", detail: `"${ex.title_as_stated}" — ${ex.window_as_stated}` });
      continue;
    }
    touched.add(match.id);
    const copy: RoadmapItem = structuredClone(match);
    if (!copy.item_keys.includes(ex.item_key)) copy.item_keys.push(ex.item_key);
    const last = copy.window_history[copy.window_history.length - 1];
    if (normaliseStated(last.window_as_stated) !== normaliseStated(ex.window_as_stated)) {
      copy.window_history.push({ snapshot_id: snapshot.id, captured_at: date, window_as_stated: ex.window_as_stated, window_normalised: win });
      result.changes.push({ item_id: copy.id, kind: "window_changed", detail: `${last.window_as_stated} → ${ex.window_as_stated}` });
    } else {
      result.changes.push({ item_id: copy.id, kind: "still_present", detail: ex.window_as_stated });
    }
    if (copy.last_seen.date <= date) copy.last_seen = { snapshot_id: snapshot.id, date };
    if (copy.removed_at) delete copy.removed_at;
    result.updated.push(copy);
  }

  for (const it of existing) {
    if (!touched.has(it.id) && it.game_id === source.game_id) result.absent.push(it);
  }
  return result;
}

function normaliseStated(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueId(base: string, existing: RoadmapItem[], created: RoadmapItem[]): string {
  const ids = new Set([...existing, ...created].map((i) => i.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Token-overlap match against existing titles/keys; conservative (≥ 0.8 Jaccard on content tokens). */
function fuzzyMatch(ex: ExtractedItem, existing: RoadmapItem[]): RoadmapItem | undefined {
  const a = tokens(ex.title_as_stated);
  if (a.size === 0) return undefined;
  let best: { item: RoadmapItem; score: number } | undefined;
  for (const it of existing) {
    const candidates = [it.title_normalised, ...it.item_keys.map((k) => k.replace(/-/g, " "))];
    for (const c of candidates) {
      const b = tokens(c);
      const inter = [...a].filter((t) => b.has(t)).length;
      const union = new Set([...a, ...b]).size;
      const score = union ? inter / union : 0;
      if (score >= 0.8 && (!best || score > best.score)) best = { item: it, score };
    }
  }
  return best?.item;
}

const STOP = new Set(["the", "a", "an", "of", "and", "new", "update", "updates", "to", "for", "in", "on", "with"]);
export function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => (t.length > 2 || /^\d+$/.test(t)) && !STOP.has(t)),
  );
}
