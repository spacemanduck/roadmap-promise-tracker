/**
 * Roadmap Promise Tracker — data schemas (zod).
 *
 * Record kinds under data/:
 *   data/roadmap-sources/<game_id>.json       RoadmapSource   — per game capture config
 *   data/roadmap-snapshots/<snapshot_id>.json RoadmapSnapshot — one capture of one roadmap URL
 *   data/roadmap-items/<item_id>.json         RoadmapItem     — the record
 *   data/capture-state/<game_id>.json         CaptureState    — what the weekly scripts have seen
 *
 * Rules enforced here (see docs/roadmap-methodology.md):
 *   - status is computed at build time and is never stored (strict objects reject it)
 *   - SCOPE_CHANGED / CANCELLED overrides require a human-written rationale
 *   - every delivery source is a patch note or a publisher post
 *   - snapshots store extracted text and hashes only — never image data
 */
import { z } from "zod";

export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s + "T00:00:00Z")), "invalid date");

export const IsoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid datetime");

export const Slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase slug");

/** A citation. Only publisher-controlled material or press reporting a publisher statement. */
export const SourceKind = z.enum(["patch_note", "publisher_post", "publisher_page", "press_report_of_statement"]);

export const Source = z
  .object({
    url: z.string().url(),
    archived_url: z.string().url().optional(),
    title: z.string().min(1),
    published_at: IsoDate.optional(),
    kind: SourceKind,
  })
  .strict();
export type Source = z.infer<typeof Source>;

// ---------------------------------------------------------------------------
// RoadmapSource
// ---------------------------------------------------------------------------

