"use server";

import { ContactType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction, logAudit } from "@/lib/audit";
import { BusinessRuleError } from "@/lib/businessRules";
import { cancelInvoiceRecord, validateInvoiceRecord } from "@/lib/invoiceService";
import { parseMoney } from "@/lib/money";

function errorRedirect(message: string, invoiceId?: string): never {
  redirect(`${invoiceId ? `/invoices/${invoiceId}` : "/invoices"}?error=${encodeURIComponent(message)}`);
}

export async function createInvoice(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const contactId = String(formData.get("contactId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  let total;
  try {
    total = parseMoney(formData.get("total"));
  } catch (error) {
    errorRedirect((error as Error).message);
  }
  const contact = await db.contact.findFirst({ where: { id: contactId, companyId: company.id, type: ContactType.CLIENT } });
  if (!contact) errorRedirect("Choose a client from this company.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(new Date(`${dueDate}T00:00:00`).getTime())) {
    errorRedirect("Choose a valid due date.");
  }

  const invoice = await db.invoice.create({
    data: { companyId: company.id, contactId, total, dueDate: new Date(`${dueDate}T00:00:00.000Z`), notes },
  });
  await logAudit({ companyId: company.id, userId: user.id, action: AuditAction.INVOICE_CREATED, entity: "Invoice", entityId: invoice.id, details: `Draft for ${contact.name} · ${total.toFixed(2)} DT` });
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?success=Draft invoice created.`);
}

export async function validateInvoice(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  try {
    await validateInvoiceRecord(db, { companyId: company.id, invoiceId, userId: user.id });
  } catch (error) {
    errorRedirect(error instanceof BusinessRuleError ? error.message : "The invoice could not be validated. Please try again.", invoiceId);
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}?success=Invoice validated.`);
}

export async function cancelInvoice(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  try {
    await cancelInvoiceRecord(db, { companyId: company.id, invoiceId, userId: user.id, reason });
  } catch (error) {
    errorRedirect(error instanceof BusinessRuleError ? error.message : "The invoice could not be cancelled. Please try again.", invoiceId);
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}?success=Invoice cancelled and reason recorded.`);
}
