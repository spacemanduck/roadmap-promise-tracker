/**
 * Window normalisation — mechanical rules from docs/roadmap-methodology.md §Window normalisation.
 *
 * Every rule returns { start, end, rule } or null. Ambiguous phrasings are read in the
 * publisher's favour (the later end date) and the reading is recorded in `reading_note`.
 */
import type { WindowNormalised } from "@/schema/roadmap";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_ABBR: Record<string, number> = {};
MONTHS.forEach((m, i) => {
  MONTH_ABBR[m] = i;
  MONTH_ABBR[m.slice(0, 3)] = i;
});
MONTH_ABBR["sept"] = 8;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function iso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function lastDay(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}
function monthWindow(y: number, m: number): { start: string; end: string } {
  return { start: iso(y, m, 1), end: iso(y, m, lastDay(y, m)) };
}

export interface NormaliseContext {
  /** ISO date the roadmap was published; used to resolve month names with no year. */
  published_at: string;
  /** Month (1–12) a publisher-defined fiscal year starts, if the page defines one. */
  fiscal_year_start_month?: number;
}

const NULL_PHRASES = [
  /^tba$/i, /^tbd$/i, /^tbc$/i, /^coming soon$/i, /^soon$/i, /^later$/i, /^future$/i,
  /^in development$/i, /^planned$/i, /^when it'?s ready$/i, /^ongoing$/i, /^no date$/i,
  /^very soon$/i, /^in the future$/i,
];

/**
 * Normalise a stated window. Returns null when the rubric says the item is tracked but never
 * coded late ("coming soon", "TBA", unresolved cycle names).
 */
