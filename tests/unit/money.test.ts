import { describe, expect, it } from "vitest";
import { parseMoney, sumMoney } from "@/lib/money";

describe("parseMoney", () => {
  it("RM6 – accepts a positive amount with two decimals", () => {
    expect(parseMoney("125.50").toFixed(2)).toBe("125.50");
  });

  it("RM6 – accepts an integer amount", () => {
    expect(parseMoney("10").toString()).toBe("10");
  });

  it("RM6 – accepts an amount with one decimal", () => {
    expect(parseMoney("7.5").toFixed(2)).toBe("7.50");
  });

  it("RM6 – trims surrounding whitespace before validating", () => {
    expect(parseMoney(" 42.10 ").toFixed(2)).toBe("42.10");
  });

  it("RM6 – rejects a negative amount", () => {
    expect(() => parseMoney("-5")).toThrow("positive amount");
  });

  it("RM6 – rejects zero", () => {
    expect(() => parseMoney("0")).toThrow("greater than zero");
    expect(() => parseMoney("0.00")).toThrow("greater than zero");
  });

  it("RM6 – rejects more than two decimal places", () => {
    expect(() => parseMoney("1.234")).toThrow("at most two decimal places");
  });

  it("RM6 – rejects text", () => {
    expect(() => parseMoney("abc")).toThrow("positive amount");
    expect(() => parseMoney("12,50")).toThrow("positive amount");
  });

  it("RM6 – rejects an empty or missing value", () => {
    expect(() => parseMoney("")).toThrow("positive amount");
    expect(() => parseMoney(null)).toThrow("positive amount");
  });
});

describe("sumMoney", () => {
  it("returns zero for an empty list", () => {
    expect(sumMoney([]).toString()).toBe("0");
  });

  it("adds decimals exactly, without floating-point error", () => {
    expect(sumMoney(["0.10", "0.20"]).toString()).toBe("0.3");
  });

  it("adds mixed decimal-like values", () => {
    expect(sumMoney([parseMoney("100.25"), "49.75", 50]).toFixed(2)).toBe("200.00");
  });
});
