/**
 * Page fetching and text extraction. Images are only ever written to a temp directory and are
 * deleted by the caller — nothing under data/ is ever an image.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (compatible; roadmap-promise-tracker/1.0; +https://github.com/spacemanduck/roadmap-promise-tracker)";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

export interface PageText {
  title: string;
  /** Publisher-stated publication date if one could be read from the page (YYYY-MM-DD). */
  published_at?: string;
  text: string;
}

/** Visible text of a page (or of `selector` within it), with scripts/styles/nav stripped. */
export function extractText(html: string, selector?: string): PageText {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer, header, form").remove();
  const title = ($("meta[property='og:title']").attr("content") ?? $("title").first().text()).trim();
  const root = selector ? $(selector) : $("main, article").first().length ? $("main, article").first() : $("body");
  // Block-level tags become line breaks so lists survive.
  root.find("br, p, li, h1, h2, h3, h4, h5, h6, tr, div, section").each((_, el) => {
    $(el).append("\n");
  });
  const text = root
    .text()
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  const published_at = readPublishedDate($, text);
  return { title, text, ...(published_at ? { published_at } : {}) };
}

function readPublishedDate($: cheerio.CheerioAPI, text: string): string | undefined {
  const meta =
    $("meta[property='article:published_time']").attr("content") ??
    $("meta[name='date']").attr("content") ??
    $("time[datetime]").first().attr("datetime");
  if (meta && !Number.isNaN(Date.parse(meta))) return new Date(meta).toISOString().slice(0, 10);
  // Fallback: first "Month D, YYYY" / "D Mon YYYY" in the first 1,500 characters.
  const head = text.slice(0, 1500);
  const m1 = head.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})\b/);
  if (m1) return toIso(m1[3], m1[1], m1[2]);
  const m2 = head.match(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]* (\d{4})\b/);
  if (m2) return toIso(m2[3], m2[2], m2[1]);
  return undefined;
}

function toIso(y: string, monthName: string, d: string): string {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const m = months.indexOf(monthName.slice(0, 3).toLowerCase()) + 1;
  return `${y}-${String(m).padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Links on an index page: absolute URL + link text. */
export function extractLinks(html: string, baseUrl: string, selector = "a[href]"): { url: string; text: string }[] {
  const $ = cheerio.load(html);
  const out: { url: string; text: string }[] = [];
  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const url = new URL(href, baseUrl).toString();
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) out.push({ url, text });
    } catch {
      /* skip malformed */
    }
  });
  return out;
}

/** Image URLs inside `selector` (defaults to the whole document). */
export function extractImageUrls(html: string, baseUrl: string, selector?: string): string[] {
  const $ = cheerio.load(html);
  const root = selector ? $(selector) : $("body");
  const urls: string[] = [];
  root.find("img[src], img[data-src]").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    if (!src || src.startsWith("data:")) return;
    try {
      urls.push(new URL(src, baseUrl).toString());
    } catch {
      /* skip */
    }
  });
  return urls;
}

/** Download an image to a temp dir. The caller MUST delete the returned directory. */
export async function downloadImageToTemp(url: string): Promise<{ dir: string; file: string; media_type: string }> {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const media_type = (res.headers.get("content-type") ?? "image/png").split(";")[0].trim();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "roadmap-img-"));
  const file = path.join(dir, "roadmap" + extFor(media_type));
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return { dir, file, media_type };
}

function extFor(mt: string) {
  return mt.includes("jpeg") ? ".jpg" : mt.includes("webp") ? ".webp" : mt.includes("gif") ? ".gif" : ".png";
}

export function deleteTempDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}
