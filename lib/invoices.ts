import { InvoiceStatus } from "@prisma/client";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  VALIDATED: "Validated",
  CANCELLED: "Cancelled",
};

export function invoiceStatusTone(status: InvoiceStatus): "neutral" | "success" | "danger" {
  if (status === InvoiceStatus.VALIDATED) return "success";
  if (status === InvoiceStatus.CANCELLED) return "danger";
  return "neutral";
}

/** Workflow: only a draft invoice can be validated. */
export function canValidateInvoice(status: InvoiceStatus) {
  return status === InvoiceStatus.DRAFT;
}

/** RM2: an invoice can be cancelled only if it is not already cancelled and has no recorded payment. */
export function canCancelInvoice(status: InvoiceStatus, paymentCount: number) {
  return status !== InvoiceStatus.CANCELLED && paymentCount === 0;
}

/** RM2: a cancellation must carry a non-empty reason. */
export function isValidCancellationReason(reason: string) {
  return reason.trim().length > 0;
}
