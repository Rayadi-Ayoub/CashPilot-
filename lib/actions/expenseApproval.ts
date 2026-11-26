"use server";

import { ExpenseStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction, logAudit } from "@/lib/audit";
import { canPayExpense, canReviewExpense } from "@/lib/expenses";

function approvalError(expenseId: string, message: string): never {
  redirect(`/expenses/${expenseId}?error=${encodeURIComponent(message)}`);
}

export async function reviewExpense(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  const expenseId = String(formData.get("expenseId") ?? "");
  if (role !== Role.OWNER) approvalError(expenseId, "Only the company owner can approve or refuse expenses.");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (decision !== "APPROVE" && decision !== "REJECT") approvalError(expenseId, "Choose approval or refusal.");
  if (decision === "REJECT" && !note) approvalError(expenseId, "Explain why this expense is refused.");

  const expense = await db.expense.findFirst({ where: { id: expenseId, companyId: company.id }, select: { status: true } });
  if (!expense) approvalError(expenseId, "This expense is unavailable.");
  // Workflow : seule une dépense en attente peut être approuvée ou refusée.
  if (!canReviewExpense(expense.status)) approvalError(expenseId, "Only a pending expense can be reviewed.");

  // La condition sur le statut est répétée dans la mise à jour : si deux personnes
  // agissent en même temps, une seule modification est appliquée.
  const result = await db.expense.updateMany({
    where: { id: expenseId, companyId: company.id, status: ExpenseStatus.PENDING },
    data: { status: decision === "APPROVE" ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED, reviewedById: user.id, reviewedAt: new Date(), reviewNote: note },
  });
  if (result.count !== 1) approvalError(expenseId, "Only a pending expense can be reviewed.");
  await logAudit({ companyId: company.id, userId: user.id, action: decision === "APPROVE" ? AuditAction.EXPENSE_APPROVED : AuditAction.EXPENSE_REJECTED, entity: "Expense", entityId: expenseId, details: note });
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  redirect(`/expenses/${expenseId}?success=Expense ${decision === "APPROVE" ? "approved" : "refused"}.`);
}

export async function markExpensePaid(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  const expenseId = String(formData.get("expenseId") ?? "");
  if (!canManage(role)) approvalError(expenseId, "Only the owner or financial manager can record an expense payment.");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(new Date(`${paymentDate}T00:00:00`).getTime())) approvalError(expenseId, "Choose a valid payment date.");

  const expense = await db.expense.findFirst({ where: { id: expenseId, companyId: company.id }, select: { status: true } });
  if (!expense) approvalError(expenseId, "This expense is unavailable.");
  // RM5 : seule une dépense approuvée peut être payée ; une dépense refusée ne l'est jamais.
  if (!canPayExpense(expense.status)) {
    approvalError(expenseId, expense.status === ExpenseStatus.REJECTED ? "A refused expense can never be paid." : "Only an approved, unpaid expense can be recorded as paid.");
  }

  // Condition répétée dans la mise à jour, pour rester sûr en cas d'accès simultanés.
  const result = await db.expense.updateMany({
    where: { id: expenseId, companyId: company.id, status: ExpenseStatus.APPROVED },
    data: { status: ExpenseStatus.PAID, paidAt: new Date(`${paymentDate}T00:00:00.000Z`), paidById: user.id },
  });
  if (result.count !== 1) approvalError(expenseId, "Only an approved, unpaid expense can be recorded as paid. Refused expenses cannot be paid.");
  await logAudit({ companyId: company.id, userId: user.id, action: AuditAction.EXPENSE_PAID, entity: "Expense", entityId: expenseId, details: `Paid on ${paymentDate}` });
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  redirect(`/expenses/${expenseId}?success=Expense payment recorded.`);
}
