import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { getGames, getItem, getSnapshot } from "@/lib/data";
import { fmtDate, fmtWindow, slipSentence, statusSentence } from "@/lib/format";
import { CORRECTION_URL } from "@/lib/site";

export function generateStaticParams() {
  return getGames().flatMap((g) => g.items.map((v) => ({ game: g.source.game_id, item: v.item.id })));
}

function shareText(v: NonNullable<ReturnType<typeof getItem>>): string {
  const cur = v.item.window_history[v.item.window_history.length - 1];
  const delivered = v.item.delivery ? `delivered ${fmtDate(v.item.delivery.date)}` : statusSentence(v.status).toLowerCase();
  return `${v.item.title_normalised} — promised ${cur.window_as_stated}, ${delivered}, ${slipSentence(v.status.slipped)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ game: string; item: string }> }): Promise<Metadata> {
  const { game, item } = await params;
  const v = getItem(game, item);
  if (!v) return {};
  const text = shareText(v);
  return {
    title: `${v.item.title_normalised} · ${v.source.game_name}`,
    description: text,
    openGraph: { title: `${v.item.title_normalised} · ${v.source.game_name}`, description: text, type: "article" },
    twitter: { card: "summary", title: `${v.item.title_normalised} · ${v.source.game_name}`, description: text },
  };
}

export default async function ItemPage({ params }: { params: Promise<{ game: string; item: string }> }) {
  const { game, item: itemId } = await params;
  const v = getItem(game, itemId);
  if (!v) notFound();
  const { item, status, source } = v;
  const cur = item.window_history[item.window_history.length - 1];

  return (
    <article className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/roadmaps" className="hover:underline">
          Games
        </Link>{" "}
        /{" "}
        <Link href={`/roadmaps/${source.game_id}`} className="hover:underline">
          {source.game_name}
        </Link>{" "}
        / {item.title_normalised}
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{item.title_normalised}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-sm text-muted">{slipSentence(status.slipped)}</span>
          <VerifiedBadge verified_by={item.verified_by} verified_at={item.verified_at} />
        </div>
        <p className="rounded border border-border bg-surface p-3 font-mono text-sm">{shareText(v)}</p>
        {status.rationale && (
          <p className="rounded border border-violet-600/40 p-3 text-sm">
            <span className="font-semibold">Rationale (human judgement): </span>
            {status.rationale}
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Window history</h2>
        <p className="text-sm text-muted">
          One row each time the stated window changed. The normalised reading follows the{" "}
          <Link href="/roadmaps/methodology" className="underline">
            published rubric
          </Link>
          ; ambiguity is read in the publisher&apos;s favour and the reading is recorded.
        </p>
        <div className="overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Captured
                </th>
                <th scope="col" className="px-3 py-2">
                  Stated as
                </th>
                <th scope="col" className="px-3 py-2">
                  Normalised
                </th>
                <th scope="col" className="px-3 py-2">
                  Rule
                </th>
                <th scope="col" className="px-3 py-2">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {item.window_history.map((h, i) => {
                const snap = getSnapshot(h.snapshot_id);
                return (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(h.captured_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{h.window_as_stated}</td>
                    <td className="px-3 py-2">{fmtWindow(h.window_normalised)}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {h.window_normalised?.rule ?? "no window"}
                      {h.window_normalised?.reading_note && <div>{h.window_normalised.reading_note}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {snap ? (
                        <>
                          <a href={snap.archived_url} className="underline" rel="noopener">
                            archived roadmap
                          </a>
                          {snap.source_published_at && <div className="text-muted">published {fmtDate(snap.source_published_at)}</div>}
                        </>
                      ) : (
                        h.snapshot_id
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">
          First seen {fmtDate(item.first_seen.date)}; last seen {fmtDate(item.last_seen.date)}
          {item.removed_at ? `; absent from ${fmtDate(item.removed_at)}` : ""}. Current window: {fmtWindow(cur.window_normalised)}.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Delivery</h2>
        {item.delivery ? (
          <dl className="grid gap-2 rounded border border-border bg-surface p-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">Delivered</dt>
            <dd>{fmtDate(item.delivery.date)}</dd>
            <dt className="text-muted">Source</dt>
            <dd>
              <a href={item.delivery.source.url} className="underline" rel="noopener">
                {item.delivery.source.title}
              </a>
              {item.delivery.source.archived_url && (
                <>
                  {" "}
                  (
                  <a href={item.delivery.source.archived_url} className="underline" rel="noopener">
                    archived
                  </a>
                  )
                </>
              )}
              <div className="text-xs text-muted">
                {item.delivery.source.kind.replace("_", " ")}
                {item.delivery.source.published_at ? ` · published ${fmtDate(item.delivery.source.published_at)}` : ""}
              </div>
            </dd>
            <dt className="text-muted">Matched by</dt>
            <dd>{item.delivery.matched_by === "human" ? "a person" : "script (unverified until a person checks it)"}</dd>
            {item.delivery.note && (
              <>
                <dt className="text-muted">Note</dt>
                <dd>{item.delivery.note}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted">No patch note naming this item has been recorded. {statusSentence(status)}.</p>
        )}
      </section>

      {item.notes && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="text-sm whitespace-pre-line">{item.notes}</p>
        </section>
      )}

      <footer className="text-sm text-muted">
        Think this row is wrong?{" "}
        <a href={CORRECTION_URL} className="underline">
          Open a correction
        </a>{" "}
        with the source you believe contradicts it. Record id <code className="font-mono text-xs">{item.id}</code>.
      </footer>
    </article>
  );
}
