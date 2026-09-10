# Roadmap Promise Tracker

For a fixed set of live-service games, a record of every item a publisher put on a public roadmap:
what was promised, for when, whether it arrived, when, and how the window moved between roadmap
versions. Every fact cites the publisher's own page (archived) or patch notes. Receipts, not opinion.

- **Site:** `/roadmaps` (games), `/roadmaps/<game>` (timeline), `/roadmaps/<game>/<item>` (the receipt),
  `/roadmaps/methodology` (the rubric, verbatim from `docs/roadmap-methodology.md`), `/roadmaps/request`.
- **Data:** JSON under `data/`, validated by `scripts/validate.ts` against `schema/roadmap.ts`.
  Status is computed at build time (`lib/status.ts`) and never stored.
- **Weekly capture:** `.github/workflows/weekly-roadmap.yml` runs Tuesday 06:00 UTC, archives each
  roadmap, extracts items with Claude, matches deliveries to new patch notes, and opens one PR.

## Commands

```bash
npm install
npm run validate     # schemas, referential integrity, no images under data/
npm test             # window rubric, status rules
npm run typecheck
npm run build
npm run a11y         # axe at 375px and 1280px against the built site (needs: npx playwright install chromium)
npm run seed -- --clean   # regenerate data/ from the hand-checked specs in scripts/seed/
npm run capture -- --game lost-ark --dry-run   # needs ANTHROPIC_API_KEY
npm run match -- --game lost-ark --dry-run
npm run backfill -- --game <id> --url <roadmap url> [--closest YYYY-MM-DD]
```

## Adding a game

1. Check Wayback coverage of the roadmap URL and the patch-notes index (`lib/archive.ts` → `listCaptures`).
2. Add `data/roadmap-sources/<game_id>.json` (see an existing one for the shape).
3. `npm run backfill -- --game <game_id> --url <roadmap url>` for each archived roadmap version, or
   write a spec under `scripts/seed/` if you are hand-checking.
4. Review every row on the preview deploy; set `verified_by` / `verified_at`.

## Secrets (GitHub Actions)

- `ANTHROPIC_API_KEY` — extraction (vision for image roadmaps, structured text extraction otherwise).
- `ROADMAP_HEARTBEAT_URL` — Better Stack heartbeat, pinged after a successful run.

## Standing constraints

See `CLAUDE.md`. In short: no roadmap images are ever stored or shown; discovery sources are not
data sources; status is mechanical; ambiguity is read in the publisher's favour and the reading is
recorded.
