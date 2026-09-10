import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { getGame, getGames, today } from "@/lib/data";
import { fmtDate, fmtWindow, pct, slipSentence } from "@/lib/format";

export function generateStaticParams() {
  return getGames().map((g) => ({ game: g.source.game_id }));
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params;
  const g = getGame(game);
  if (!g) return {};
  return {
    title: `${g.source.game_name} roadmap record`,
    description: `${g.source.game_name}: ${g.stats.on_time} of ${g.stats.denominator} dated, delivered roadmap items on time; ${g.stats.pending} pending, ${g.stats.overdue} overdue. Every row cites the archived roadmap and the patch note.`,
  };
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = getGame(game);
  if (!g) notFound();
  const t = today();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/roadmaps" className="hover:underline">
          Games
        </Link>{" "}
        / {g.source.game_name}
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{g.source.game_name}</h1>
        <p className="text-muted">
          Published by {g.source.publisher_name}. Roadmaps tracked from {fmtDate(g.first_capture)}; last capture {fmtDate(g.last_capture)}.
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded border border-border bg-surface p-3">
            <dt className="text-muted">On-time rate</dt>
            <dd className="text-xl font-semibold">{pct(g.stats.on_time_rate)}</dd>
            <dd className="text-xs text-muted">
              {g.stats.on_time} of {g.stats.denominator} dated, delivered items
            </dd>
          </div>
          <div className="rounded border border-border bg-surface p-3">
            <dt className="text-muted">Items</dt>
            <dd className="text-xl font-semibold">{g.stats.total}</dd>
            <dd className="text-xs text-muted">{g.stats.without_window} with no stated window</dd>
          </div>
          <div className="rounded border border-border bg-surface p-3">
            <dt className="text-muted">Pending / overdue</dt>
            <dd className="text-xl font-semibold">
              {g.stats.pending} / {g.stats.overdue}
            </dd>
            <dd className="text-xs text-muted">
              {g.stats.dropped} dropped, {g.stats.cancelled} cancelled
            </dd>
          </div>
          <div className="rounded border border-border bg-surface p-3">
            <dt className="text-muted">Late / scope changed</dt>
            <dd className="text-xl font-semibold">
              {g.stats.late} / {g.stats.scope_changed}
            </dd>
            <dd className="text-xs text-muted">
              {g.stats.verified} of {g.stats.total} rows verified by a person
            </dd>
          </div>
        </dl>
        {g.stats.verified < g.stats.total && (
          <p className="rounded border border-amber-600/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            {g.stats.total - g.stats.verified} of {g.stats.total} rows are unverified drafts: automation extracted them from the archived
            sources and a person has not yet checked every one. Each row links to its sources so you can check it yourself.
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Promised versus actual</h2>
        <Timeline items={g.items} today={t} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Items</h2>
        <div className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Item
                </th>
                <th scope="col" className="px-3 py-2">
                  Promised
                </th>
                <th scope="col" className="px-3 py-2">
                  Delivered
                </th>
                <th scope="col" className="px-3 py-2">
                  Status
                </th>
                <th scope="col" className="px-3 py-2">
                  Slipped
                </th>
              </tr>
            </thead>
            <tbody>
              {g.items.map(({ item, status }) => {
                const cur = item.window_history[item.window_history.length - 1];
                return (
                  <tr key={item.id} className="border-t border-border align-top">
                    <th scope="row" className="px-3 py-2 font-medium">
                      <Link href={`/roadmaps/${g.source.game_id}/${item.id}`} className="hover:underline">
                        {item.title_normalised}
                      </Link>
                      {!item.verified_by && <span className="ml-2 text-xs font-normal text-muted">(draft)</span>}
                    </th>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs">{cur.window_as_stated}</span>
                      <div className="text-xs text-muted">{fmtWindow(cur.window_normalised)}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.delivery ? fmtDate(item.delivery.date) : "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-3 py-2">{slipSentence(status.slipped)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Archived roadmap versions</h2>
        <p className="text-sm text-muted">
          Each capture links to the archived page that was extracted. Only extracted text is stored here; no publisher graphics are reproduced.
        </p>
        <ul className="divide-y divide-border rounded border border-border bg-surface text-sm">
          {g.snapshots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
              <span className="whitespace-nowrap font-mono text-xs text-muted">{fmtDate(s.captured_at.slice(0, 10))}</span>
              <a href={s.archived_url} className="underline" rel="noopener">
                archived version
              </a>
              <a href={s.url} className="text-muted hover:underline" rel="noopener">
                live URL
              </a>
              <span className="text-muted">
                {s.items_extracted.length} items · {s.captured_by} · confidence {s.extraction_confidence.toFixed(2)}
                {s.covers ? ` · covers ${fmtDate(s.covers.start)} – ${fmtDate(s.covers.end)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {g.source.capture_notes && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Capture notes</h2>
          <p className="text-sm text-muted whitespace-pre-line">{g.source.capture_notes}</p>
        </section>
      )}
    </div>
  );
}
