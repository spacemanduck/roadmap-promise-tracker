# Roadmap Promise Tracker — house notes for Claude Code

This repo is the house scaffold plus its first tool, the **roadmap promise tracker** (`/roadmaps`).
Plan A's tool was meant to land first and share this scaffold; it has not been built here yet, so
the house layout, legal pages, CI and corrections route live in this repo and are shared by any
tool added later. Do not build a second site.

## USP

The thing a competitor cannot reproduce in a weekend is the item-level extraction of every
roadmap version for the tracked games since 2024-12-14 (the earliest snapshot in `data/`), with
each item's window history and delivery date pinned to patch notes.

Raw snapshots are recoverable from the Wayback Machine and are not the asset. The extraction, the
window-change history, the delivery matching and the published rubric are. Keep building those.

## Standing constraints (non-negotiable)

1. **Roadmap images are never republished.** The pipeline downloads them to a temp dir on the CI
   runner, extracts text, discards the file. Only extracted text, hashes and the archive link are
   stored. No thumbnails, no crops. `scripts/validate.ts` fails CI if an image appears under `data/`.
2. **Discovery sources are not data sources.** Reddit, X, YouTube, wikis and LLM recall may tell a
   human where to look. The stored citation is always a publisher page, patch note, official blog,
   official social post reached through the publisher's site or an archive, or press reporting a
   publisher statement. (Reddit's Data API needs a commercial agreement; X's has no free tier.
   Neither is a data source.)
3. **Status is mechanical where it can be, and marked as judgement where it can't.** Status is
   computed at build time in `lib/status.ts` and is never stored. The one judgement code
   (`SCOPE_CHANGED`) always carries a human-written rationale; `CANCELLED` needs the statement.
4. **Conservative coding.** Ambiguous windows are read in the publisher's favour (later end date)
   and the reading is recorded. A publisher must be able to look at any row and see exactly why it
   says what it says. The rubric is `docs/roadmap-methodology.md` and is published verbatim.

## Layout

```
data/roadmap-sources/*.json    per game: roadmap URLs, patch-note URLs, capture config (✎ capture_notes)
data/roadmap-snapshots/*.json  per capture: extraction, hash, archive link — no images
data/roadmap-items/*.json      per item: window history, delivery, overrides, verification
data/capture-state/*.json      what the weekly scripts have already seen
schema/roadmap.ts              zod — strict objects; a stored `status` is a validation error
lib/window.ts                  window normalisation (the rubric table, as code)
lib/status.ts                  status computation + per-game stats (denominator never hidden)
lib/diff.ts                    snapshot → item reconciliation (pure)
lib/extract.ts                 Claude extraction (structured outputs); default model per game
scripts/capture.ts             weekly: fetch → archive → extract → diff → report
scripts/match-delivery.ts      weekly: patch notes → proposed deliveries → report
scripts/backfill-roadmaps.ts   pilot/seed drafting from Wayback captures
scripts/seed/*.ts              the hand-checked seed spec; `npm run seed` regenerates data/ from it
scripts/validate.ts            CI gate
docs/roadmap-methodology.md    the rubric, rendered at /roadmaps/methodology
docs/pilot.md                  Phase 0 worksheet and go/no-go table
.github/workflows/weekly-roadmap.yml   Tuesday 06:00 UTC; opens one PR; heartbeat
.claude/skills/weekly-roadmap-capture/ agentic fallback for brittle formats
app/roadmaps/...               the routes
```

## Working rules

- `npm run validate && npm run typecheck && npm test && npm run build` before any commit.
- Edit data by adding/editing JSON under `data/`. Never hand-write a `status`.
- New game: add `data/roadmap-sources/<id>.json`, then `npm run backfill -- --game <id> --url <roadmap url>`.
- Human-only fields are marked ✎ in the schema comments (`title_normalised`, `capture_notes`,
  `status_override`, `verified_by`, `verified_at`, `notes`, `why_tracked`).
- Voice: see `docs/voice.md`. Receipts, not opinion. No adjectives about publishers.
- Secrets in CI: `ANTHROPIC_API_KEY`, `ROADMAP_HEARTBEAT_URL` (Better Stack). Nothing else.
