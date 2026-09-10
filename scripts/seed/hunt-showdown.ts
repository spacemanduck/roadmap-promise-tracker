/**
 * Hunt: Showdown 1896 (Crytek) — seed spec.
 *
 * Roadmap style: one annual text post ("Roadmap 2026: Looking Back & Into the Future", 7 Nov 2025).
 * Most windows are the bare year, so the rubric reads them as 1 Jan – 31 Dec 2026. Only items the
 * post states will arrive are extracted; things it says it is "exploring" are not promises.
 */
import type { SeedGame } from "./build";

const N = "https://www.huntshowdown.com/news";
const wb = (ts: string, url: string) => `https://web.archive.org/web/${ts}/${url}`;

const src = {
  flameRifle: { url: `${N}/introducing-flame-rifle`, archived_url: wb("20260204105525", `${N}/introducing-flame-rifle`), title: "Introducing Flame Rifle", published_at: "2026-01-07", kind: "publisher_post" as const },
  inferno: { url: `${N}/inferno-is-live-now`, archived_url: wb("20260720004422", `${N}/inferno-is-live-now`), title: "Inferno is Live Now", published_at: "2026-04-15", kind: "publisher_post" as const },
  shredder: { url: `${N}/developer-insight-the-making-of-the-shredder`, archived_url: wb("20260401143217", `${N}/developer-insight-the-making-of-the-shredder`), title: "Developer Insight: The Making of the Shredder", published_at: "2025-12-16", kind: "publisher_post" as const },
  lunar: { url: `${N}/lunar-new-year-story-challenge-end-of-event-changes`, archived_url: wb("20260401143217", `${N}/lunar-new-year-story-challenge-end-of-event-changes`), title: "Lunar New Year Story Challenge & end of event changes!", published_at: "2026-02-09", kind: "publisher_post" as const },
  moreHunters: { url: `${N}/more-hunters-per-match-being-tested`, archived_url: wb("20260329010153", `${N}/more-hunters-per-match-being-tested`), title: "More Hunters Per Match Being Tested", published_at: "2026-02-03", kind: "publisher_post" as const },
  devilsTrail: { url: `${N}/devil-s-trail-live-now`, archived_url: wb("20260604064047", `${N}/devil-s-trail-live-now`), title: "Devil's Trail – Live Now", published_at: "2026-03-18", kind: "publisher_post" as const },
  legacy: { url: `${N}/introducing-legacy-chronicle`, archived_url: wb("20260805144020", `${N}/introducing-legacy-chronicle`), title: "Introducing Legacy Chronicle", published_at: "2026-05-07", kind: "publisher_post" as const },
};

const roadmapUrl = `${N}/roadmap-2026-looking-back-into-the-future-of-hunt-showdown-1896`;

