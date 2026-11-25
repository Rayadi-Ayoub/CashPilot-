import { ExpenseStatus, InvoiceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { expenseStatusLabels, expenseStatusTone } from "@/lib/expenses";
import { invoiceStatusLabels, invoiceStatusTone } from "@/lib/invoices";

describe("invoice statuses", () => {
  it("has a label for every invoice status", () => {
    expect(invoiceStatusLabels).toEqual({ DRAFT: "Draft", VALIDATED: "Validated", CANCELLED: "Cancelled" });
    expect(Object.keys(invoiceStatusLabels).sort()).toEqual(Object.values(InvoiceStatus).sort());
  });

  it("maps each invoice status to its badge tone", () => {
    expect(invoiceStatusTone(InvoiceStatus.DRAFT)).toBe("neutral");
    expect(invoiceStatusTone(InvoiceStatus.VALIDATED)).toBe("success");
    expect(invoiceStatusTone(InvoiceStatus.CANCELLED)).toBe("danger");
  });
});

describe("expense statuses", () => {
  it("has a label for every expense status", () => {
    expect(expenseStatusLabels).toEqual({ PENDING: "Pending approval", APPROVED: "Approved", REJECTED: "Rejected", PAID: "Paid" });
    expect(Object.keys(expenseStatusLabels).sort()).toEqual(Object.values(ExpenseStatus).sort());
  });

  it("maps each expense status to its badge tone", () => {
    expect(expenseStatusTone(ExpenseStatus.PENDING)).toBe("warning");
    expect(expenseStatusTone(ExpenseStatus.APPROVED)).toBe("success");
    expect(expenseStatusTone(ExpenseStatus.REJECTED)).toBe("danger");
    expect(expenseStatusTone(ExpenseStatus.PAID)).toBe("info");
  });
});
