/**
 * backfill-roadmaps.ts — draft snapshots and items from Wayback captures (pilot + seed).
 *
 * Two modes:
 *   --url <roadmap url> [--closest YYYY-MM-DD]   one archived version of one roadmap document
 *   --history <roadmap url> --from YYYY-MM --to YYYY-MM   every distinct capture of a living page
 *
 * Every snapshot written has captured_by: "backfill" and every item has verified_by: null.
 * The human verifies on the preview deploy before anything is merged.
 *
 * Usage: npx tsx scripts/backfill-roadmaps.ts --game lost-ark --url https://... [--closest 2025-04-02]
 */
import fs from "node:fs";
import path from "node:path";
import { RoadmapItem, RoadmapSnapshot, RoadmapSource } from "../schema/roadmap";
import { hashExtraction } from "../lib/hash";
import { captureDate, listCaptures, type Capture } from "../lib/archive";
import { extractText, fetchHtml } from "../lib/page";
import { extractRoadmapItems, toExtractedItems } from "../lib/extract";
import { reconcile } from "../lib/diff";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const gameId = opt("--game");
const url = opt("--url") ?? opt("--history");
const closest = opt("--closest");
const from = opt("--from");
const to = opt("--to");
const dryRun = args.includes("--dry-run");

if (!gameId || !url) {
  console.error("usage: backfill-roadmaps.ts --game <id> (--url <url> [--closest YYYY-MM-DD] | --history <url> --from YYYY-MM --to YYYY-MM)");
  process.exit(1);
}

function readJsonDir<T>(dir: string, parse: (r: unknown) => T): T[] {
  const full = path.join(DATA, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".json")).sort().map((f) => parse(JSON.parse(fs.readFileSync(path.join(full, f), "utf8"))));
}
function writeJson(rel: string, obj: unknown) {
  if (dryRun) return;
  const p = path.join(DATA, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

async function draftFromCapture(source: RoadmapSource, cap: Capture, snapshots: RoadmapSnapshot[], items: RoadmapItem[]) {
  const html = await fetchHtml(cap.raw_url);
  const page = extractText(html, source.roadmap_urls.find((r) => r.url === url)?.selector);
  const extraction = await extractRoadmapItems({ model: source.extraction_model, text: page.text, page_url: cap.original, page_title: page.title });
  const itemsExtracted = toExtractedItems(extraction);
  const date = captureDate(cap);
  const seq = snapshots.filter((s) => s.game_id === source.game_id && s.captured_at.startsWith(date)).length + 1;
  const snapshot = RoadmapSnapshot.parse({
    id: `${source.game_id}-${date}-${seq}`,
    game_id: source.game_id,
    captured_at: `${date}T${cap.timestamp.slice(8, 10)}:${cap.timestamp.slice(10, 12)}:${cap.timestamp.slice(12, 14)}Z`,
    url: cap.original,
    archived_url: cap.archived_url,
    content_hash: hashExtraction(itemsExtracted),
    ...(extraction.roadmap_published_at ? { source_published_at: extraction.roadmap_published_at } : page.published_at ? { source_published_at: page.published_at } : {}),
    ...(extraction.covers_start && extraction.covers_end ? { covers: { start: extraction.covers_start, end: extraction.covers_end } } : {}),
    items_extracted: itemsExtracted,
    extraction_model: source.extraction_model,
    extraction_confidence: extraction.confidence,
    captured_by: "backfill",
  });
  const prev = snapshots.filter((s) => s.game_id === source.game_id && s.url === cap.original).sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1))[0];
  writeJson(`roadmap-snapshots/${snapshot.id}.json`, snapshot);
  snapshots.push(snapshot);
  const diff = reconcile(source, snapshot, items.filter((i) => i.game_id === source.game_id));
  for (const c of diff.created) { writeJson(`roadmap-items/${c.id}.json`, RoadmapItem.parse(c)); items.push(c); }
  for (const u of diff.updated) { writeJson(`roadmap-items/${u.id}.json`, RoadmapItem.parse(u)); items.splice(items.findIndex((i) => i.id === u.id), 1, u); }
  console.log(`${snapshot.id}: ${itemsExtracted.length} items, confidence ${extraction.confidence.toFixed(2)}, ${prev && prev.content_hash === snapshot.content_hash ? "unchanged" : `${diff.created.length} new / ${diff.changes.filter((c) => c.kind === "window_changed").length} window changes`}`);
}

async function main() {
  const source = readJsonDir("roadmap-sources", (r) => RoadmapSource.parse(r)).find((s) => s.game_id === gameId);
  if (!source) throw new Error(`unknown game ${gameId} — add data/roadmap-sources/${gameId}.json first`);
  const snapshots = readJsonDir("roadmap-snapshots", (r) => RoadmapSnapshot.parse(r));
  const items = readJsonDir("roadmap-items", (r) => RoadmapItem.parse(r));

  let captures: Capture[];
  if (args.includes("--history")) {
    captures = await listCaptures(url!, { from: from ? `${from}-01` : undefined, to: to ? `${to}-31` : undefined, collapseDays: true });
    // Gap check for the pilot metric: Wayback coverage gaps > 90 days.
    for (let i = 1; i < captures.length; i++) {
      const gap = (Date.parse(captureDate(captures[i])) - Date.parse(captureDate(captures[i - 1]))) / 86_400_000;
      if (gap > 90) console.warn(`⚠️ coverage gap of ${Math.round(gap)} days before ${captureDate(captures[i])}`);
    }
  } else {
    const all = await listCaptures(url!, { collapseDays: true });
    if (all.length === 0) throw new Error(`no Wayback captures for ${url}`);
    captures = [closest ? all.reduce((b, c) => (Math.abs(Date.parse(captureDate(c)) - Date.parse(closest)) < Math.abs(Date.parse(captureDate(b)) - Date.parse(closest)) ? c : b)) : all[0]];
  }
  console.log(`${captures.length} capture(s) to draft for ${source.game_name}`);
  for (const cap of captures) {
    await draftFromCapture(source, cap, snapshots, items);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
