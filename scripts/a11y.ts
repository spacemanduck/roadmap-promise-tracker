/**
 * a11y.ts — axe-core check of the built site at 375px and desktop widths.
 *
 * Starts `next start` on a free port, visits every route in the sitemap-ish list below, runs
 * axe, and fails on any serious/critical violation. Run after `npm run build`.
 *
 * Usage: npm run build && npm run a11y
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { getGames } from "../lib/data";

const PORT = 3123;

async function waitFor(url: string, ms = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not start at ${url}`);
}

async function main() {
  const games = getGames();
  const routes = [
    "/",
    "/roadmaps",
    "/roadmaps/methodology",
    "/roadmaps/request",
    "/corrections",
    "/about",
    "/privacy",
    ...games.map((g) => `/roadmaps/${g.source.game_id}`),
    ...games.flatMap((g) => g.items.slice(0, 2).map((v) => `/roadmaps/${g.source.game_id}/${v.item.id}`)),
  ];
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore" });
  try {
    await waitFor(`http://localhost:${PORT}/`);
    const browser = await chromium.launch();
    let failures = 0;
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      for (const route of routes) {
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle" });
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        const status = serious.length === 0 && !hasHorizontalScroll ? "ok" : "FAIL";
        console.log(`${status} ${width}px ${route} — ${results.violations.length} violation(s), ${serious.length} serious${hasHorizontalScroll ? ", page scrolls horizontally" : ""}`);
        for (const v of serious) console.log(`   ${v.id}: ${v.help} (${v.nodes.length} node(s)) ${v.nodes[0]?.target.join(" ")}`);
        if (status === "FAIL") failures++;
      }
      await context.close();
    }
    await browser.close();
    if (failures) {
      console.error(`a11y: ${failures} page(s) failed`);
      process.exitCode = 1;
    } else {
      console.log("a11y: all pages clean at 375px and 1280px");
    }
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