const game: SeedGame = {
  source: {
    game_id: "hunt-showdown-1896",
    game_name: "Hunt: Showdown 1896",
    publisher_id: "crytek",
    publisher_name: "Crytek",
    roadmap_style: "periodic_posts",
    roadmap_urls: [{ url: roadmapUrl, kind: "post", selector: "main" }],
    patch_note_urls: [
      { url: "https://www.huntshowdown.com/releasenotes", kind: "index", selector: "a[href*='/releasenotes/']", title_pattern: "update|patch|hotfix|chapter" },
      { url: "https://www.huntshowdown.com/news", kind: "index", selector: "a[href*='/news/']", title_pattern: "live now|is live|update|go live|introducing" },
    ],
    capture_notes:
      "The 2026 roadmap is prose under headings (Fair Foundations, Your Hunter's Legacy, Evolving Hunt, Seasons Events and Experimentation, Technology & The Core Experience). Items are the deliverables the post says will arrive; 'we are exploring' statements (for example combining Consumable and Tool slots) are not extracted. Windows are the bare year unless the post gives more ('very soon', '2026 Lunar New Year'). Deliveries cite dated news posts on huntshowdown.com because the release-notes section does not list every update.",
    extraction_model: "claude-haiku-4-5",
    tracked_since: "2025-11-08",
    why_tracked:
      "Publishes an annual text roadmap and dated update posts on its own site. Year-long windows make the on-time rate blunt; the useful record is which listed items arrived.",
  },
  snapshots: [
    {
      id: "hunt-showdown-1896-2025-11-08-1",
      url: roadmapUrl,
      archived_url: wb("20251108194252", roadmapUrl),
      captured: "20251108194252",
      published_at: "2025-11-07",
      covers: { start: "2026-01-01", end: "2026-12-31" },
      confidence: 0.8,
      items: [
        { title: "A new, experimental firearm that harnesses a primal and destructive force", window: "2026", key: "new-experimental-firearm" },
        { title: "Return of the Wildcard Condition, Inferno", window: "2026", key: "inferno-return" },
        { title: "Tier 3 Hunters returning in phases", window: "2026", key: "tier-3-hunters-return" },
        { title: "Legends Return initiative continues, bringing back early legacy content with fresh twists", window: "2026", key: "legends-return-continues" },
        { title: "Bileweavers return to the bayou", window: "2026", key: "bileweavers-return" },
        { title: "Tarot Cards become a permanent feature", window: "2026", key: "tarot-cards-permanent" },
        { title: "The Shredder brought back in limited form after being rebalanced", window: "2026", key: "shredder-return" },
        { title: "2026 Lunar New Year multi-layered Event with new, storied activities", window: "2026 Lunar New Year", key: "lunar-new-year-2026-event" },
        { title: "A true Seasonal Model", window: "2026", key: "seasonal-model" },
        { title: "Experiments with new gameplay ideas in limited, experimental game modes", window: "2026", key: "experimental-game-modes" },
        { title: "Support more players in a single Mission", window: "2026", key: "more-players-per-mission" },
        { title: "An upcoming technical test (more players in a single Mission)", window: "very soon", key: "more-players-technical-test" },
        { title: "New social features to help you connect and play with friends", window: "2026", key: "social-features" },
        { title: "New tutorial challenges and scalable bot difficulty", window: "2026", key: "tutorial-challenges-and-bot-difficulty" },
        { title: "A series of matchmaking tests and new experimental features, with improvements to regional servers", window: "throughout 2026", key: "matchmaking-tests-and-regional-servers" },
      ],
    },
  ],
  deliveries: [
    { key: "new-experimental-firearm", date: "2026-01-07", source: src.flameRifle, note: "The Flame Rifle, a new Scarce Weapon released with the Murder Circus Encore event." },
    { key: "inferno-return", date: "2026-04-15", source: src.inferno },
    { key: "bileweavers-return", date: "2026-01-07", source: src.flameRifle, note: "The post has a 'Bileweavers Return' section." },
    { key: "shredder-return", date: "2025-12-16", source: src.shredder, note: "The post says the Shredder was brought back with Post Malone's Murder Circus Encore 'with some changes'; the post is dated 16 December 2025 and the return preceded the 2026 window." },
    { key: "lunar-new-year-2026-event", date: "2026-02-10", source: src.lunar, note: "The 'Game of Skill' Story Challenge released on 10 February 2026." },
    { key: "more-players-technical-test", date: "2026-02-03", source: src.moreHunters, note: "The post says the feature 'is about to enter its testing phase' on live servers." },
    { key: "social-features", date: "2026-03-18", source: src.devilsTrail, note: "Lobby Codes: invite players directly to your team across PC and console. Whether this is all of the promised 'new social features' is a judgement for the reviewer." },
    { key: "legends-return-continues", date: "2026-05-13", source: src.legacy, note: "Legacy Chronicles, 'the return of some of our most requested legends', from 13 May 2026." },
  ],
  titles: {
    "new-experimental-firearm": "New experimental firearm (primal, destructive force)",
    "inferno-return": "Inferno Wildcard Condition returns",
    "tier-3-hunters-return": "Tier 3 Hunters return in phases",
    "legends-return-continues": "Legends Return initiative continues",
    "bileweavers-return": "Bileweavers return",
    "tarot-cards-permanent": "Tarot Cards become permanent",
    "shredder-return": "Shredder returns, rebalanced",
    "lunar-new-year-2026-event": "2026 Lunar New Year multi-layered Event",
    "seasonal-model": "True Seasonal Model",
    "experimental-game-modes": "Limited experimental game modes",
    "more-players-per-mission": "More players in a single Mission",
    "more-players-technical-test": "Technical test: more players in a single Mission",
    "social-features": "New social features",
    "tutorial-challenges-and-bot-difficulty": "New tutorial challenges and scalable bot difficulty",
    "matchmaking-tests-and-regional-servers": "Matchmaking tests and regional server improvements",
  },
  notes: {
    "tarot-cards-permanent": "Tarot Cards appear in the Devil's Trail (18 March 2026), Inferno (15 April) and Road to Hell (9 June) posts as event content. No post read states that they are now permanent, so no delivery is recorded.",
    "more-players-per-mission": "A live test began on 3 February 2026 (see the technical-test row). No post read states that the higher player count became permanent.",
    "tutorial-challenges-and-bot-difficulty": "Update 2.8 (9 June 2026) lists 'Shooting range and tutorial updates' and Hunter Bot behaviour changes under New Player Onboarding; it does not name new tutorial challenges or scalable bot difficulty, so no delivery is recorded.",
    "matchmaking-tests-and-regional-servers": "The Fair Play Task Force roadmap update (3 June 2026) describes ping-based matchmaking work in progress. Tracked, but 'throughout 2026' is read as the year and there is no single delivery to record.",
    "lunar-new-year-2026-event": "'2026 Lunar New Year' is an event name, not a date, so the rubric records no window; the delivery is shown without an on-time judgement.",
  },
};

export default game;
