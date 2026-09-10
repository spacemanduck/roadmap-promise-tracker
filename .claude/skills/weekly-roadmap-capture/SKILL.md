---
name: weekly-roadmap-capture
description: Run the weekly roadmap capture for the Roadmap Promise Tracker — fetch every tracked game's roadmap, archive it, extract items, diff against the last snapshot, match deliveries to new patch notes, and open one reviewable PR. Use when asked to "run the weekly capture", "capture roadmaps", or when the capture script's extraction is too brittle for a game's format and a judgement-assisted pass is needed.
---

# Weekly roadmap capture

This is the agentic fallback for `scripts/capture.ts` + `scripts/match-delivery.ts`. Prefer the
scripts (deterministic, cheaper). Use this skill when a game's page format defeats the script
or when the human asks for a judgement-assisted pass.

## Standing rules (from CLAUDE.md — non-negotiable)

1. **Never store an image.** Download roadmap graphics to a temp directory only, read them,
   record extracted text + hash + archive link, delete the file. Nothing under `data/` may be an image.
2. **Discovery sources are not data sources.** Reddit, X, YouTube, wikis and your own memory may
   tell you where to look. Every stored citation is the publisher's page, patch note, official
   post, or press reporting a publisher statement. Archive links point to those.
3. **Never write a status.** Status is computed at build time. Only edit the fields the schema
   allows; `SCOPE_CHANGED`/`CANCELLED` are human overrides with a written rationale.
4. **Conservative coding.** Quote windows exactly as stated. Normalisation is mechanical
   (`lib/window.ts`); if a window admits two readings, the later end date wins and the reading is
   recorded in `capture_notes` / `reading_note`.

## Steps

1. `npm run capture` — run the script first. Read `reports/capture-report.md`.
2. For any game marked ❌ or with confidence < 0.7:
   - Open the roadmap URL from `data/roadmap-sources/<game>.json`.
   - If it is an image, fetch it to `$TMPDIR`, read it, and produce `items_extracted[]`
     (`item_key`, `title_as_stated`, `window_as_stated`, `position`) exactly as written.
   - Trigger a Wayback save (`https://web.archive.org/save/<url>`) and record the archive link.
   - Write the snapshot to `data/roadmap-snapshots/<game>-<date>-<n>.json` with
     `captured_by: "human"`, `extraction_model: "<model id>"`, and the hash from `lib/hash.ts`
     (`npx tsx -e` helper is fine).
   - Reconcile with `lib/diff.ts` (`reconcile(source, snapshot, items)`) rather than editing items by hand.
   - Delete the image.
3. `npm run match` — then review each proposal. Reject any match where the patch note does not
   name the item as shipped (announcements of future content are not deliveries).
4. `npm run validate` must pass. `git status` must show only `data/**/*.json`.
5. Open one PR titled `Roadmap capture — week <ISO week>`, body = `reports/capture-report.md`,
   grouped by game: changes, proposed deliveries, extraction confidence.
6. `curl` the heartbeat URL in `ROADMAP_HEARTBEAT_URL` if set.

## Review target

The human should be able to review the PR on the preview deploy in **under 30 minutes for five
games**. If your PR needs more than that, the report is not doing its job — make the diff and the
quoted patch-note sentence for each proposal obvious.
