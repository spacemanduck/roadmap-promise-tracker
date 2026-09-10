import { describe, expect, it } from "vitest";
import { normaliseWindow } from "../lib/window";

const ctx = { published_at: "2025-12-23" };

describe("normaliseWindow — rubric rules", () => {
  it("exact date", () => {
    expect(normaliseWindow("2026-08-14", ctx)).toMatchObject({ start: "2026-08-14", end: "2026-08-14", rule: "exact_date" });
    expect(normaliseWindow("14 August 2026", ctx)).toMatchObject({ start: "2026-08-14", end: "2026-08-14" });
    expect(normaliseWindow("August 14, 2026", ctx)).toMatchObject({ start: "2026-08-14", end: "2026-08-14" });
  });

  it("month → first–last day", () => {
    expect(normaliseWindow("February 2026", ctx)).toMatchObject({ start: "2026-02-01", end: "2026-02-28", rule: "month" });
    expect(normaliseWindow("Jan 2026", ctx)).toMatchObject({ start: "2026-01-01", end: "2026-01-31" });
  });

  it("month with no year resolves against the publication date", () => {
    // Published 23 Dec 2025: "January" is Jan 2026, "December" is Dec 2025.
    expect(normaliseWindow("January", ctx)).toMatchObject({ start: "2026-01-01", end: "2026-01-31" });
    expect(normaliseWindow("December", ctx)).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
    expect(normaliseWindow("April", { published_at: "2025-04-02" })).toMatchObject({ start: "2025-04-01", end: "2025-04-30" });
  });

  it("'early in August' is read as the whole month", () => {
    expect(normaliseWindow("early in August", { published_at: "2025-07-10" })).toMatchObject({ start: "2025-08-01", end: "2025-08-31" });
  });

  it("'late July' is read as the whole month (publisher's favour) and the reading is recorded", () => {
    const w = normaliseWindow("late July", { published_at: "2025-07-01" })!;
    expect(w).toMatchObject({ start: "2025-07-01", end: "2025-07-31" });
    expect(w.reading_note).toMatch(/whole month/);
  });

  it("calendar quarter", () => {
    expect(normaliseWindow("Q4 2025", ctx)).toMatchObject({ start: "2025-10-01", end: "2025-12-31", rule: "calendar_quarter" });
    expect(normaliseWindow("Q1 2026", ctx)).toMatchObject({ start: "2026-01-01", end: "2026-03-31" });
  });

  it("fiscal quarter when the publisher defines a fiscal year", () => {
    // FY starting April, named by end year: Q1 FY26 = Apr–Jun 2025.
    const w = normaliseWindow("Q1 FY26", { published_at: "2025-05-01", fiscal_year_start_month: 4 })!;
    expect(w).toMatchObject({ start: "2025-04-01", end: "2025-06-30", rule: "fiscal_quarter" });
  });

  it("season → Northern-hemisphere meteorological", () => {
    expect(normaliseWindow("Summer 2026", ctx)).toMatchObject({ start: "2026-06-01", end: "2026-08-31" });
    expect(normaliseWindow("Autumn 2026", ctx)).toMatchObject({ start: "2026-09-01", end: "2026-11-30" });
    const winter = normaliseWindow("Winter 2026", ctx)!;
    expect(winter).toMatchObject({ start: "2026-12-01", end: "2027-02-28" });
    expect(winter.reading_note).toBeTruthy();
  });

  it("early / mid / late year", () => {
    expect(normaliseWindow("early 2026", ctx)).toMatchObject({ start: "2026-01-01", end: "2026-04-30" });
    expect(normaliseWindow("mid 2026", ctx)).toMatchObject({ start: "2026-05-01", end: "2026-08-31" });
    expect(normaliseWindow("late 2026", ctx)).toMatchObject({ start: "2026-09-01", end: "2026-12-31" });
  });

  it("bare year and half year", () => {
    expect(normaliseWindow("2026", ctx)).toMatchObject({ start: "2026-01-01", end: "2026-12-31", rule: "year" });
    expect(normaliseWindow("H2 2026", ctx)).toMatchObject({ start: "2026-07-01", end: "2026-12-31" });
    expect(normaliseWindow("first half of 2026", ctx)).toMatchObject({ start: "2026-01-01", end: "2026-06-30" });
  });

  it("'later this year' → publication date to 31 Dec", () => {
    expect(normaliseWindow("later this year", { published_at: "2026-03-30" })).toMatchObject({ start: "2026-03-30", end: "2026-12-31", rule: "rest_of_year" });
  });

  it("month ranges", () => {
    expect(normaliseWindow("between March and April 2022", ctx)).toMatchObject({ start: "2022-03-01", end: "2022-04-30" });
    expect(normaliseWindow("March–April 2026", ctx)).toMatchObject({ start: "2026-03-01", end: "2026-04-30" });
  });

  it("'coming soon', 'TBA', cycle names → null (tracked, never coded late)", () => {
    expect(normaliseWindow("Coming soon", ctx)).toBeNull();
    expect(normaliseWindow("TBA", ctx)).toBeNull();
    expect(normaliseWindow("very soon", ctx)).toBeNull();
    expect(normaliseWindow("Season 4", ctx)).toBeNull();
    expect(normaliseWindow("Update 2.6", ctx)).toBeNull();
  });
});
