import { Prisma } from "@prisma/client";
import { db } from "./db";

export async function getRealBalance(companyId: string) {
  const [company, payments, expenses, adjustments] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { initialBalance: true } }),
    db.payment.findMany({ where: { companyId }, select: { amount: true } }),
    db.expense.findMany({ where: { companyId, status: "PAID" }, select: { amount: true } }),
    db.cashAdjustment.findMany({ where: { companyId }, select: { amount: true } }),
  ]);
  return payments.reduce((balance, payment) => balance.plus(payment.amount), new Prisma.Decimal(company.initialBalance))
    .minus(expenses.reduce((sum, expense) => sum.plus(expense.amount), new Prisma.Decimal(0)))
    .plus(adjustments.reduce((sum, adjustment) => sum.plus(adjustment.amount), new Prisma.Decimal(0)));
}

export async function getCashMovements(companyId: string) {
  const [company, payments, expenses, adjustments] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id: companyId } }),
    db.payment.findMany({ where: { companyId }, include: { invoice: { include: { contact: true } } } }),
    db.expense.findMany({ where: { companyId, status: "PAID" } }),
    db.cashAdjustment.findMany({ where: { companyId }, include: { createdBy: true } }),
  ]);
  const movements = [
    { id: `initial-${company.id}`, date: company.createdAt, label: "Initial balance", detail: "Opening cash position", amount: new Prisma.Decimal(company.initialBalance), type: "Opening" },
    ...payments.map((payment) => ({ id: payment.id, date: payment.paidAt, label: `Payment · ${payment.invoice.number}`, detail: payment.invoice.contact.name, amount: new Prisma.Decimal(payment.amount), type: "Customer payment" })),
    ...expenses.map((expense) => ({ id: expense.id, date: expense.paidAt ?? expense.updatedAt, label: expense.description, detail: expense.category, amount: new Prisma.Decimal(expense.amount).negated(), type: "Expense payment" })),
    ...adjustments.map((adjustment) => ({ id: adjustment.id, date: adjustment.adjustmentDate, label: adjustment.reason, detail: `Traceable correction by ${adjustment.createdBy.name}`, amount: new Prisma.Decimal(adjustment.amount), type: "Cash adjustment" })),
  ];
  return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
}
