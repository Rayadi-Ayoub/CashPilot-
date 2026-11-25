import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "@/lib/format";

describe("formatMoney", () => {
  it("formats an amount in dinars with two decimals and thousands separators", () => {
    expect(formatMoney("1234.5")).toContain("1,234.50");
  });

  it("keeps the sign of a negative amount", () => {
    const formatted = formatMoney(-20);
    expect(formatted).toContain("20.00");
    expect(formatted).toMatch(/^-/);
  });
});

describe("formatDate", () => {
  it("formats a date as day, short month and year", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05 Jan 2026");
  });
});
