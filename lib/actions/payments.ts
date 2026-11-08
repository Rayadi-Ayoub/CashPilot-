"use server";

import { InvoiceStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";
import { invoiceRemaining } from "@/lib/payments";

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
    await db.$transaction(async (transaction) => {
      const invoice = await transaction.invoice.findFirst({ where: { id: invoiceId, companyId: company.id }, include: { payments: true } });
      if (!invoice || invoice.status !== InvoiceStatus.VALIDATED) throw new Error("Payments can only be added to a validated invoice.");
      const remaining = invoiceRemaining(invoice);
      if (amount.gt(remaining)) throw new Error(`Payment exceeds the remaining amount of ${remaining.toFixed(2)} DT.`);
      await transaction.payment.create({
        data: { companyId: company.id, invoiceId, amount, paidAt: new Date(`${paymentDate}T00:00:00.000Z`), method, reference, recordedById: user.id },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    paymentError((error as Error).message, invoiceId);
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}?success=Payment recorded and remaining amount updated.`);
}
