import { describe, expect, it } from "vitest";
import { sumMoney } from "@/lib/money";

describe("test setup", () => {
  it("resolves @/ imports and the Prisma Decimal type", () => {
    expect(sumMoney([]).toString()).toBe("0");
  });
});
