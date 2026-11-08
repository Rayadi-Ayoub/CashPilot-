import { ExpenseStatus, InvoiceStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { getRealBalance } from "./cash";
import { invoiceRemaining } from "./payments";

export type ForecastFlow = {
  id: string;
  date: Date;
  label: string;
  kind: "INCOME" | "EXPENSE";
  amount: Prisma.Decimal;
  source: "INVOICE" | "EXPENSE" | "SIMULATION";
};

export type ProjectionPoint = {
  date: Date;
  balance: Prisma.Decimal;
  income: Prisma.Decimal;
  expense: Prisma.Decimal;
};

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function onOrAfterToday(date: Date, referenceDate = startOfToday()) {
  return date < referenceDate ? referenceDate : date;
}

export async function getForecastData(companyId: string) {
  const referenceDate = startOfToday();
  const [referenceBalance, invoices, expenses] = await Promise.all([
    getRealBalance(companyId),
    db.invoice.findMany({ where: { companyId, status: InvoiceStatus.VALIDATED }, include: { contact: true, payments: true } }),
    db.expense.findMany({ where: { companyId, status: ExpenseStatus.APPROVED } }),
  ]);
  const invoiceFlows = invoices.map((invoice) => ({ invoice, remaining: invoiceRemaining(invoice) })).filter((item) => item.remaining.gt(0)).map((item): ForecastFlow => ({
    id: item.invoice.id,
    date: onOrAfterToday(item.invoice.dueDate, referenceDate),
    label: `${item.invoice.number} · ${item.invoice.contact.name}`,
    kind: "INCOME",
    amount: item.remaining,
    source: "INVOICE",
  }));
  const expenseFlows = expenses.map((expense): ForecastFlow => ({
    id: expense.id,
    date: onOrAfterToday(expense.expenseDate, referenceDate),
    label: expense.description,
    kind: "EXPENSE",
    amount: new Prisma.Decimal(expense.amount),
    source: "EXPENSE",
  }));
  const flows = [...invoiceFlows, ...expenseFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  return { referenceDate, referenceBalance, flows, points: buildProjection(referenceBalance, flows, referenceDate) };
}

export function buildProjection(referenceBalance: Prisma.Decimal, flows: ForecastFlow[], referenceDate: Date, days = 90): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let balance = new Prisma.Decimal(referenceBalance);
  for (let day = 0; day <= days; day += 1) {
    const date = addDays(referenceDate, day);
    const dueFlows = flows.filter((flow) => flow.date.toDateString() === date.toDateString());
    const income = dueFlows.filter((flow) => flow.kind === "INCOME").reduce((sum, flow) => sum.plus(flow.amount), new Prisma.Decimal(0));
    const expense = dueFlows.filter((flow) => flow.kind === "EXPENSE").reduce((sum, flow) => sum.plus(flow.amount), new Prisma.Decimal(0));
    balance = balance.plus(income).minus(expense);
    points.push({ date, balance, income, expense });
  }
  return points;
}

export function balanceAt(points: ProjectionPoint[], days: number) {
  return points[days].balance;
}
