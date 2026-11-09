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
