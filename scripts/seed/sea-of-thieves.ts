/**
 * Sea of Thieves (Rare / Microsoft) — seed spec.
 *
 * Roadmap style: periodic posts. Two kinds of document are captured: the six-monthly
 * "Community Direct" summary (strategic items, looser windows) and the monthly "This Month in
 * Sea of Thieves" schedule (Season/Act launches with exact dates). Only game-content items are
 * extracted from the monthly posts — Season and Act launches, headline features, Community
 * Weekends — not soundtrack releases, sales or Twitch Drops.
 *
 * Deliveries cite the versioned release notes for the update that shipped the item; the release
 * notes carry no date in their body, so `published_at` is the launch date stated by the publisher
 * in the monthly schedule.
 */
import type { SeedGame } from "./build";

const NEWS = "https://www.seaofthieves.com/news";
const RN = "https://www.seaofthieves.com/release-notes";
const wb = (ts: string, url: string) => `https://web.archive.org/web/${ts}/${url}`;

const rn = (v: string, ts: string, title: string, date: string) => ({
  url: `${RN}/${v}`,
  archived_url: wb(ts, `${RN}/${v}`),
  title: `Release Notes ${v} — ${title}`,
  published_at: date,
  kind: "patch_note" as const,
});
const tm = (slug: string, ts: string, title: string, date: string) => ({
  url: `${NEWS}/${slug}`,
  archived_url: wb(ts, `${NEWS}/${slug}`),
  title,
  published_at: date,
  kind: "publisher_post" as const,
});

const src = {
  r350: rn("3.5.0", "20260419185602", "Smugglers' Tide", "2025-08-14"),
  r351: rn("3.5.1", "20260611034932", "Smugglers' Tide: Act 2", "2025-09-18"),
  r352: rn("3.5.2", "20260613155055", "Smugglers' Tide: Act 3", "2025-10-16"),
  r353: rn("3.5.3", "20260419185602", "Gameplay Improvements", "2025-11-13"),
  r360: rn("3.6.0", "20260511084409", "Secrets of the Banished", "2025-12-11"),
  r361: rn("3.6.1", "20260408183321", "Secrets of the Banished: Act 2", "2026-01-22"),
  r362: rn("3.6.2", "20260408183321", "Secrets of the Banished: Act 3", "2026-03-05"),
  r370: rn("3.7.0", "20260624143923", "Improved Faction Battles", "2026-03-19"),
  r371: rn("3.7.1", "20260511215109", "Bilge Rats Weekender", "2026-04-16"),
  r372: rn("3.7.2", "20260525", "Season 19: Act 3", "2026-05-21"),
  r380: rn("3.8.0", "20260721165731", "Custom Seas", "2026-06-18"),
  tmAug25: tm("this-month-august2025", "20251001024027", "This Month in Sea of Thieves: August 2025", "2025-08-04"),
  tmJan26: tm("this-month-january2026", "20260511084406", "This Month in Sea of Thieves: January 2026", "2026-01-06"),
  tmMar26: tm("this-month-march2026", "20260604031144", "This Month in Sea of Thieves: March 2026", "2026-03-06"),
  tmJun26: tm("this-month-june-2026", "20260618185445", "This Month in Sea of Thieves: June 2026", "2026-06-05"),
};

const monthly = (id: string, slug: string, ts: string, published_at: string, covers: { start: string; end: string }, items: SeedGame["snapshots"][number]["items"]) => ({
  id,
  url: `${NEWS}/${slug}`,
  archived_url: wb(ts, `${NEWS}/${slug}`),
  captured: ts,
  published_at,
  covers,
  confidence: 0.9,
  items,
});

