/**
 * capture.ts — weekly roadmap capture (docs: plan §5).
 *
 * For every game in data/roadmap-sources:
 *   1. Fetch each roadmap URL (images go to a temp dir on the runner and are deleted at the end).
 *   2. Trigger a Wayback save; keep the archive link.
 *   3. Extract items (text or vision) with the game's extraction model.
 *   4. Hash the extraction. If unchanged from the last snapshot, record the snapshot and stop.
 *   5. If changed, reconcile against existing items: new items, changed windows, still-present.
 *   6. Write a capture report for the PR body (reports/capture-report.md).
 *
 * Nothing is committed here — the workflow opens the PR. Images never touch data/.
 *
 * Usage: npx tsx scripts/capture.ts [--game <id>] [--dry-run] [--no-archive]
 */
import fs from "node:fs";
import path from "node:path";
import { CaptureState, RoadmapItem, RoadmapSnapshot, RoadmapSource } from "../schema/roadmap";
import { hashExtraction } from "../lib/hash";
import { waybackSave, latestCapture } from "../lib/archive";
import { deleteTempDir, downloadImageToTemp, extractImageUrls, extractText, fetchHtml } from "../lib/page";
import { extractRoadmapItems, toExtractedItems } from "../lib/extract";
import { reconcile } from "../lib/diff";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const args = process.argv.slice(2);
const onlyGame = args.includes("--game") ? args[args.indexOf("--game") + 1] : undefined;
const dryRun = args.includes("--dry-run");
const noArchive = args.includes("--no-archive");