export function normaliseWindow(stated: string, ctx: NormaliseContext): WindowNormalised | null {
  const s = stated
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+/i, "")
    .replace(/[.,;:]+$/, "");
  const pubYear = Number(ctx.published_at.slice(0, 4));
  const pubMonth = Number(ctx.published_at.slice(5, 7)) - 1;

  if (NULL_PHRASES.some((re) => re.test(s))) return null;

  let m: RegExpMatchArray | null;

  // Exact date: 2026-08-14 | 14 August 2026 | August 14, 2026 | Aug 14 2026
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    return { start: s, end: s, rule: "exact_date" };
  }
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([A-Za-z]+),? (\d{4})$/))) {
    const mo = MONTH_ABBR[m[2].toLowerCase()];
    if (mo !== undefined) {
      const d = iso(Number(m[3]), mo, Number(m[1]));
      return { start: d, end: d, rule: "exact_date" };
    }
  }
  if ((m = s.match(/^([A-Za-z]+) (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/))) {
    const mo = MONTH_ABBR[m[1].toLowerCase()];
    if (mo !== undefined) {
      const d = iso(Number(m[3]), mo, Number(m[2]));
      return { start: d, end: d, rule: "exact_date" };
    }
  }
  // Exact date with no year: "March 3", "3 March" — resolved against publication date
  if ((m = s.match(/^([A-Za-z]+) (\d{1,2})(?:st|nd|rd|th)?$/)) || (m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([A-Za-z]+)$/))) {
    const [a, b] = /^\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    const mo = MONTH_ABBR[a.toLowerCase()];
    if (mo !== undefined) {
      const y = mo < pubMonth ? pubYear + 1 : pubYear;
      const d = iso(y, mo, Number(b));
      return { start: d, end: d, rule: "exact_date", reading_note: `year ${y} inferred from publication date ${ctx.published_at}` };
    }
  }

  // Quarter: Q1 2026 | 2026 Q1 | Q1 FY26
  if ((m = s.match(/^(?:q([1-4])\s*(?:fy)?\s*(\d{2,4})|(\d{4})\s*q([1-4]))$/i))) {
    const q = Number(m[1] ?? m[4]);
    let y = Number(m[2] ?? m[3]);
    if (y < 100) y += 2000;
    const fy = ctx.fiscal_year_start_month;
    if (fy && fy !== 1) {
      // Fiscal quarter: Q1 starts at fiscal_year_start_month of the previous calendar year
      // when the fiscal year is named by its end year (the common convention).
      const startMonth = (fy - 1 + (q - 1) * 3) % 12;
      const startYear = y - 1 + Math.floor((fy - 1 + (q - 1) * 3) / 12);
      const endMonth = (startMonth + 2) % 12;
      const endYear = startYear + Math.floor((startMonth + 2) / 12);
      return {
        start: iso(startYear, startMonth, 1),
        end: iso(endYear, endMonth, lastDay(endYear, endMonth)),
        rule: "fiscal_quarter",
        reading_note: `publisher fiscal year starts month ${fy}`,
      };
    }
    const sm = (q - 1) * 3;
    return { start: iso(y, sm, 1), end: iso(y, sm + 2, lastDay(y, sm + 2)), rule: "calendar_quarter" };
  }

  // Half year: H1 2026 | first half of 2026 | second half 2026
  if ((m = s.match(/^(?:h([12])\s*(\d{4})|(first|second|1st|2nd) half(?: of)? (\d{4}))$/i))) {
    const h = m[1] ? Number(m[1]) : /^(first|1st)$/i.test(m[3]) ? 1 : 2;
    const y = Number(m[2] ?? m[4]);
    return h === 1
      ? { start: iso(y, 0, 1), end: iso(y, 5, 30), rule: "half_year" }
      : { start: iso(y, 6, 1), end: iso(y, 11, 31), rule: "half_year" };
  }

  // Early / mid / late YEAR
  if ((m = s.match(/^(early|mid|mid-|late|end of|the end of) ?(\d{4})$/i))) {
    const y = Number(m[2]);
    const k = m[1].toLowerCase().replace(/[- ]/g, "");
    if (k === "early") return { start: iso(y, 0, 1), end: iso(y, 3, 30), rule: "early_year" };
    if (k === "mid") return { start: iso(y, 4, 1), end: iso(y, 7, 31), rule: "mid_year" };
    return { start: iso(y, 8, 1), end: iso(y, 11, 31), rule: "late_year" };
  }

  // Season: Summer 2026 (Northern-hemisphere meteorological)
  if ((m = s.match(/^(spring|summer|autumn|fall|winter) (\d{4})$/i))) {
    const y = Number(m[2]);
    const k = m[1].toLowerCase();
    if (k === "spring") return { start: iso(y, 2, 1), end: iso(y, 4, 31), rule: "season_meteorological" };
    if (k === "summer") return { start: iso(y, 5, 1), end: iso(y, 7, 31), rule: "season_meteorological" };
    if (k === "autumn" || k === "fall") return { start: iso(y, 8, 1), end: iso(y, 10, 30), rule: "season_meteorological" };
    // Winter YYYY: Dec of YYYY to Feb of YYYY+1 admits two readings; later end date wins.
    return {
      start: iso(y, 11, 1),
      end: iso(y + 1, 1, lastDay(y + 1, 1)),
      rule: "season_meteorological",
      reading_note: "'Winter YYYY' read as Dec YYYY–Feb YYYY+1 (later end date)",
    };
  }

  // Month with year: January 2026 | Jan 2026 | early January 2026 | late Jan 2026
  if ((m = s.match(/^(?:(early|mid|mid-|late|end of) (?:in )?)?([A-Za-z]+),? (\d{4})$/i))) {
    const mo = MONTH_ABBR[m[2].toLowerCase()];
    if (mo !== undefined) {
      const y = Number(m[3]);
      const w = monthWindow(y, mo);
      return m[1]
        ? { ...w, rule: "month", reading_note: `'${m[1]} ${m[2]}' read as the whole month (publisher's favour)` }
        : { ...w, rule: "month" };
    }
  }

  // Month with no year: resolved against publication date (a month earlier than the
  // publication month is read as next year).
  if ((m = s.match(/^(?:(early|mid|mid-|late|end of) (?:in )?)?([A-Za-z]+)$/i))) {
    const mo = MONTH_ABBR[m[2].toLowerCase()];
    if (mo !== undefined) {
      const y = mo < pubMonth ? pubYear + 1 : pubYear;
      const w = monthWindow(y, mo);
      const notes = [`year ${y} inferred from publication date ${ctx.published_at}`];
      if (m[1]) notes.push(`'${m[1]} ${m[2]}' read as the whole month (publisher's favour)`);
      return { ...w, rule: "month", reading_note: notes.join("; ") };
    }
  }

  // "Later this year" / "this year" / "by the end of the year" → rest of the publication year
  if (/^(later this year|this year|by (the )?end of (the )?year|end of (the )?year|before the end of the year)$/i.test(s)) {
    return {
      start: ctx.published_at,
      end: iso(pubYear, 11, 31),
      rule: "rest_of_year",
      reading_note: `'${s}' read as ${ctx.published_at} to ${pubYear}-12-31`,
    };
  }

  // Bare year: 2026
  if ((m = s.match(/^(?:in |during )?(\d{4})$/))) {
    const y = Number(m[1]);
    return { start: iso(y, 0, 1), end: iso(y, 11, 31), rule: "year" };
  }

  // Ranges: "March–April 2026", "between March and April 2026", "Q1–Q2 2026"
  if ((m = s.match(/^(?:between )?([A-Za-z]+)(?: and |\s*[–-]\s*| to )([A-Za-z]+),? (\d{4})$/i))) {
    const a = MONTH_ABBR[m[1].toLowerCase()];
    const b = MONTH_ABBR[m[2].toLowerCase()];
    const y = Number(m[3]);
    if (a !== undefined && b !== undefined) {
      const endY = b < a ? y + 1 : y;
      return { start: iso(y, a, 1), end: iso(endY, b, lastDay(endY, b)), rule: "month_range" };
    }
  }
  if ((m = s.match(/^q([1-4])\s*[–-]\s*q([1-4]) (\d{4})$/i))) {
    const y = Number(m[3]);
    const sm = (Number(m[1]) - 1) * 3;
    const em = (Number(m[2]) - 1) * 3 + 2;
    return { start: iso(y, sm, 1), end: iso(y, em, lastDay(y, em)), rule: "quarter_range" };
  }

  // In-game cycle names ("Season 4", "Update 2.6", "Year 11 Season 2") resolve to dates only
  // when the publisher has published that cycle's dates — that mapping is a human step.
  return null;
}

