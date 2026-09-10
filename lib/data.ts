/**
 * Data access — reads the JSON records under data/ at build time, validates them with the
 * zod schemas, and computes statuses. The site never reads anything else.
 */
import fs from "node:fs";
import path from "node:path";
import { RoadmapItem, RoadmapSnapshot, RoadmapSource } from "@/schema/roadmap";
import { computeStatus, gameStats, type ComputedStatus, type GameStats } from "@/lib/status";

const DATA_DIR = path.join(process.cwd(), "data");

function readDir<T>(dir: string, parse: (raw: unknown, file: string) => T): T[] {
  const full = path.join(DATA_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => parse(JSON.parse(fs.readFileSync(path.join(full, f), "utf8")), f));
}

let cache: {
  sources: RoadmapSource[];
  snapshots: RoadmapSnapshot[];
  items: RoadmapItem[];
} | null = null;

export function loadAll() {
  if (cache) return cache;
  const sources = readDir("roadmap-sources", (raw) => RoadmapSource.parse(raw));
  const snapshots = readDir("roadmap-snapshots", (raw) => RoadmapSnapshot.parse(raw));
  const items = readDir("roadmap-items", (raw) => RoadmapItem.parse(raw));
  cache = { sources, snapshots, items };
  return cache;
}

export function today(): string {
  // Build date, UTC. Statuses are recomputed on every deploy.
  return new Date().toISOString().slice(0, 10);
}

export interface ItemView {
  item: RoadmapItem;
  status: ComputedStatus;
  source: RoadmapSource;
}

export interface GameView {
  source: RoadmapSource;
  /** Newest first. */
  snapshots: RoadmapSnapshot[];
  items: ItemView[];
  stats: GameStats;
  last_capture: string | null;
  /** Earliest capture date: the start of tracked history. */
  first_capture: string | null;
}

export function getGames(): GameView[] {
  const { sources } = loadAll();
  return sources
    .map((s) => getGame(s.game_id)!)
    .sort((a, b) => a.source.game_name.localeCompare(b.source.game_name));
}

export function getGame(gameId: string): GameView | null {
  const { sources, snapshots, items } = loadAll();
  const source = sources.find((s) => s.game_id === gameId);
  if (!source) return null;
  const snaps = snapshots
    .filter((s) => s.game_id === gameId)
    .sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1));
  const t = today();
  const views: ItemView[] = items
    .filter((i) => i.game_id === gameId)
    .map((item) => ({ item, status: computeStatus(item, snapshots, source, t), source }))
    .sort((a, b) => {
      const aw = a.status.current_window?.end ?? "9999";
      const bw = b.status.current_window?.end ?? "9999";
      if (aw !== bw) return aw < bw ? -1 : 1;
      return a.item.title_normalised.localeCompare(b.item.title_normalised);
    });
  return {
    source,
    snapshots: snaps,
    items: views,
    stats: gameStats(views),
    last_capture: snaps[0]?.captured_at.slice(0, 10) ?? null,
    first_capture: snaps[snaps.length - 1]?.captured_at.slice(0, 10) ?? null,
  };
}

export function getItem(gameId: string, itemId: string): ItemView | null {
  const game = getGame(gameId);
  return game?.items.find((v) => v.item.id === itemId) ?? null;
}

export function getSnapshot(snapshotId: string): RoadmapSnapshot | null {
  return loadAll().snapshots.find((s) => s.id === snapshotId) ?? null;
}
