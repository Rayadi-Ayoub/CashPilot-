import { describe, expect, it } from "vitest";
import { buildQuery, cleanQuery, dateRange, endOfDay, parseDateParam, parsePage } from "@/lib/filters";

describe("parseDateParam", () => {
  it("parses a valid YYYY-MM-DD date at UTC midnight", () => {
    expect(parseDateParam("2026-11-25")?.toISOString()).toBe("2026-11-25T00:00:00.000Z");
  });

  it("ignores missing, malformed or impossible dates", () => {
    expect(parseDateParam(undefined)).toBeUndefined();
    expect(parseDateParam("25/11/2026")).toBeUndefined();
    expect(parseDateParam("2026-13-45")).toBeUndefined();
  });
});

describe("endOfDay", () => {
  it("returns the last millisecond of the day", () => {
    expect(endOfDay(new Date("2026-11-25T00:00:00.000Z")).toISOString()).toBe("2026-11-25T23:59:59.999Z");
  });
});

describe("dateRange", () => {
  it("returns undefined when no bound is given", () => {
    expect(dateRange()).toBeUndefined();
    expect(dateRange("bad", "")).toBeUndefined();
  });

  it("builds an inclusive range from both bounds", () => {
    expect(dateRange("2026-11-01", "2026-11-30")).toEqual({
      gte: new Date("2026-11-01T00:00:00.000Z"),
      lte: new Date("2026-11-30T23:59:59.999Z"),
    });
  });

  it("supports a single bound", () => {
    expect(dateRange("2026-11-01")).toEqual({ gte: new Date("2026-11-01T00:00:00.000Z") });
    expect(dateRange(undefined, "2026-11-30")).toEqual({ lte: new Date("2026-11-30T23:59:59.999Z") });
  });
});

describe("cleanQuery", () => {
  it("trims the search text and caps it at 100 characters", () => {
    expect(cleanQuery("  Carthage  ")).toBe("Carthage");
    expect(cleanQuery(undefined)).toBe("");
    expect(cleanQuery("x".repeat(150))).toHaveLength(100);
  });
});

describe("parsePage", () => {
  it("returns a positive page number and defaults to 1", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });
});

describe("buildQuery", () => {
  it("keeps only non-empty filters in the URL", () => {
    expect(buildQuery("/invoices", { q: "Carthage", status: "", page: 2, from: undefined })).toBe("/invoices?q=Carthage&page=2");
  });

  it("returns the base path when no filter is active", () => {
    expect(buildQuery("/invoices", {})).toBe("/invoices");
  });
});
