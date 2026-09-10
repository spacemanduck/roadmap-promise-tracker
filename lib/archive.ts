/**
 * Wayback Machine helpers: trigger a save, and find the closest existing capture.
 * No API key is needed; the anonymous save endpoint is rate-limited, so calls are serialised
 * by the caller with a short pause between games.
 */

const UA = "roadmap-promise-tracker/1.0 (+https://github.com/spacemanduck/roadmap-promise-tracker)";

/** Trigger a Wayback save and return the archived URL (or null if the save was refused). */
export async function waybackSave(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://web.archive.org/save/${url}`, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(120_000),
    });
    const loc = res.headers.get("content-location") ?? res.headers.get("x-archive-orig-location");
    if (loc) return loc.startsWith("http") ? loc : `https://web.archive.org${loc}`;
    if (res.url.includes("/web/")) return res.url;
    if (res.ok) return latestCapture(url);
    return null;
  } catch {
    return null;
  }
}

/** Latest existing capture of a URL via the CDX API, or null. */
export async function latestCapture(url: string): Promise<string | null> {
  const captures = await listCaptures(url, { limit: 1, reverse: true });
  return captures[0]?.archived_url ?? null;
}

export interface Capture {
  timestamp: string; // YYYYMMDDhhmmss
  original: string;
  archived_url: string;
  /** Raw content URL (no Wayback toolbar), for fetching. */
  raw_url: string;
}

export async function listCaptures(
  url: string,
  opts: { from?: string; to?: string; limit?: number; reverse?: boolean; collapseDays?: boolean } = {},
): Promise<Capture[]> {
  const params = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp,original",
    filter: "statuscode:200",
  });
  if (opts.from) params.set("from", opts.from.replace(/-/g, ""));
  if (opts.to) params.set("to", opts.to.replace(/-/g, ""));
  if (opts.limit) params.set("limit", String(opts.reverse ? -opts.limit : opts.limit));
  if (opts.collapseDays) params.set("collapse", "timestamp:8");
  const res = await fetch(`https://web.archive.org/cdx/search/cdx?${params}`, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) return [];
  const text = await res.text();
  if (!text.trim()) return [];
  const rows = JSON.parse(text) as string[][];
  return rows.slice(1).map(([timestamp, original]) => ({
    timestamp,
    original,
    archived_url: `https://web.archive.org/web/${timestamp}/${original}`,
    raw_url: `https://web.archive.org/web/${timestamp}id_/${original}`,
  }));
}

export function captureDate(c: Capture): string {
  const t = c.timestamp;
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}
