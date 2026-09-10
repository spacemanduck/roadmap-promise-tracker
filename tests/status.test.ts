import { describe, expect, it } from "vitest";
import { computeStatus, gameStats } from "../lib/status";
import type { RoadmapItem, RoadmapSnapshot } from "../schema/roadmap";
import { hashExtraction } from "../lib/hash";

const src = { roadmap_style: "periodic_posts" as const };
const living = { roadmap_style: "living_page" as const };

function snap(id: string, date: string, covers?: { start: string; end: string }): RoadmapSnapshot {
  return {
    id,
    game_id: "g",
    captured_at: `${date}T06:00:00Z`,
    url: "https://example.com/roadmap",
    archived_url: "https://web.archive.org/web/2026/https://example.com/roadmap",
    content_hash: hashExtraction([]),
    items_extracted: [],
    extraction_model: "human",
    extraction_confidence: 1,
    captured_by: "human",
    ...(covers ? { covers } : {}),
  };
}

const patch = {
  url: "https://example.com/patch",
  title: "Patch 1.2",
  kind: "patch_note" as const,
  published_at: "2026-02-10",
};

function item(over: Partial<RoadmapItem>): RoadmapItem {
  return {
    id: "i",
    game_id: "g",
    title_normalised: "Thing",
    item_keys: ["thing"],
    first_seen: { snapshot_id: "s1", date: "2026-01-01" },
    window_history: [
      {
        snapshot_id: "s1",
        captured_at: "2026-01-01",
        window_as_stated: "February 2026",
        window_normalised: { start: "2026-02-01", end: "2026-02-28", rule: "month" },
      },
    ],
    last_seen: { snapshot_id: "s1", date: "2026-01-01" },
    delivery: null,
    verified_by: null,
    verified_at: null,
    ...over,
  };
}