const game: SeedGame = {
  source: {
    game_id: "sea-of-thieves",
    game_name: "Sea of Thieves",
    publisher_id: "rare",
    publisher_name: "Rare (Microsoft)",
    roadmap_style: "periodic_posts",
    roadmap_urls: [
      { url: `${NEWS}`, kind: "post", selector: "main", note: "Two document kinds: 'Community Direct' summaries (about every six months) and 'This Month in Sea of Thieves' schedules (monthly). The weekly capture reads the newest of each linked from the news index." },
    ],
    patch_note_urls: [{ url: RN, kind: "index", selector: "a[href*='/release-notes/']", title_pattern: "." }],
    capture_notes:
      "Monthly schedule posts state exact dates ('Thursday, March 5th') and are edited in place when a date moves, with an 'Update <date>:' note at the top; where the pre-edit version is not archived the slip is recorded in the item notes rather than the window history. Community Direct items use looser windows ('early 2026', 'later this year'). Only game-content items are extracted from monthly posts. Release-notes pages carry no date in the body; the delivery date is the launch date the publisher stated in the monthly schedule.",
    extraction_model: "claude-haiku-4-5",
    tracked_since: "2025-07-10",
    why_tracked:
      "Publishes a six-monthly Community Direct with forward promises and a monthly schedule with exact dates, and versioned release notes on its own site. Dates that move are edited into the schedule post with a note, which makes slips visible.",
  },
  snapshots: [
    {
      id: "sea-of-thieves-2025-07-10-1",
      url: `${NEWS}/community-direct-july-2025`,
      archived_url: wb("20250710155204", `${NEWS}/community-direct-july-2025`),
      captured: "20250710155204",
      published_at: "2025-07-10",
      covers: { start: "2025-07-10", end: "2026-01-10" },
      confidence: 0.85,
      items: [
        { title: "Relaunching the Insider Programme", window: "2026", key: "insider-programme-relaunch" },
        { title: "Season 17: The Smugglers' League — Smugglers' Hideouts, new loot types and Smugglers' Runs", window: "August", key: "season-17-launch" },
        { title: "Season 17 Month 2: a headline live Event in the form of a heist", window: "Month 2 of Season 17", key: "season-17-heist-event" },
        { title: "Season 17 Month 3: refreshes the Skeleton Fort experience", window: "Month 3 of Season 17", key: "season-17-skeleton-fort-refresh" },
        { title: "Season 17's Community Weekend", window: "early in August", key: "season-17-community-weekend" },
        { title: "Season 18: The Devil's Roar, new Ancient Shrines and expanded Smugglers' League gameplay", window: "no stated window", key: "season-18-launch" },
        { title: "Custom Servers, as part of a new subscription model", window: "early 2026", key: "custom-servers" },
      ],
    },
    monthly("sea-of-thieves-2025-10-01-1", "this-month-august2025", "20251001024027", "2025-08-04", { start: "2025-08-01", end: "2025-08-31" }, [
      { title: "Season 17 Launch", window: "Thursday, August 14th", key: "season-17-launch" },
      { title: "Season 17 Community Weekend", window: "Saturday, August 30th", key: "season-17-community-weekend" },
    ]),
    monthly("sea-of-thieves-2025-12-03-1", "this-month-september2025", "20251203061146", "2025-09-04", { start: "2025-09-01", end: "2025-09-30" }, [
      { title: "Sea of Thieves Season 17: Act 2", window: "Thursday, September 18th", key: "season-17-act-2" },
    ]),
    monthly("sea-of-thieves-2026-01-16-1", "this-month-october2025", "20260116040407", "2025-10-03", { start: "2025-10-01", end: "2025-10-31" }, [
      { title: "Sea of Thieves Season 17: Act 3 (Reaper Fortresses)", window: "Thursday, October 16th", key: "season-17-act-3" },
    ]),
    monthly("sea-of-thieves-2026-01-26-1", "this-month-november2025", "20260126035631", "2025-11-07", { start: "2025-11-01", end: "2025-11-30" }, [
      { title: "November update: weapon switching changes and Immerse spatial audio", window: "Thursday, November 13th", key: "november-2025-update" },
      { title: "Season 18", window: "December", key: "season-18-launch" },
    ]),
    monthly("sea-of-thieves-2026-03-19-1", "this-month-december2025", "20260319150027", "2025-12-04", { start: "2025-12-01", end: "2025-12-31" }, [
      { title: "Season 18 Launch", window: "Thursday, December 11th", key: "season-18-launch" },
    ]),
    monthly("sea-of-thieves-2026-05-11-1", "this-month-january2026", "20260511084406", "2026-01-06", { start: "2026-01-01", end: "2026-01-31" }, [
      { title: "Sea of Thieves Season 18: Act 2 (Molten Sands Fortress)", window: "Thursday, January 22nd", key: "season-18-act-2" },
      { title: "Season 18 Community Weekend", window: "Saturday, January 31st", key: "season-18-community-weekend" },
    ]),
    monthly("sea-of-thieves-2026-05-11-2", "this-month-february2026", "20260511084406", "2026-02-05", { start: "2026-02-01", end: "2026-02-28" }, [
      { title: "Sea of Thieves Season 18: Act 3 (Ashen Garrisons)", window: "Thursday, March 5th", key: "season-18-act-3" },
    ]),
    monthly("sea-of-thieves-2026-06-04-1", "this-month-march2026", "20260604031144", "2026-03-06", { start: "2026-03-01", end: "2026-03-31" }, [
      { title: "Sea of Thieves Season 19: Act 1", window: "Thursday, March 19th", key: "season-19-act-1" },
      { title: "Season 19 Community Weekend", window: "Friday, March 27th", key: "season-19-community-weekend" },
    ]),
    {
      id: "sea-of-thieves-2026-04-03-1",
      url: `${NEWS}/community-direct-march2026`,
      archived_url: wb("20260403022842", `${NEWS}/community-direct-march2026`),
      captured: "20260403022842",
      published_at: "2026-03-30",
      covers: { start: "2026-03-30", end: "2026-09-30" },
      confidence: 0.85,
      items: [
        { title: "Pirate Emporium stock rotation", window: "April", key: "emporium-stock-rotation" },
        { title: "Season 20: Custom Seas, free to play for every Sea of Thieves player", window: "later this year", key: "custom-servers" },
        { title: "Season Pass restructured to 50 levels with a star prize", window: "no stated window", key: "season-pass-50-levels" },
      ],
    },
    monthly("sea-of-thieves-2026-06-16-1", "this-month-april2026", "20260616040639", "2026-04-08", { start: "2026-04-01", end: "2026-04-30" }, [
      { title: "Sea of Thieves Season 19: Act 2", window: "Thursday, April 16th", key: "season-19-act-2" },
    ]),
    monthly("sea-of-thieves-2026-05-10-1", "this-month-may-2026", "20260510135331", "2026-05-07", { start: "2026-05-01", end: "2026-05-31" }, [
      { title: "Sea of Thieves Season 19: Act 3", window: "Thursday, May 14th", key: "season-19-act-3" },
    ]),
    monthly("sea-of-thieves-2026-07-05-1", "this-month-may2026", "20260705181250", "2026-05-07", { start: "2026-05-01", end: "2026-05-31" }, [
      { title: "Sea of Thieves Season 19: Act 3", window: "Thursday, May 21st", key: "season-19-act-3" },
    ]),
    monthly("sea-of-thieves-2026-06-18-1", "this-month-june-2026", "20260618185445", "2026-06-05", { start: "2026-06-01", end: "2026-06-30" }, [
      { title: "Sea of Thieves Season 20: Custom Seas", window: "Thursday, June 18th", key: "custom-servers" },
      { title: "Season 20 Community Weekend", window: "Friday, June 26th", key: "season-20-community-weekend" },
    ]),
  ],
  deliveries: [
    { key: "season-17-launch", date: "2025-08-14", source: src.r350, note: "Named as 'The Smugglers' League' with six Hideouts and the Smugglers' Route Run." },
    { key: "season-17-heist-event", date: "2025-09-18", source: src.r351, note: "Named as 'The Smugglers' Heist' for the duration of Act 2." },
    { key: "season-17-act-2", date: "2025-09-18", source: src.r351 },
    { key: "season-17-skeleton-fort-refresh", date: "2025-10-16", source: src.r352, note: "Shipped as 'Reaper Fortresses' (fortified Skeleton Forts)." },
    { key: "season-17-act-3", date: "2025-10-16", source: src.r352 },
    { key: "season-17-community-weekend", date: "2025-08-30", source: src.tmAug25, note: "Dated 30 August – 1 September in the publisher's August schedule." },
    { key: "november-2025-update", date: "2025-11-13", source: src.r353, note: "Named as 'Improved Weapon Switching'." },
    { key: "season-18-launch", date: "2025-12-11", source: src.r360, note: "Named as 'Secrets of the Banished' — the Eternal Guard and Sanctuaries of the Banished in The Devil's Roar." },
    { key: "season-18-act-2", date: "2026-01-22", source: src.r361 },
    { key: "season-18-community-weekend", date: "2026-01-31", source: src.tmJan26, note: "Dated 31 January – 2 February in the publisher's January schedule." },
    { key: "season-18-act-3", date: "2026-03-05", source: src.r362, note: "Named as 'Ashen Garrisons'." },
    { key: "season-19-act-1", date: "2026-03-19", source: src.r370 },
    { key: "season-19-community-weekend", date: "2026-03-27", source: src.tmMar26, note: "Dated 27–30 March in the publisher's March schedule." },
    { key: "season-19-act-2", date: "2026-04-16", source: src.r371 },
    { key: "season-19-act-3", date: "2026-05-21", source: src.r372 },
    { key: "custom-servers", date: "2026-06-18", source: src.r380, note: "Shipped as 'Custom Seas', free to all players; announced in July 2025 as a subscription feature for early 2026." },
    { key: "season-pass-50-levels", date: "2026-06-18", source: src.r380, note: "Named as '50 new Season Pass levels to climb'." },
    { key: "season-20-community-weekend", date: "2026-06-26", source: src.tmJun26, note: "Dated 26–29 June in the publisher's June schedule." },
  ],
  titles: {
    "custom-servers": "Custom Servers / Custom Seas",
    "season-17-launch": "Season 17 launch (The Smugglers' League)",
    "season-17-heist-event": "Season 17 headline event: the Smugglers' Heist",
    "season-17-skeleton-fort-refresh": "Season 17 Skeleton Fort refresh (Reaper Fortresses)",
    "season-18-launch": "Season 18 launch (The Devil's Roar)",
    "season-18-act-3": "Season 18: Act 3 (Ashen Garrisons)",
    "season-19-act-3": "Season 19: Act 3",
    "november-2025-update": "November 2025 update (weapon switching, spatial audio)",
    "emporium-stock-rotation": "Pirate Emporium stock rotation",
    "season-pass-50-levels": "Season Pass: 50 levels and a star prize",
    "insider-programme-relaunch": "Insider Programme relaunch",
  },
  notes: {
    "custom-servers":
      "Announced in the July 2025 Community Direct as a subscription feature for early 2026; the March 2026 Community Direct restated it as Custom Seas, free to all, 'later this year'; it shipped with Season 20 on 18 June 2026. Against the original early-2026 window (ending 30 April) the delivery was 49 days late; against the restated window it was on time. Whether free-instead-of-subscription is a scope change is a human judgement and no override has been set.",
    "season-18-launch":
      "The November 2025 schedule says Season 18 'will now be arriving in December' and links a 'Season 18 Delayed' developer update of 31 October 2025. The earlier stated window is not in any archived post read, so the slip is recorded here rather than in the window history.",
    "season-18-act-3":
      "The February 2026 schedule was edited on 13 February: 'Act 3 of Season 18 has been pushed back two weeks to launch on March 5th' from 19 February. The pre-edit version of the post is not archived, so only the revised date is in the window history.",
    "season-19-act-3":
      "The May 2026 schedule was edited on 12 May, moving Act 3 from 14 May to 21 May 'to give Last Ship Standing a little more development time'. Both versions are archived, so the slip is in the window history.",
    "emporium-stock-rotation":
      "The March 2026 Community Direct said Emporium stock rotation 'will be arriving in April'. The April release notes (3.7.1) read for this record describe new Black Market stock but do not name Emporium stock rotation, so no delivery is recorded. Needs a human check.",
    "season-17-heist-event": "'Month 2 of Season 17' is a cycle name, not a date, so the rubric records no window.",
    "season-17-skeleton-fort-refresh": "'Month 3 of Season 17' is a cycle name, not a date, so the rubric records no window.",
  },
};

export default game;
