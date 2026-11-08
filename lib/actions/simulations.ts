"use server";

import { InvoiceStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";

function simulationError(message: string): never {
  redirect(`/simulation?error=${encodeURIComponent(message)}`);
}

function optionalAmount(value: FormDataEntryValue | null, label: string) {
  if (!String(value ?? "").trim()) return null;
  try {
    return parseMoney(value);
  } catch {
    simulationError(`Enter a valid ${label}.`);
  }
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00`).getTime())) return null;
  return new Date(`${text}T00:00:00.000Z`);
}

export async function createSimulation(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const name = String(formData.get("name") ?? "").trim();
  const delayInvoiceId = String(formData.get("delayInvoiceId") ?? "");
  const delayDays = Number(String(formData.get("delayDays") ?? "0"));
  const newExpenseAmount = optionalAmount(formData.get("newExpenseAmount"), "new expense amount");
  const expectedIncomeAmount = optionalAmount(formData.get("expectedIncomeAmount"), "expected income amount");
  const newExpenseDate = optionalDate(formData.get("newExpenseDate"));
  const expectedIncomeDate = optionalDate(formData.get("expectedIncomeDate"));
  if (!name) simulationError("Give this scenario a clear name.");
  if (!Number.isInteger(delayDays) || delayDays < 0 || delayDays > 365) simulationError("The customer delay must be a whole number between 0 and 365 days.");
  if (delayInvoiceId && !(await db.invoice.findFirst({ where: { id: delayInvoiceId, companyId: company.id, status: InvoiceStatus.VALIDATED } }))) simulationError("Choose an invoice from this company.");
  if (!delayInvoiceId && delayDays > 0) simulationError("Choose the customer invoice to delay.");
  if (delayInvoiceId && delayDays === 0) simulationError("Enter a delay greater than zero, or leave the invoice unselected.");
  if (newExpenseAmount && !newExpenseDate) simulationError("Choose a date for the simulated expense.");
  if (expectedIncomeAmount && !expectedIncomeDate) simulationError("Choose a date for the simulated income.");
  if (!delayInvoiceId && !newExpenseAmount && !expectedIncomeAmount) simulationError("Add at least one what-if assumption.");

  const simulation = await db.simulation.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name,
      delayInvoiceId: delayInvoiceId || null,
      delayDays,
      newExpenseAmount,
      newExpenseDate,
      newExpenseLabel: String(formData.get("newExpenseLabel") ?? "").trim() || "Simulated expense",
      expectedIncomeAmount,
      expectedIncomeDate,
      expectedIncomeLabel: String(formData.get("expectedIncomeLabel") ?? "").trim() || "Simulated income",
    },
  });
  redirect(`/simulation?scenario=${simulation.id}`);
}
