/**
 * validate.ts — CI gate for everything under data/.
 *
 *  1. Every JSON file parses against its zod schema (strict: unknown keys such as a stored
 *     `status` are rejected).
 *  2. Referential integrity: items → game, snapshots → game, window_history → snapshots.
 *  3. SCOPE_CHANGED / CANCELLED overrides carry a rationale (schema) — re-checked here.
 *  4. Every delivery.source is a patch note or publisher post (schema) — re-checked here.
 *  5. No image files anywhere under data/ (roadmap graphics are never republished).
 *  6. A snapshot's content_hash matches its extracted items (hash is over the extraction).
 *  7. No `[HUMAN COPY]` markers under app/ or docs/ when --strict-copy is passed.
 *
 * Exit code 1 on any failure. Prints a summary.
 */
import fs from "node:fs";
import path from "node:path";
import { RoadmapItem, RoadmapSnapshot, RoadmapSource } from "../schema/roadmap";
import { hashExtraction } from "../lib/hash";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const IMAGE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif", ".tif", ".tiff", ".ico",
]);
const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function loadJson<T>(dir: string, parse: (raw: unknown) => T): Map<string, T> {
  const out = new Map<string, T>();
  const full = path.join(DATA, dir);
  if (!fs.existsSync(full)) return out;
  for (const f of fs.readdirSync(full).filter((f) => f.endsWith(".json")).sort()) {
    const p = path.join(full, f);
    try {
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      const parsed = parse(raw);
      const rec = parsed as { id?: string; game_id?: string };
      const id = rec.id ?? rec.game_id ?? "";
      if (`${id}.json` !== f) fail(`${dir}/${f}: file name must equal its id (${id})`);
      out.set(id, parsed);
    } catch (e) {
      fail(`${dir}/${f}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

// 5. No images (or anything but JSON/markdown) under data/
for (const f of walk(DATA)) {
  const rel = path.relative(ROOT, f);
  if (IMAGE_EXT.has(path.extname(f).toLowerCase())) fail(`image file under data/: ${rel}`);
  else if (!/\.(json|md)$/.test(f) && path.basename(f) !== ".gitkeep") fail(`unexpected file under data/: ${rel}`);
}

// 1. Schemas
const sources = loadJson("roadmap-sources", (r) => RoadmapSource.parse(r));
const snapshots = loadJson("roadmap-snapshots", (r) => RoadmapSnapshot.parse(r));
const items = loadJson("roadmap-items", (r) => RoadmapItem.parse(r));

// 2 & 6. Snapshots
for (const [id, snap] of snapshots) {
  if (!sources.has(snap.game_id)) fail(`snapshot ${id}: unknown game_id ${snap.game_id}`);
  const expected = hashExtraction(snap.items_extracted);
  if (snap.content_hash !== expected) {
    fail(`snapshot ${id}: content_hash does not match items_extracted (expected ${expected})`);
  }
  const keys = new Set<string>();
  for (const it of snap.items_extracted) {
    if (keys.has(it.item_key)) fail(`snapshot ${id}: duplicate item_key ${it.item_key}`);
    keys.add(it.item_key);
  }
}

// 2, 3, 4. Items
for (const [id, item] of items) {
  if (!sources.has(item.game_id)) fail(`item ${id}: unknown game_id ${item.game_id}`);
  for (const ref of [item.first_seen, item.last_seen]) {
    const s = snapshots.get(ref.snapshot_id);
    if (!s) fail(`item ${id}: unknown snapshot ${ref.snapshot_id}`);
    else if (s.game_id !== item.game_id) fail(`item ${id}: snapshot ${ref.snapshot_id} belongs to another game`);
  }
  for (const [i, h] of item.window_history.entries()) {
    const s = snapshots.get(h.snapshot_id);
    if (!s) fail(`item ${id}: window_history[${i}] unknown snapshot ${h.snapshot_id}`);
    else if (s.captured_at.slice(0, 10) !== h.captured_at) {
      fail(`item ${id}: window_history[${i}].captured_at differs from snapshot date`);
    }
  }
  if (item.status_override && item.status_override.rationale.trim().length < 20) {
    fail(`item ${id}: ${item.status_override.code} requires a written rationale`);
  }
  if (item.delivery && !["patch_note", "publisher_post"].includes(item.delivery.source.kind)) {
    fail(`item ${id}: delivery.source.kind must be patch_note or publisher_post`);
  }
  if ("status" in (item as object)) fail(`item ${id}: status must not be stored`);
}

// 7. Human copy markers (opt-in so drafts can land before copy)
if (process.argv.includes("--strict-copy")) {
  for (const f of [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "docs"))]) {
    if (!/\.(tsx?|md|mdx)$/.test(f)) continue;
    if (fs.readFileSync(f, "utf8").includes("[HUMAN COPY]")) {
      fail(`[HUMAN COPY] marker remains in ${path.relative(ROOT, f)}`);
    }
  }
}

const summary = `sources=${sources.size} snapshots=${snapshots.size} items=${items.size}`;
if (errors.length) {
  console.error(`validate: FAILED with ${errors.length} problem(s) (${summary})`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`validate: ok (${summary})`);
