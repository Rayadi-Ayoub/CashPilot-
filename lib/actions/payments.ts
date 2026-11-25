"use server";

import { BusinessRuleError } from "@/lib/businessRules";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { recordPayment } from "@/lib/paymentService";

function paymentError(message: string, invoiceId?: string): never {
  redirect(`${invoiceId ? `/invoices/${invoiceId}` : "/payments"}?error=${encodeURIComponent(message)}`);
}

export async function createPayment(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const paymentDate = String(formData.get("paymentDate") ?? "");
  const method = String(formData.get("method") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  let amount;
  try {
    amount = parseMoney(formData.get("amount"));
  } catch (error) {
    paymentError((error as Error).message, invoiceId);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(new Date(`${paymentDate}T00:00:00`).getTime())) {
    paymentError("Choose a valid payment date.", invoiceId);
  }
  if (!method) paymentError("Choose a payment method.", invoiceId);

  try {
    await recordPayment(db, {
      companyId: company.id,
      invoiceId,
      recordedById: user.id,
      amount,
      paidAt: new Date(`${paymentDate}T00:00:00.000Z`),
      method,
      reference,
    });
  } catch (error) {
    const message = error instanceof BusinessRuleError ? error.message : "The payment could not be recorded. Please try again.";
    paymentError(message, invoiceId);
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}?success=Payment recorded and remaining amount updated.`);
}
