import { ExpenseStatus, InvoiceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canPayExpense, canReviewExpense } from "@/lib/expenses";
import { canCancelInvoice, canValidateInvoice, isValidCancellationReason } from "@/lib/invoices";

describe("invoice workflow (RM2)", () => {
  it("RM2 – only a draft invoice can be validated", () => {
    expect(canValidateInvoice(InvoiceStatus.DRAFT)).toBe(true);
    expect(canValidateInvoice(InvoiceStatus.VALIDATED)).toBe(false);
    expect(canValidateInvoice(InvoiceStatus.CANCELLED)).toBe(false);
  });

  it("RM2 – a validated invoice without payments can be cancelled", () => {
    expect(canCancelInvoice(InvoiceStatus.VALIDATED, 0)).toBe(true);
  });

  it("RM2 – a draft invoice without payments can be cancelled", () => {
    expect(canCancelInvoice(InvoiceStatus.DRAFT, 0)).toBe(true);
  });

  it("RM2 – an invoice with a recorded payment cannot be cancelled", () => {
    expect(canCancelInvoice(InvoiceStatus.VALIDATED, 1)).toBe(false);
    expect(canCancelInvoice(InvoiceStatus.VALIDATED, 3)).toBe(false);
  });

  it("RM2 – an already cancelled invoice cannot be cancelled again", () => {
    expect(canCancelInvoice(InvoiceStatus.CANCELLED, 0)).toBe(false);
  });

  it("RM2 – a cancellation requires a non-empty reason", () => {
    expect(isValidCancellationReason("")).toBe(false);
    expect(isValidCancellationReason("   ")).toBe(false);
    expect(isValidCancellationReason("Customer order withdrawn")).toBe(true);
  });
});

describe("expense workflow (RM5)", () => {
  it("RM5 – only a pending expense can be approved or refused", () => {
    expect(canReviewExpense(ExpenseStatus.PENDING)).toBe(true);
    expect(canReviewExpense(ExpenseStatus.APPROVED)).toBe(false);
    expect(canReviewExpense(ExpenseStatus.REJECTED)).toBe(false);
    expect(canReviewExpense(ExpenseStatus.PAID)).toBe(false);
  });

  it("RM5 – an approved expense can be paid", () => {
    expect(canPayExpense(ExpenseStatus.APPROVED)).toBe(true);
  });

  it("RM5 – a rejected expense cannot be paid", () => {
    expect(canPayExpense(ExpenseStatus.REJECTED)).toBe(false);
  });

  it("RM5 – pending and already paid expenses cannot be paid", () => {
    expect(canPayExpense(ExpenseStatus.PENDING)).toBe(false);
    expect(canPayExpense(ExpenseStatus.PAID)).toBe(false);
  });
});
