import { describe, expect, it } from "vitest";
import { buildPaymentReminder } from "@/lib/paymentReminder";
import { invoiceRemaining } from "@/lib/payments";

describe("buildPaymentReminder", () => {
  it("RM1 – requests 250.00 DT for a 400 DT invoice with 150 DT already paid", () => {
    const amountRemaining = invoiceRemaining({ total: "400", payments: [{ amount: "150" }] }).toFixed(2);
    const message = buildPaymentReminder({ customerName: "Carthage Retail", invoiceNumber: "INV-2026-0003", dueDate: "10 Nov 2026", amountRemaining });
    expect(message).toContain("250.00 DT");
  });

  it("includes the customer name, invoice number and due date", () => {
    const message = buildPaymentReminder({ customerName: "Carthage Retail", invoiceNumber: "INV-2026-0003", dueDate: "10 Nov 2026", amountRemaining: "250.00" });
    expect(message).toContain("Hello Carthage Retail");
    expect(message).toContain("invoice INV-2026-0003");
    expect(message).toContain("due on 10 Nov 2026");
  });
});