export const RoadmapUrl = z
  .object({
    url: z.string().url(),
    kind: z.enum(["page", "post", "image_in_post"]),
    /** CSS selector for the roadmap region (text pages) or the roadmap <img> (image_in_post). */
    selector: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

export const PatchNoteUrl = z
  .object({
    url: z.string().url(),
    kind: z.enum(["index", "feed"]),
    /** CSS selector for article links on an index page. */
    selector: z.string().optional(),
    /** Only index entries whose title matches this regex are treated as patch notes. */
    title_pattern: z.string().optional(),
  })
  .strict();

export const RoadmapSource = z
  .object({
    game_id: Slug,
    game_name: z.string().min(1),
    publisher_id: Slug,
    publisher_name: z.string().min(1),
    /**
     * living_page: one URL edited in place — the "two most recent snapshots" rule applies as written.
     * periodic_posts: each roadmap is a new dated post covering a stated period; absence from a later
     * post only counts against an item if that post covers the item's window.
     */
    roadmap_style: z.enum(["living_page", "periodic_posts"]),
    roadmap_urls: z.array(RoadmapUrl).min(1),
    patch_note_urls: z.array(PatchNoteUrl).min(1),
    /** ✎ human notes on format quirks and window readings. */
    capture_notes: z.string().optional(),
    /** Extraction model for this game. Escalate per game if confidence is low. */
    extraction_model: z.string().default("claude-haiku-4-5"),
    tracked_since: IsoDate,
    /** If the publisher defines a fiscal year on the page, the month it starts (1–12). */
    fiscal_year_start_month: z.number().int().min(1).max(12).optional(),
    /** ✎ one-paragraph human note on why this game is tracked (shown on /roadmaps/request). */
    why_tracked: z.string().optional(),
  })
  .strict();
export type RoadmapSource = z.infer<typeof RoadmapSource>;

// ---------------------------------------------------------------------------
// RoadmapSnapshot
// ---------------------------------------------------------------------------

export const ExtractedItem = z
  .object({
    /** Stable key proposed by extraction; RoadmapItem.item_keys maps keys to records. */
    item_key: Slug,
    title_as_stated: z.string().min(1),
    window_as_stated: z.string().min(1),
    position: z.number().int().min(0),
  })
  .strict();
export type ExtractedItem = z.infer<typeof ExtractedItem>;

export const RoadmapSnapshot = z
  .object({
    id: Slug,
    game_id: Slug,
    captured_at: IsoDateTime,
    url: z.string().url(),
    /** Wayback (or equivalent) link to the exact version that was extracted. */
    archived_url: z.string().url(),
    /** sha256 over the extraction (lib/hash.ts), not over page bytes. */
    content_hash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    /** Publisher-stated publication date of the roadmap, if any. */
    source_published_at: IsoDate.optional(),
    /** Period the roadmap says it covers (periodic_posts only). */
    covers: z.object({ start: IsoDate, end: IsoDate }).strict().optional(),
    items_extracted: z.array(ExtractedItem),
    extraction_model: z.string().min(1),
    extraction_confidence: z.number().min(0).max(1),
    captured_by: z.enum(["script", "backfill", "human"]),
  })
  .strict();
export type RoadmapSnapshot = z.infer<typeof RoadmapSnapshot>;

// ---------------------------------------------------------------------------
// RoadmapItem
// ---------------------------------------------------------------------------

export const WindowNormalised = z
  .object({
    start: IsoDate,
    end: IsoDate,
    /** Which rubric rule produced this reading, e.g. "month", "calendar_quarter", "season_meteorological". */
    rule: z.string().min(1),
    /** Recorded when a stated window admitted two readings (tie-break: later end date). */
    reading_note: z.string().optional(),
  })
  .strict();
export type WindowNormalised = z.infer<typeof WindowNormalised>;

export const WindowHistoryEntry = z
  .object({
    snapshot_id: Slug,
    captured_at: IsoDate,
    window_as_stated: z.string().min(1),
    window_normalised: WindowNormalised.nullable(),
  })
  .strict();
export type WindowHistoryEntry = z.infer<typeof WindowHistoryEntry>;

export const Delivery = z
  .object({
    date: IsoDate,
    source: Source,
    matched_by: z.enum(["script", "human"]),
    /** Short human note on what shipped — never a quote of the patch note. */
    note: z.string().optional(),
  })
  .strict()
  .refine((d) => d.source.kind === "patch_note" || d.source.kind === "publisher_post", {
    message: "delivery.source must be a patch note or a publisher post",
    path: ["source", "kind"],
  });
export type Delivery = z.infer<typeof Delivery>;

export const OverrideCode = z.enum(["SCOPE_CHANGED", "CANCELLED"]);

export const StatusOverride = z
  .object({
    code: OverrideCode,
    /** ✎ always human-written. */
    rationale: z.string().min(20, "rationale must be a real sentence"),
    /** Required for CANCELLED: the publisher statement. */
    source: Source.optional(),
  })
  .strict();

export const SeenRef = z.object({ snapshot_id: Slug, date: IsoDate }).strict();

export const RoadmapItem = z
  .object({
    id: Slug,
    game_id: Slug,
    /** ✎ human-set canonical name; automation proposes. */
    title_normalised: z.string().min(1),
    /** Extraction keys that map to this record (one per way the publisher has phrased it). */
    item_keys: z.array(Slug).min(1),
    first_seen: SeenRef,
    window_history: z.array(WindowHistoryEntry).min(1),
    last_seen: SeenRef,
    removed_at: IsoDate.optional(),
    delivery: Delivery.nullable(),
    status_override: StatusOverride.optional(),
    verified_by: z.string().nullable().default(null),
    verified_at: IsoDate.nullable().default(null),
    /** ✎ free-text human notes shown on the item page. */
    notes: z.string().optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.status_override?.code === "CANCELLED" && !item.status_override.source) {
      ctx.addIssue({ code: "custom", path: ["status_override", "source"], message: "CANCELLED requires the publisher statement as source" });
    }
    if (item.status_override?.code === "SCOPE_CHANGED" && !item.delivery) {
      ctx.addIssue({ code: "custom", path: ["status_override"], message: "SCOPE_CHANGED only applies to delivered items" });
    }
    if (item.verified_by && !item.verified_at) {
      ctx.addIssue({ code: "custom", path: ["verified_at"], message: "verified_at required when verified_by is set" });
    }
    for (let i = 1; i < item.window_history.length; i++) {
      if (item.window_history[i].captured_at < item.window_history[i - 1].captured_at) {
        ctx.addIssue({ code: "custom", path: ["window_history", i], message: "window_history must be in capture order" });
      }
    }
  });
export type RoadmapItem = z.infer<typeof RoadmapItem>;

// ---------------------------------------------------------------------------
// CaptureState — bookkeeping for the weekly scripts
// ---------------------------------------------------------------------------

export const CaptureState = z
  .object({
    game_id: Slug,
    last_capture_run: IsoDateTime.optional(),
    last_match_run: IsoDateTime.optional(),
    /** Patch-note URLs already scanned by match-delivery.ts. */
    seen_patch_note_urls: z.array(z.string().url()).default([]),
  })
  .strict();
export type CaptureState = z.infer<typeof CaptureState>;

/** Computed only — never persisted. */
export const StatusCode = z.enum(["ON_TIME", "LATE", "PENDING", "OVERDUE", "DROPPED", "CANCELLED", "SCOPE_CHANGED"]);
export type StatusCode = z.infer<typeof StatusCode>;
