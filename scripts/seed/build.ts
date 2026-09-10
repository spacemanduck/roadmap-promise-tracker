/**
 * Seed builder — turns the hand-checked specs in scripts/seed/*.ts into data/ records.
 *
 * The specs record, per roadmap document, the items exactly as the publisher wrote them and, per
 * item, the patch note that names it as shipped. Windows are normalised by lib/window.ts (the
 * rubric), never by hand; hashes come from lib/hash.ts; snapshot → item reconciliation is done by
 * lib/diff.ts so the seed goes through exactly the same code path as the weekly capture.
 *
 * Every record produced here is a draft: captured_by "backfill", verified_by null. A person sets
 * verified_by after checking the row against the archived source.
 *
 * Usage: npx tsx scripts/seed/build.ts [--clean]
 */
import fs from "node:fs";
import path from "node:path";
import { RoadmapItem, RoadmapSnapshot, RoadmapSource, type Source } from "../../schema/roadmap";
import { hashExtraction } from "../../lib/hash";
import { reconcile } from "../../lib/diff";
import { slugify } from "../../lib/extract";
import lostArk from "./lost-ark";
import seaOfThieves from "./sea-of-thieves";
import huntShowdown from "./hunt-showdown";

export interface SeedItem {
  /** Exactly as the publisher wrote it. */
  title: string;
  /** Exactly as written or as the section heading reads; "no stated window" if none. */
  window: string;
  /** Override the auto key when the same item is phrased differently across posts. */
  key?: string;
}

export interface SeedSnapshot {
  id: string;
  url: string;
  archived_url: string;
  /** Wayback capture timestamp YYYYMMDDhhmmss — becomes captured_at. */
  captured: string;
  published_at: string;
  covers?: { start: string; end: string };
  confidence: number;
  items: SeedItem[];
}

export interface SeedDelivery {
  /** item key (see SeedItem.key / slugify(title)) */
  key: string;
  date: string;
  source: Source;
  note?: string;
}

export interface SeedGame {
  source: RoadmapSource;
  snapshots: SeedSnapshot[];
  deliveries: SeedDelivery[];
  /** Human-readable canonical titles where the auto title is awkward. */
  titles?: Record<string, string>;
  /** Free-text notes per item key (shown on the item page). */
  notes?: Record<string, string>;
}

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const clean = process.argv.includes("--clean");

function write(rel: string, obj: unknown) {
  const p = path.join(DATA, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

function tsToIso(ts: string) {
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}Z`;
}

export function keyOf(it: SeedItem) {
  return it.key ?? slugify(it.title);
}

function buildGame(game: SeedGame) {
  const source = RoadmapSource.parse(game.source);
  write(`roadmap-sources/${source.game_id}.json`, source);

  const snapshots: RoadmapSnapshot[] = [];
  let items: RoadmapItem[] = [];
  const ordered = [...game.snapshots].sort((a, b) => (a.captured < b.captured ? -1 : 1));
  for (const s of ordered) {
    const items_extracted = s.items.map((it, position) => ({
      item_key: keyOf(it),
      title_as_stated: it.title,
      window_as_stated: it.window,
      position,
    }));
    const snap = RoadmapSnapshot.parse({
      id: s.id,
      game_id: source.game_id,
      captured_at: tsToIso(s.captured),
      url: s.url,
      archived_url: s.archived_url,
      content_hash: hashExtraction(items_extracted),
      source_published_at: s.published_at,
      ...(s.covers ? { covers: s.covers } : {}),
      items_extracted,
      extraction_model: "claude-fable-5-1",
      extraction_confidence: s.confidence,
      captured_by: "backfill",
    });
    snapshots.push(snap);
    const diff = reconcile(source, snap, items);
    items = items.filter((i) => !diff.updated.some((u) => u.id === i.id)).concat(diff.updated, diff.created);
  }

  for (const d of game.deliveries) {
    const it = items.find((i) => i.item_keys.includes(d.key));
    if (!it) throw new Error(`${source.game_id}: delivery for unknown key ${d.key}`);
    it.delivery = { date: d.date, source: d.source, matched_by: "script", ...(d.note ? { note: d.note } : {}) };
  }
  for (const [key, title] of Object.entries(game.titles ?? {})) {
    const it = items.find((i) => i.item_keys.includes(key));
    if (!it) throw new Error(`${source.game_id}: title for unknown key ${key}`);
    it.title_normalised = title;
  }
  for (const [key, note] of Object.entries(game.notes ?? {})) {
    const it = items.find((i) => i.item_keys.includes(key));
    if (!it) throw new Error(`${source.game_id}: note for unknown key ${key}`);
    it.notes = note;
  }

  for (const s of snapshots) write(`roadmap-snapshots/${s.id}.json`, s);
  for (const i of items) write(`roadmap-items/${i.id}.json`, RoadmapItem.parse(i));
  write(`capture-state/${source.game_id}.json`, { game_id: source.game_id, seen_patch_note_urls: game.deliveries.map((d) => d.source.url).filter((u, i, a) => a.indexOf(u) === i) });
  console.log(`${source.game_name}: ${snapshots.length} snapshots, ${items.length} items, ${items.filter((i) => i.delivery).length} deliveries`);
}

if (clean) {
  for (const d of ["roadmap-sources", "roadmap-snapshots", "roadmap-items", "capture-state"]) {
    fs.rmSync(path.join(DATA, d), { recursive: true, force: true });
  }
}
for (const g of [lostArk, seaOfThieves, huntShowdown]) buildGame(g);
