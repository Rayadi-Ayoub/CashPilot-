import { ExpenseStatus } from "@prisma/client";

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export function expenseStatusTone(status: ExpenseStatus): "warning" | "success" | "danger" | "info" {
  if (status === ExpenseStatus.PENDING) return "warning";
  if (status === ExpenseStatus.REJECTED) return "danger";
  if (status === ExpenseStatus.PAID) return "info";
  return "success";
}
