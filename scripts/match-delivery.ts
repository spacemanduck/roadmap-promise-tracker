/**
 * match-delivery.ts — weekly delivery matching (docs: plan §5 step 6).
 *
 * For every game: fetch the patch-note index pages, find notes not yet scanned, and for each
 * item with no delivery whose window is open or past (PENDING / OVERDUE), look for the item's
 * title in the patch note. A match proposes `delivery` with matched_by: "script". The matched
 * sentence is quoted in the report for the human — it is never stored.
 *
 * Usage: npx tsx scripts/match-delivery.ts [--game <id>] [--dry-run] [--max-notes N]
 */
import fs from "node:fs";
import path from "node:path";
import { CaptureState, RoadmapItem, RoadmapSource } from "../schema/roadmap";
import { extractLinks, extractText, fetchHtml } from "../lib/page";
import { latestCapture } from "../lib/archive";
import { tokens } from "../lib/diff";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");
const args = process.argv.slice(2);
const onlyGame = args.includes("--game") ? args[args.indexOf("--game") + 1] : undefined;
const dryRun = args.includes("--dry-run");
const maxNotes = args.includes("--max-notes") ? Number(args[args.indexOf("--max-notes") + 1]) : 12;

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

interface Proposal {
  item: RoadmapItem;
  note: { url: string; title: string; published_at?: string; archived_url?: string };
  sentence: string;
  score: number;
}

/** Find the sentence in `text` that best covers the title's tokens. Requires every content token. */
export function findMention(title: string, text: string): { sentence: string; score: number } | null {
  const want = [...tokens(title)];
  if (want.length === 0) return null;
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  let best: { sentence: string; score: number } | null = null;
  for (const s of sentences) {
    const have = tokens(s);
    const hit = want.filter((t) => have.has(t)).length;
    const score = hit / want.length;
    if (score >= 0.999 && (!best || s.length < best.sentence.length)) best = { sentence: s.trim().slice(0, 240), score };
  }
  return best;
}

async function matchGame(source: RoadmapSource, items: RoadmapItem[], today: string): Promise<string[]> {
  const lines: string[] = [];
  const statePath = `capture-state/${source.game_id}.json`;
  const state = CaptureState.parse(fs.existsSync(path.join(DATA, statePath)) ? JSON.parse(fs.readFileSync(path.join(DATA, statePath), "utf8")) : { game_id: source.game_id });
  const seen = new Set(state.seen_patch_note_urls);

  const candidates = items.filter((it) => it.game_id === source.game_id && !it.delivery && !it.status_override);
  if (candidates.length === 0) return ["- no undelivered items"];

  const notes: { url: string; title: string }[] = [];
  for (const idx of source.patch_note_urls) {
    try {
      const html = await fetchHtml(idx.url);
      const links = extractLinks(html, idx.url, idx.selector);
      const pattern = idx.title_pattern ? new RegExp(idx.title_pattern, "i") : /release notes|patch notes|update|hotfix/i;
      for (const l of links) {
        if (!pattern.test(l.text)) continue;
        if (seen.has(l.url) || notes.some((n) => n.url === l.url)) continue;
        if (new URL(l.url).origin !== new URL(idx.url).origin) continue; // publisher's own site only
        notes.push({ url: l.url, title: l.text });
      }
    } catch (e) {
      lines.push(`- ⚠️ could not read patch-note index ${idx.url}: ${e instanceof Error ? e.message : e}`);
    }
  }
  const batch = notes.slice(0, maxNotes);
  if (batch.length === 0) lines.push("- no new patch notes since last run");

  const proposals: Proposal[] = [];
  for (const n of batch) {
    try {
      const html = await fetchHtml(n.url);
      const page = extractText(html);
      const published_at = page.published_at;
      for (const it of candidates) {
        if (proposals.some((p) => p.item.id === it.id)) continue;
        const win = it.window_history[it.window_history.length - 1].window_normalised;
        // Only propose deliveries for notes published on/after first sighting (a note older than the
        // promise cannot be its delivery) and not absurdly before the window.
        if (published_at && published_at < it.first_seen.date) continue;
        const mention = findMention(it.title_normalised, page.text);
        if (!mention) continue;
        if (win && published_at && published_at < win.start && daysBetween(published_at, win.start) > 120) continue;
        proposals.push({ item: it, note: { url: n.url, title: page.title || n.title, published_at }, sentence: mention.sentence, score: mention.score });
      }
      seen.add(n.url);
    } catch (e) {
      lines.push(`- ⚠️ could not read ${n.url}: ${e instanceof Error ? e.message : e}`);
    }
  }

  for (const p of proposals) {
    const archived = (await latestCapture(p.note.url)) ?? undefined;
    const date = p.note.published_at ?? today;
    const updated: RoadmapItem = RoadmapItem.parse({
      ...p.item,
      delivery: {
        date,
        source: { url: p.note.url, ...(archived ? { archived_url: archived } : {}), title: p.note.title, ...(p.note.published_at ? { published_at: p.note.published_at } : {}), kind: "patch_note" },
        matched_by: "script",
      },
    });
    writeJson(`roadmap-items/${updated.id}.json`, updated);
    lines.push(`- 📦 \`${p.item.id}\` → proposed delivery **${date}** from [${p.note.title}](${p.note.url})${p.note.published_at ? "" : " (⚠️ no date read from the page — check)"}`);
    lines.push(`  > ${p.sentence}`);
  }
  if (batch.length && proposals.length === 0) lines.push(`- scanned ${batch.length} note(s), no matches for ${candidates.length} undelivered item(s)`);

  state.seen_patch_note_urls = [...seen].slice(-500);
  state.last_match_run = new Date().toISOString();
  writeJson(statePath, state);
  return lines;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const sources = readJsonDir("roadmap-sources", (r) => RoadmapSource.parse(r)).filter((s) => !onlyGame || s.game_id === onlyGame);
  const items = readJsonDir("roadmap-items", (r) => RoadmapItem.parse(r));
  const sections: string[] = ["", "# Delivery matching", ""];
  for (const s of sources) {
    console.log(`match-delivery: ${s.game_name}`);
    const lines = await matchGame(s, items, today);
    sections.push(`## ${s.game_name}`, "", ...lines, "");
  }
  const md = sections.join("\n");
  fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
  fs.appendFileSync(path.join(ROOT, "reports", "capture-report.md"), md);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
