# Phase 0 — G2 pilot worksheet

Purpose: prove the backfill scales before spending G3 hours. Started 10 September 2026.

## Candidate games

Chosen because each publishes roadmaps as **text** on its own site (no image extraction needed
for the pilot), publishes dated patch notes on its own site, and has Wayback coverage of both.

| Game | Publisher | Roadmap format | Patch notes | Wayback coverage checked |
|---|---|---|---|---|
| Lost Ark | Amazon Game Studios | Dated "Roadmap – Part N" posts, three or four a year, month-by-month headings | Dated release-notes articles on playlostark.com | Yes — every roadmap post since Dec 2022 has a capture; release notes captured within weeks |
| Sea of Thieves | Rare / Microsoft | Six-monthly "Community Direct" posts plus monthly "This Month in Sea of Thieves" schedules | Versioned release notes on seaofthieves.com | Yes — monthly posts and every 3.x release-notes page captured |
| Hunt: Showdown 1896 | Crytek | Annual "Roadmap" post (text), year-long windows | Release-notes section plus dated news posts on huntshowdown.com | Yes — roadmap captured 8 Nov 2025; news/release notes captured monthly |
| _(4th)_ | | | | not yet chosen — see §11 of the plan; needs the human's list |
| _(5th)_ | | | | not yet chosen |

Two obvious candidates were rejected on inspection: **Deep Rock Galactic** (the roadmap page on
deeprockgalactic.com has not been updated since 2021) and **Arma Reforger** (the roadmap page is
three images with a "last updated" date — trackable, but not for a text-only pilot). Star Citizen
is excluded by the kill criteria: the publisher already versions its own roadmap.

## Metrics (fill in per game as the backfill is verified)

| Metric | Go threshold | Lost Ark | Sea of Thieves | Hunt: Showdown 1896 |
|---|---|---|---|---|
| Hours per game-year (human + Claude wall-clock) | ≤ 4 | ~1.5 h Claude wall-clock for 21 months (unverified); human hours: **not yet spent** | ~1 h Claude (14 months) | ~0.5 h Claude (10 months) |
| Items whose delivery can be pinned to a patch note | ≥ 80% | see `/roadmaps/lost-ark` — computed live | see `/roadmaps/sea-of-thieves` | see `/roadmaps/hunt-showdown-1896` |
| Items whose promised window is unambiguous under the rubric | ≥ 70% | high — month headings | high — exact dates in monthly posts; Community Direct items are looser | low — most windows are the bare year "2026" |
| Wayback coverage gaps > 90 days in the 24-month period | ≤ 1 | 0 | 0 | 0 |

Go: all four thresholds met on at least four of the five games.
No-go: anything else — park, keep the weekly capture running, re-screen in three months.

## What the seed already shows (draft, unverified)

- Lost Ark's month-by-month roadmap format is close to ideal: every item has a month, every
  month has a release-notes article, and the Amazon Game Studios team posts a "Team Update" when a
  plan changes, which is exactly what `window_history` needs.
- Sea of Thieves' monthly schedule posts are edited in place when a date moves (e.g. the
  13 February 2026 note moving Season 18 Act 3 from 19 February to 5 March). Each edit is a slip
  with a publisher-stated reason.
- Hunt: Showdown's roadmap uses year-long windows, so the on-time rate is less informative; the
  value is in the delivery matching (what actually arrived from the list).
- On 12 August 2026 Amazon Game Studios announced it will end its live-service operation of
  Lost Ark in the West in early 2027, with Smilegate taking over. Items promised for September 2026
  are still tracked; the transition is the kind of event the `CANCELLED` override exists for, if a
  publisher statement ever says an item will not ship.

## Human tasks before go/no-go

1. Verify every row on the three seeded games against its archived source (set `verified_by`).
   Record the hours.
2. Choose games 4 and 5 and run `npm run backfill` for 24 months each.
3. Fill in the table above and record the verdict here with the date.
