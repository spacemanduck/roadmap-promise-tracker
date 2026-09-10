import type { Metadata } from "next";
import Link from "next/link";
import { getGames } from "@/lib/data";
import { REQUEST_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request a game",
  description: "Which games are tracked and why, what a game needs before it can be tracked, and how to suggest one.",
};

export default function RequestPage() {
  const games = getGames();
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Request a game</h1>
        <p className="max-w-2xl leading-relaxed text-muted">
          The tracker only works for games whose publisher puts dated promises on a public page and then publishes patch notes on
          its own site. Without both there is nothing to extract and nothing to pin a delivery to.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Games tracked, and why</h2>
        <ul className="space-y-3">
          {games.map((g) => (
            <li key={g.source.game_id} className="rounded border border-border bg-surface p-4">
              <Link href={`/roadmaps/${g.source.game_id}`} className="font-medium hover:underline">
                {g.source.game_name}
              </Link>
              <span className="text-sm text-muted"> · {g.source.publisher_name}</span>
              <p className="mt-1 text-sm">{g.source.why_tracked ?? "Publishes dated roadmap posts and patch notes on its own site."}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What a game needs</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>A roadmap published as a web page or post on the publisher&apos;s own site, not only inside the game client.</li>
          <li>Patch notes or release notes on the publisher&apos;s own site, with dates.</li>
          <li>Enough archive coverage to backfill at least 24 months, with no gap longer than 90 days.</li>
          <li>Roadmap items with stated windows. A roadmap of &ldquo;coming soon&rdquo; is tracked, but it never produces a rate.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How to suggest one</h2>
        <p className="text-sm">
          Open a request with the subject line <code className="font-mono text-xs">Game request: &lt;game name&gt;</code> and include the
          roadmap URL and the patch-notes URL. Requests are public so that anyone can see what has been asked for and why it was or
          was not added. Games are added in the order they clear the four requirements above, up to a hard cap on the number
          tracked, because every game costs review time each week.
        </p>
        <p>
          <a href={REQUEST_URL} className="inline-block rounded bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">
            Open a game request
          </a>
        </p>
      </section>
    </div>
  );
}
