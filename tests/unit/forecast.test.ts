import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, balanceAt, buildProjection, onOrAfterToday, startOfToday, type ForecastFlow } from "@/lib/forecast";

const reference = new Date(2026, 0, 1);

function flow(kind: ForecastFlow["kind"], amount: string, day: number): ForecastFlow {
  return { id: `${kind}-${day}`, date: addDays(reference, day), label: kind, kind, amount: new Prisma.Decimal(amount), source: kind === "INCOME" ? "INVOICE" : "EXPENSE" };
}

describe("addDays", () => {
  it("adds days and crosses a month boundary", () => {
    expect(addDays(new Date(2026, 0, 30), 3)).toEqual(new Date(2026, 1, 2));
  });

  it("does not mutate the input date", () => {
    const input = new Date(2026, 5, 10);
    addDays(input, 7);
    expect(input).toEqual(new Date(2026, 5, 10));
  });
});

describe("onOrAfterToday", () => {
  it("moves an overdue date to the reference date", () => {
    expect(onOrAfterToday(new Date(2025, 11, 20), reference)).toBe(reference);
  });

  it("keeps a future date unchanged", () => {
    const future = new Date(2026, 0, 15);
    expect(onOrAfterToday(future, reference)).toBe(future);
  });
});

describe("startOfToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today at midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10, 15, 30, 45));
    expect(startOfToday()).toEqual(new Date(2026, 4, 10));
  });
});

describe("buildProjection", () => {
  const points = buildProjection(new Prisma.Decimal("1000"), [flow("INCOME", "500", 2), flow("EXPENSE", "300", 5)], reference);

  it("returns one point per day for 90 days, including day 0", () => {
    expect(points).toHaveLength(91);
    expect(points[0].date).toEqual(reference);
  });

  it("keeps the reference balance until the first flow", () => {
    expect(points[1].balance.toFixed(2)).toBe("1000.00");
  });

  it("adds income on its due day", () => {
    expect(points[2].income.toFixed(2)).toBe("500.00");
    expect(points[2].expense.isZero()).toBe(true);
    expect(points[2].balance.toFixed(2)).toBe("1500.00");
  });

  it("subtracts expenses on their due day and carries the balance forward", () => {
    expect(points[5].expense.toFixed(2)).toBe("300.00");
    expect(points[5].balance.toFixed(2)).toBe("1200.00");
    expect(points[90].balance.toFixed(2)).toBe("1200.00");
  });

  it("can project a negative balance", () => {
    const negative = buildProjection(new Prisma.Decimal("100"), [flow("EXPENSE", "250", 1)], reference, 3);
    expect(negative).toHaveLength(4);
    expect(negative[1].balance.toFixed(2)).toBe("-150.00");
  });
});

describe("balanceAt", () => {
  it("returns the projected balance at the given day offset", () => {
    const points = buildProjection(new Prisma.Decimal("1000"), [flow("INCOME", "500", 30)], reference);
    expect(balanceAt(points, 29).toFixed(2)).toBe("1000.00");
    expect(balanceAt(points, 30).toFixed(2)).toBe("1500.00");
  });
});