function readJsonDir<T>(dir: string, parse: (r: unknown) => T): T[] {
  const full = path.join(DATA, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".json")).sort().map((f) => parse(JSON.parse(fs.readFileSync(path.join(full, f), "utf8"))));
}
function writeJson(rel: string, obj: unknown) {
  const p = path.join(DATA, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!dryRun) fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +y0) / 86_400_000 + 1) / 7)).padStart(2, "0")}`;
}

interface GameReport {
  game: string;
  lines: string[];
  confidence: number | null;
  changed: boolean;
  error?: string;
}

async function captureGame(source: RoadmapSource, snapshots: RoadmapSnapshot[], items: RoadmapItem[]): Promise<GameReport> {
  const report: GameReport = { game: source.game_name, lines: [], confidence: null, changed: false };
  const now = new Date();
  const capturedAt = now.toISOString();
  const date = capturedAt.slice(0, 10);
  const tempDirs: string[] = [];

  try {
    for (const [i, rm] of source.roadmap_urls.entries()) {
      const html = await fetchHtml(rm.url);
      const page = extractText(html, rm.kind === "image_in_post" ? undefined : rm.selector);

      let extraction;
      if (rm.kind === "image_in_post") {
        const imgs = extractImageUrls(html, rm.url, rm.selector);
        if (imgs.length === 0) throw new Error(`no roadmap image found at ${rm.url} (selector: ${rm.selector ?? "none"})`);
        const dl = await downloadImageToTemp(imgs[0]);
        tempDirs.push(dl.dir);
        extraction = await extractRoadmapItems({ model: source.extraction_model, image: { file: dl.file, media_type: dl.media_type }, page_url: rm.url, page_title: page.title, text: page.text.slice(0, 4000) });
      } else {
        extraction = await extractRoadmapItems({ model: source.extraction_model, text: page.text, page_url: rm.url, page_title: page.title });
      }
      const itemsExtracted = toExtractedItems(extraction);
      const content_hash = hashExtraction(itemsExtracted);

      const archived = noArchive ? null : (await waybackSave(rm.url)) ?? (await latestCapture(rm.url));
      if (!archived) report.lines.push(`- ⚠️ no archive link obtained for ${rm.url}`);

      const previous = snapshots
        .filter((s) => s.game_id === source.game_id && s.url === rm.url)
        .sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1))[0];

      const snapshot: RoadmapSnapshot = RoadmapSnapshot.parse({
        id: `${source.game_id}-${date}-${i + 1}`,
        game_id: source.game_id,
        captured_at: capturedAt,
        url: rm.url,
        archived_url: archived ?? previous?.archived_url ?? rm.url,
        content_hash,
        ...(extraction.roadmap_published_at ? { source_published_at: extraction.roadmap_published_at } : page.published_at ? { source_published_at: page.published_at } : {}),
        ...(extraction.covers_start && extraction.covers_end ? { covers: { start: extraction.covers_start, end: extraction.covers_end } } : {}),
        items_extracted: itemsExtracted,
        extraction_model: source.extraction_model,
        extraction_confidence: extraction.confidence,
        captured_by: "script",
      });
      report.confidence = Math.min(report.confidence ?? 1, extraction.confidence);
      writeJson(`roadmap-snapshots/${snapshot.id}.json`, snapshot);

      if (previous && previous.content_hash === content_hash) {
        report.lines.push(`- ${rm.url}: unchanged since ${previous.captured_at.slice(0, 10)} (${itemsExtracted.length} items). Snapshot recorded; no item edits.`);
        // Still-present bookkeeping: last_seen moves forward without touching windows.
        const diff = reconcile(source, snapshot, items.filter((it) => it.game_id === source.game_id));
        for (const upd of diff.updated) writeJson(`roadmap-items/${upd.id}.json`, RoadmapItem.parse(upd));
        continue;
      }

      report.changed = true;
      const diff = reconcile(source, snapshot, items.filter((it) => it.game_id === source.game_id));
      for (const c of diff.created) writeJson(`roadmap-items/${c.id}.json`, RoadmapItem.parse(c));
      for (const u of diff.updated) writeJson(`roadmap-items/${u.id}.json`, RoadmapItem.parse(u));
      report.lines.push(`- ${rm.url}: **changed** (${itemsExtracted.length} items extracted, confidence ${extraction.confidence.toFixed(2)}) — archive: ${snapshot.archived_url}`);
      for (const ch of diff.changes.filter((c) => c.kind !== "still_present")) {
        report.lines.push(`  - ${ch.kind === "new" ? "🆕" : "🔁"} \`${ch.item_id}\`: ${ch.detail}`);
      }
      if (diff.absent.length) {
        report.lines.push(`  - absent from this capture: ${diff.absent.map((a) => `\`${a.id}\``).join(", ")} (status is computed; nothing was edited)`);
      }
    }
  } catch (e) {
    report.error = e instanceof Error ? e.message : String(e);
    report.lines.push(`- ❌ ${report.error}`);
  } finally {
    for (const d of tempDirs) deleteTempDir(d);
  }

  const statePath = `capture-state/${source.game_id}.json`;
  const state = CaptureState.parse(fs.existsSync(path.join(DATA, statePath)) ? JSON.parse(fs.readFileSync(path.join(DATA, statePath), "utf8")) : { game_id: source.game_id });
  state.last_capture_run = capturedAt;
  writeJson(statePath, state);
  return report;
}

async function main() {
  const sources = readJsonDir("roadmap-sources", (r) => RoadmapSource.parse(r)).filter((s) => !onlyGame || s.game_id === onlyGame);
  const snapshots = readJsonDir("roadmap-snapshots", (r) => RoadmapSnapshot.parse(r));
  const items = readJsonDir("roadmap-items", (r) => RoadmapItem.parse(r));
  const reports: GameReport[] = [];
  for (const s of sources) {
    console.log(`capture: ${s.game_name}`);
    reports.push(await captureGame(s, snapshots, items));
    await new Promise((r) => setTimeout(r, 4000)); // be polite to the archive
  }

  const week = isoWeek(new Date());
  const md = [
    `# Roadmap capture — week ${week}`,
    "",
    "Review on the preview deploy, correct anything wrong, set `verified_by`, merge.",
    "",
    "| Game | Changed | Extraction confidence | Error |",
    "|---|---|---|---|",
    ...reports.map((r) => `| ${r.game} | ${r.changed ? "yes" : "no"} | ${r.confidence === null ? "—" : r.confidence.toFixed(2)} | ${r.error ?? ""} |`),
    "",
    ...reports.flatMap((r) => [`## ${r.game}`, "", ...(r.lines.length ? r.lines : ["- nothing to report"]), ""]),
  ].join("\n");
  fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "reports", "capture-report.md"), md);
  console.log(md);
  if (reports.some((r) => r.error)) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