describe("computeStatus", () => {
  const snaps = [snap("s1", "2026-01-01")];

  it("ON_TIME when delivered on or before window end", () => {
    const s = computeStatus(item({ delivery: { date: "2026-02-28", source: patch, matched_by: "human" } }), snaps, src, "2026-09-10");
    expect(s.code).toBe("ON_TIME");
  });

  it("LATE with late_by_days when delivered after window end", () => {
    const s = computeStatus(item({ delivery: { date: "2026-03-05", source: patch, matched_by: "human" } }), snaps, src, "2026-09-10");
    expect(s.code).toBe("LATE");
    expect(s.late_by_days).toBe(5);
  });

  it("PENDING while the window is open, or when there is no window", () => {
    expect(computeStatus(item({}), snaps, src, "2026-02-10").code).toBe("PENDING");
    const noWindow = item({ window_history: [{ snapshot_id: "s1", captured_at: "2026-01-01", window_as_stated: "TBA", window_normalised: null }] });
    expect(computeStatus(noWindow, snaps, src, "2027-01-01").code).toBe("PENDING");
  });

  it("OVERDUE when the window has passed and the item is still on the latest snapshot", () => {
    expect(computeStatus(item({}), snaps, src, "2026-03-10").code).toBe("OVERDUE");
  });

  it("DROPPED only when absent from the two most recent relevant snapshots (living page)", () => {
    const three = [snap("s1", "2026-01-01"), snap("s2", "2026-03-01"), snap("s3", "2026-04-01")];
    expect(computeStatus(item({}), three, living, "2026-04-10").code).toBe("DROPPED");
    // Present in the latest snapshot → OVERDUE, not DROPPED
    expect(computeStatus(item({ last_seen: { snapshot_id: "s3", date: "2026-04-01" } }), three, living, "2026-04-10").code).toBe("OVERDUE");
    // Only one later snapshot → not enough evidence → OVERDUE
    expect(computeStatus(item({}), three.slice(0, 2), living, "2026-04-10").code).toBe("OVERDUE");
  });

  it("periodic posts: a later post that does not cover the window cannot drop the item", () => {
    const posts = [
      snap("s1", "2026-01-01", { start: "2026-01-01", end: "2026-04-30" }),
      snap("s2", "2026-05-01", { start: "2026-05-01", end: "2026-08-31" }),
      snap("s3", "2026-09-01", { start: "2026-09-01", end: "2026-12-31" }),
    ];
    expect(computeStatus(item({}), posts, src, "2026-09-10").code).toBe("OVERDUE");
    // Two later posts that DO cover Feb 2026 and omit the item → DROPPED
    const covering = [
      snap("s1", "2026-01-01", { start: "2026-01-01", end: "2026-04-30" }),
      snap("s2", "2026-01-15", { start: "2026-01-01", end: "2026-04-30" }),
      snap("s3", "2026-02-01", { start: "2026-01-01", end: "2026-04-30" }),
    ];
    expect(computeStatus(item({}), covering, src, "2026-09-10").code).toBe("DROPPED");
  });

  it("CANCELLED and SCOPE_CHANGED come only from overrides with rationale", () => {
    const cancelled = item({
      status_override: { code: "CANCELLED", rationale: "Publisher stated the feature will not ship.", source: { ...patch, kind: "publisher_post" } },
    });
    expect(computeStatus(cancelled, snaps, src, "2026-09-10").code).toBe("CANCELLED");
    const scoped = item({
      delivery: { date: "2026-03-05", source: patch, matched_by: "human" },
      status_override: { code: "SCOPE_CHANGED", rationale: "Shipped as a limited-time event rather than a permanent mode." },
    });
    const s = computeStatus(scoped, snaps, src, "2026-09-10");
    expect(s.code).toBe("SCOPE_CHANGED");
    expect(s.paired_with).toBe("LATE");
  });

  it("slipped counts window ends that moved later, and is independent of status", () => {
    const slipped = item({
      window_history: [
        { snapshot_id: "s1", captured_at: "2026-01-01", window_as_stated: "January 2026", window_normalised: { start: "2026-01-01", end: "2026-01-31", rule: "month" } },
        { snapshot_id: "s1", captured_at: "2026-01-01", window_as_stated: "February 2026", window_normalised: { start: "2026-02-01", end: "2026-02-28", rule: "month" } },
      ],
      delivery: { date: "2026-02-20", source: patch, matched_by: "human" },
    });
    const s = computeStatus(slipped, snaps, src, "2026-09-10");
    expect(s.code).toBe("ON_TIME");
    expect(s.slipped).toBe(1);
    // A narrowing (Q4 → November) is recorded but is not a slip.
    const narrowed = item({
      window_history: [
        { snapshot_id: "s1", captured_at: "2026-01-01", window_as_stated: "Q4 2026", window_normalised: { start: "2026-10-01", end: "2026-12-31", rule: "calendar_quarter" } },
        { snapshot_id: "s1", captured_at: "2026-01-01", window_as_stated: "November", window_normalised: { start: "2026-11-01", end: "2026-11-30", rule: "month" } },
      ],
    });
    expect(computeStatus(narrowed, snaps, src, "2026-09-10").slipped).toBe(0);
  });
});

describe("gameStats", () => {
  it("never hides the denominator", () => {
    const snaps = [snap("s1", "2026-01-01")];
    const views = [
      item({ id: "a", delivery: { date: "2026-02-01", source: patch, matched_by: "human" } }),
      item({ id: "b", delivery: { date: "2026-03-01", source: patch, matched_by: "human" } }),
      item({ id: "c", window_history: [{ snapshot_id: "s1", captured_at: "2026-01-01", window_as_stated: "TBA", window_normalised: null }] }),
    ].map((it) => ({ item: it, status: computeStatus(it, snaps, src, "2026-09-10") }));
    const st = gameStats(views);
    expect(st.total).toBe(3);
    expect(st.without_window).toBe(1);
    expect(st.denominator).toBe(2);
    expect(st.on_time_rate).toBe(0.5);
  });
});
