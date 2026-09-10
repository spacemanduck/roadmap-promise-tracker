import Link from "next/link";
import { getGames } from "@/lib/data";
import { pct } from "@/lib/format";

export default function Home() {
  const games = getGames();
  const items = games.reduce((n, g) => n + g.stats.total, 0);
  const snapshots = games.reduce((n, g) => n + g.snapshots.length, 0);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">What was promised, and what arrived.</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          A record of every item a live-service publisher put on a public roadmap: what was promised, for when, whether it
          arrived, when, and how the window moved between roadmap versions. Every fact cites the publisher&apos;s own archived
          page or patch notes.
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-muted">Games tracked</dt>
            <dd className="text-2xl font-semibold">{games.length}</dd>
          </div>
          <div>
            <dt className="text-muted">Roadmap items</dt>
            <dd className="text-2xl font-semibold">{items}</dd>
          </div>
          <div>
            <dt className="text-muted">Archived roadmap versions</dt>
            <dd className="text-2xl font-semibold">{snapshots}</dd>
          </div>
        </dl>
        <p>
          <Link href="/roadmaps" className="inline-block rounded bg-foreground px-4 py-2 text-background hover:opacity-90">
            See the games
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tracked games</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <li key={g.source.game_id} className="rounded border border-border bg-surface p-4">
              <Link href={`/roadmaps/${g.source.game_id}`} className="font-medium hover:underline">
                {g.source.game_name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {g.source.publisher_name} · on-time rate {pct(g.stats.on_time_rate)} ({g.stats.on_time} of {g.stats.denominator}{" "}
                dated, delivered items)
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-base font-semibold text-foreground">How to read it</h2>
        <p>
          Windows are normalised by a published, mechanical rubric that reads ambiguity in the publisher&apos;s favour. Status is
          computed from dates, not written by anyone. The only judgement call, <em>scope changed</em>, always carries a written
          rationale.{" "}
          <Link href="/roadmaps/methodology" className="underline">
            Read the methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
