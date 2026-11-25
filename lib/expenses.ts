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

/** Workflow: only a pending expense can be approved or refused. */
export function canReviewExpense(status: ExpenseStatus) {
  return status === ExpenseStatus.PENDING;
}

/** RM5: only an approved expense can be paid; a refused (or already paid) expense cannot. */
export function canPayExpense(status: ExpenseStatus) {
  return status === ExpenseStatus.APPROVED;
}
