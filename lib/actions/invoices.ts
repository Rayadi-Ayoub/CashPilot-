"use server";

import { ContactType, InvoiceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";

function errorRedirect(message: string, invoiceId?: string): never {
  redirect(`${invoiceId ? `/invoices/${invoiceId}` : "/invoices"}?error=${encodeURIComponent(message)}`);
}

export async function createInvoice(formData: FormData) {
  const { company, role } = await getCompanyContext();
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
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?success=Draft invoice created.`);
}

export async function validateInvoice(formData: FormData) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!invoice || invoice.status !== InvoiceStatus.DRAFT) errorRedirect("Only a draft invoice can be validated.", invoiceId);

  await db.$transaction(async (transaction) => {
    const count = await transaction.invoice.count({ where: { companyId: company.id, number: { not: null } } });
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    await transaction.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.VALIDATED, number, issueDate: new Date(), validatedAt: new Date() },
    });
  });
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?success=Invoice validated.`);
}

export async function cancelInvoice(formData: FormData) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, companyId: company.id } });
  if (!invoice || invoice.status === InvoiceStatus.CANCELLED) errorRedirect("This invoice is already cancelled or unavailable.", invoiceId);
  if (!reason) errorRedirect("A cancellation reason is required to preserve the audit history.", invoiceId);

  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: InvoiceStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason },
  });
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?success=Invoice cancelled and reason recorded.`);
}
