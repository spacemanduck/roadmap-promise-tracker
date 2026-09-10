import type { ItemView } from "@/lib/data";
import { STATUS_HEX, fmtDate, fmtWindow, statusSentence } from "@/lib/format";

/**
 * Promised-versus-actual timeline. Text/SVG only — no publisher graphics.
 * One row per item that has at least one normalised window. Earlier windows (slips) are drawn as
 * hollow bars; the current window is solid; delivery is a circle; today is a dashed line.
 */
export function Timeline({ items, today }: { items: ItemView[]; today: string }) {
  const rows = items.filter((v) => v.item.window_history.some((h) => h.window_normalised));
  if (rows.length === 0) return null;

  const dates: string[] = [today];
  for (const v of rows) {
    for (const h of v.item.window_history) if (h.window_normalised) dates.push(h.window_normalised.start, h.window_normalised.end);
    if (v.item.delivery) dates.push(v.item.delivery.date);
  }
  const t0 = Date.parse(dates.reduce((a, b) => (a < b ? a : b))) - 15 * 86_400_000;
  const t1 = Date.parse(dates.reduce((a, b) => (a > b ? a : b))) + 15 * 86_400_000;

  const LABEL_W = 220;
  const PLOT_W = 640;
  const ROW_H = 26;
  const TOP = 30;
  const W = LABEL_W + PLOT_W + 20;
  const H = TOP + rows.length * ROW_H + 10;
  const x = (iso: string) => LABEL_W + ((Date.parse(iso) - t0) / (t1 - t0)) * PLOT_W;

  // Month ticks
  const ticks: { x: number; label: string }[] = [];
  const d = new Date(t0);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const span = (t1 - t0) / 86_400_000;
  const step = span > 900 ? 6 : span > 400 ? 3 : 1;
  while (+d < t1) {
    if (d.getUTCMonth() % step === 0) {
      ticks.push({ x: x(d.toISOString().slice(0, 10)), label: d.toLocaleString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) });
    }
    d.setUTCMonth(d.getUTCMonth() + 1);
  }

  return (
    <figure
      className="overflow-x-auto rounded border border-border bg-surface p-2 focus:outline-none focus:ring-2"
      tabIndex={0}
      aria-label="Promised-versus-actual timeline (scrollable)"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`Promised windows and deliveries for ${rows.length} items; the table below lists the same data.`}
        className="max-w-none"
        style={{ minWidth: W }}
      >
        <title>Promised versus actual</title>
        {ticks.map((t) => (
          <g key={t.label + t.x}>
            <line x1={t.x} x2={t.x} y1={TOP - 6} y2={H - 8} stroke="currentColor" strokeOpacity={0.12} />
            <text x={t.x} y={TOP - 12} fontSize={10} textAnchor="middle" fill="currentColor" fillOpacity={0.7}>
              {t.label}
            </text>
          </g>
        ))}
        <line x1={x(today)} x2={x(today)} y1={TOP - 6} y2={H - 8} stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.6} />
        <text x={x(today) + 3} y={H - 2} fontSize={9} fill="currentColor" fillOpacity={0.7}>
          today
        </text>
        {rows.map((v, i) => {
          const y = TOP + i * ROW_H + ROW_H / 2;
          const hist = v.item.window_history.filter((h) => h.window_normalised);
          const cur = hist[hist.length - 1].window_normalised!;
          const colour = STATUS_HEX[v.status.code];
          const label = v.item.title_normalised.length > 34 ? v.item.title_normalised.slice(0, 33) + "…" : v.item.title_normalised;
          return (
            <g key={v.item.id}>
              <text x={LABEL_W - 8} y={y + 4} fontSize={11} textAnchor="end" fill="currentColor">
                {label}
              </text>
              {hist.slice(0, -1).map((h, j) => (
                <rect
                  key={j}
                  x={x(h.window_normalised!.start)}
                  y={y - 5}
                  width={Math.max(2, x(h.window_normalised!.end) - x(h.window_normalised!.start))}
                  height={10}
                  fill="none"
                  stroke={colour}
                  strokeOpacity={0.6}
                  strokeDasharray="2 2"
                >
                  <title>{`Earlier window: ${h.window_as_stated} (${fmtWindow(h.window_normalised)})`}</title>
                </rect>
              ))}
              <rect x={x(cur.start)} y={y - 5} width={Math.max(2, x(cur.end) - x(cur.start))} height={10} fill={colour} fillOpacity={0.35} stroke={colour}>
                <title>{`Promised: ${fmtWindow(cur)} — ${statusSentence(v.status)}`}</title>
              </rect>
              {v.item.delivery && (
                <circle cx={x(v.item.delivery.date)} cy={y} r={5} fill={colour} stroke="var(--surface)" strokeWidth={1.5}>
                  <title>{`Delivered ${fmtDate(v.item.delivery.date)}`}</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="px-2 pt-2 text-xs text-muted">
        Solid bar: current promised window. Dashed bar: an earlier window (a slip). Circle: delivery date from the patch note. Colour: computed
        status. Each item links from the table below.
      </figcaption>
    </figure>
  );
}
