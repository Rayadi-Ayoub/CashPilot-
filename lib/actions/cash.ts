"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

function cashError(message: string): never {
  redirect(`/cash?error=${encodeURIComponent(message)}`);
}

export async function setInitialBalance(formData: FormData) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const value = String(formData.get("initialBalance") ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) cashError("Enter a non-negative opening balance with at most two decimal places.");
  const result = await db.company.updateMany({ where: { id: company.id, initialBalanceSetAt: null }, data: { initialBalance: new Prisma.Decimal(value), initialBalanceSetAt: new Date() } });
  if (result.count !== 1) cashError("The opening balance is already set. Use a traceable cash adjustment for corrections.");
  revalidatePath("/cash");
  redirect("/cash?success=Opening balance saved.");
}

export async function createCashAdjustment(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const value = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const adjustmentDate = String(formData.get("adjustmentDate") ?? "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(value) || new Prisma.Decimal(value).isZero()) cashError("Enter a non-zero adjustment with at most two decimal places.");
  if (!reason) cashError("A reason is required for every correction.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(adjustmentDate) || Number.isNaN(new Date(`${adjustmentDate}T00:00:00`).getTime())) cashError("Choose a valid adjustment date.");
  await db.cashAdjustment.create({ data: { companyId: company.id, createdById: user.id, amount: new Prisma.Decimal(value), reason, adjustmentDate: new Date(`${adjustmentDate}T00:00:00.000Z`) } });
  revalidatePath("/cash");
  redirect("/cash?success=Traceable cash adjustment added.");
}
