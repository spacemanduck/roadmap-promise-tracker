## What is recorded

For each tracked game, every item a publisher put on a public roadmap: what was promised, for when, whether it arrived, when, and how the window moved between roadmap versions. Every fact cites the publisher's own page (archived) or patch notes.

Nothing here is opinion. Where a judgement is unavoidable it is labelled as one and carries a written rationale.

## Sources

**Data sources** (the only things a record may cite):

- the publisher's roadmap page or post, as archived at the time of capture
- the publisher's patch notes or release notes
- an official blog or official social post reached through the publisher's own site or an archive
- press reporting a publisher statement (used only for `CANCELLED`)

**Discovery sources** (may tell us where to look, never cited): Reddit, X, YouTube commentary, wikis, and the memory of any language model.

Roadmap graphics are never republished. The pipeline downloads an image to a temporary directory, extracts the text, and discards the file. Only extracted text, hashes and the archive link are stored.

## Records

**Snapshot.** One capture of one roadmap document: the URL, the archive link, the extracted items exactly as written (`title_as_stated`, `window_as_stated`), a hash of that extraction, the extraction model and its confidence.

**Item.** One promised deliverable across all snapshots: first seen, last seen, the full `window_history` (one entry each time the stated window changed), the delivery (date + the patch note that names it), and any human override.

Two roadmap styles are handled:

- **Living page** — one URL the publisher edits in place. Every capture is a version of the same document.
- **Periodic posts** — each roadmap is a new dated post covering a stated period (for example "July to September"). A later post can only be said to *omit* an item if that post covers the item's window.

## Window normalisation (mechanical)

| Stated as | Normalised to |
|---|---|
| Exact date | that date |
| Month | first–last day of the month |
| Month with no year (e.g. "February" in a post published in December) | that month in the year implied by the publication date: a month earlier than the publication month is read as next year |
| "Early / mid / late [month]" | the whole month (publisher's favour); the reading is recorded |
| Quarter (Q1–Q4) | calendar quarters, unless the publisher defines a fiscal year on the page, in which case that; the rule is noted |
| Half year ("H1", "first half of") | Jan–Jun / Jul–Dec |
| Season ("Summer 2026") | Northern-hemisphere meteorological season (spring Mar–May, summer Jun–Aug, autumn Sep–Nov, winter Dec–Feb); noted as a convention. "Winter YYYY" is read as Dec YYYY–Feb YYYY+1 (later end date) |
| "Early / mid / late [year]" | Jan–Apr / May–Aug / Sep–Dec |
| Bare year ("2026") | 1 Jan – 31 Dec |
| "Later this year", "by the end of the year" | publication date – 31 Dec of that year |
| Month ranges ("between March and April 2022") | first day of the first month – last day of the last |
| "Coming soon", "TBA", "very soon", "later" | `null` — the item is tracked but never coded late |
| "Season 4", "Update 2.6" or other in-game cycle names | resolved to dates only if the publisher has published that cycle's dates; otherwise `null` |

**Tie-break.** When a stated window admits two readings, the later end date is used and the reading is recorded on the item (`reading_note`). Publishers get the benefit of the doubt every time.

## Status codes (computed at build time, never stored)

| Code | Rule |
|---|---|
| `ON_TIME` | delivery date ≤ current window end |
| `LATE` | delivery date > current window end; `late by N days` is shown |
| `PENDING` | no delivery; window end in the future or `null` |
| `OVERDUE` | no delivery; window end in the past; item still present in the latest relevant snapshot (or fewer than two later snapshots exist) |
| `DROPPED` | no delivery; item absent from the two most recent relevant snapshots; no publisher statement found |
| `CANCELLED` | publisher stated the item will not ship (human override, with the statement as source) |
| `SCOPE_CHANGED` | delivered, but a human judges the delivered thing materially different from the promise; always paired with `ON_TIME`/`LATE` on the delivery date and always carries a written rationale |

"Relevant snapshot" means, for a living page, any capture of that page; for periodic posts, a later post whose stated coverage includes the item's window.

**"Slipped" is not a status.** A slip is counted each time the normalised window end moved later between consecutive roadmap versions (or a dated window became "TBA"). A narrowing — "Q4" becoming "November" — is recorded in the window history but is not a slip. Slips are shown separately from status: an item can be `ON_TIME` on its current window and have slipped twice — the site says both.

## Delivery matching

A delivery is the date the patch note (or publisher post) says the item went live; if the note gives no go-live date, the note's own date is used. Only the publisher's own patch notes and posts count. Announcements of future content are not deliveries. Automated matches are labelled `matched by script` until a human has checked them; the matched sentence is shown to the reviewer in the pull request and is not stored.

## On-time rate

`on-time ÷ (on-time + late)` over items that have a normalised window **and** a delivery. Items with no stated window, pending, overdue, dropped and cancelled items are excluded from the denominator and are always shown alongside it. The denominator is never hidden.

## Verification

Every record shows whether a human has verified it. Unverified records are drafts: automation proposed them and a person has not yet checked them against the archived source. Draft data is published so the receipts can be inspected, but it should be read as such.

## Corrections

If a row is wrong, the archived source will show why. Open a correction with the item URL and the source you believe contradicts it; the rubric above is applied to the source, not to the complaint.
