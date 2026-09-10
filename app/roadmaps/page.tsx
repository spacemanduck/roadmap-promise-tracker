import type { Metadata } from "next";
import Link from "next/link";
import { getGames } from "@/lib/data";
import { fmtDate, pct } from "@/lib/format";

export const metadata: Metadata = {
  title: "Games tracked",
  description: "Every tracked game with its roadmap on-time rate, pending and overdue items, and last capture date.",
};

export default function RoadmapsIndex() {
  const games = getGames();
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Games tracked</h1>
        <p className="max-w-2xl text-muted">
          On-time rate is on-time ÷ (on-time + late) over items with a stated window and a delivery. The denominator is shown
          every time. Items with no stated window are tracked but never coded late.{" "}
          <Link href="/roadmaps/methodology" className="underline">
            Methodology
          </Link>
          .
        </p>
      </header>

      <div className="overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2">
                Game
              </th>
              <th scope="col" className="px-3 py-2">
                On-time rate
              </th>
              <th scope="col" className="px-3 py-2">
                Items
              </th>
              <th scope="col" className="px-3 py-2">
                Pending
              </th>
              <th scope="col" className="px-3 py-2">
                Overdue
              </th>
              <th scope="col" className="px-3 py-2">
                Verified
              </th>
              <th scope="col" className="px-3 py-2">
                Tracked since
              </th>
              <th scope="col" className="px-3 py-2">
                Last capture
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.source.game_id} className="border-t border-border align-top">
                <th scope="row" className="px-3 py-2 font-medium">
                  <Link href={`/roadmaps/${g.source.game_id}`} className="hover:underline">
                    {g.source.game_name}
                  </Link>
                  <div className="text-xs font-normal text-muted">{g.source.publisher_name}</div>
                </th>
                <td className="px-3 py-2">
                  <span className="font-semibold">{pct(g.stats.on_time_rate)}</span>
                  <div className="text-xs text-muted">
                    {g.stats.on_time} of {g.stats.denominator} dated, delivered
                  </div>
                </td>
                <td className="px-3 py-2">
                  {g.stats.total}
                  <div className="text-xs text-muted">{g.stats.without_window} with no stated window</div>
                </td>
                <td className="px-3 py-2">{g.stats.pending}</td>
                <td className="px-3 py-2">{g.stats.overdue}</td>
                <td className="px-3 py-2">
                  {g.stats.verified} of {g.stats.total}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(g.first_capture)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(g.last_capture)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted">
        Want a game added?{" "}
        <Link href="/roadmaps/request" className="underline">
          Which games are tracked and why, and how to suggest one
        </Link>
        .
      </p>
    </div>
  );
}
