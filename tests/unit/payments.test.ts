import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { invoiceRemaining } from "@/lib/payments";

describe("invoiceRemaining", () => {
  it("RM1 – remaining equals the total when there is no payment", () => {
    expect(invoiceRemaining({ total: "400", payments: [] }).toFixed(2)).toBe("400.00");
  });

  it("RM1 – remaining decreases after a partial payment (400 − 150 = 250)", () => {
    expect(invoiceRemaining({ total: "400", payments: [{ amount: "150" }] }).toFixed(2)).toBe("250.00");
  });

  it("RM1 – remaining is zero once the invoice is fully paid", () => {
    const remaining = invoiceRemaining({ total: "3000", payments: [{ amount: "1000" }, { amount: "2000" }] });
    expect(remaining.isZero()).toBe(true);
  });

  it("RM1 – sums several payments exactly", () => {
    const remaining = invoiceRemaining({ total: "100.30", payments: [{ amount: "0.10" }, { amount: "0.20" }] });
    expect(remaining.toFixed(2)).toBe("100.00");
  });

  it("accepts number, string and Decimal inputs", () => {
    const remaining = invoiceRemaining({ total: new Prisma.Decimal("500"), payments: [{ amount: 100 }, { amount: "50.50" }] });
    expect(remaining.toFixed(2)).toBe("349.50");
  });
});
