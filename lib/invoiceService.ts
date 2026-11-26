import { InvoiceStatus, Prisma, PrismaClient } from "@prisma/client";
import { AuditAction, logAudit } from "./audit";
import { BusinessRuleError } from "./businessRules";
import { canCancelInvoice, canValidateInvoice, isValidCancellationReason } from "./invoices";

/**
 * Valide un brouillon : attribue un numéro unique (RM3) et trace l'action.
 */
export async function validateInvoiceRecord(client: PrismaClient, input: { companyId: string; invoiceId: string; userId: string }) {
  return client.$transaction(async (transaction) => {
    const invoice = await transaction.invoice.findFirst({ where: { id: input.invoiceId, companyId: input.companyId } });
    if (!invoice || !canValidateInvoice(invoice.status)) {
      throw new BusinessRuleError("WORKFLOW", "Only a draft invoice can be validated.");
    }
    const count = await transaction.invoice.count({ where: { companyId: input.companyId, number: { not: null } } });
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const updated = await transaction.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.VALIDATED, number, issueDate: new Date(), validatedAt: new Date() },
    });
    await logAudit({ companyId: input.companyId, userId: input.userId, action: AuditAction.INVOICE_VALIDATED, entity: "Invoice", entityId: invoice.id, details: number }, transaction);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}

/**
 * Annule une facture. RM2 : interdit dès qu'un paiement existe, et un motif
 * est obligatoire. La vérification et l'annulation se font dans la même
 * transaction, pour qu'un paiement ne puisse pas arriver entre les deux.
 */
export async function cancelInvoiceRecord(client: PrismaClient, input: { companyId: string; invoiceId: string; userId: string; reason: string }) {
  const reason = input.reason.trim();
  if (!isValidCancellationReason(reason)) throw new BusinessRuleError("RM2", "A cancellation reason is required to preserve the audit history.");
  return client.$transaction(async (transaction) => {
    const invoice = await transaction.invoice.findFirst({ where: { id: input.invoiceId, companyId: input.companyId }, include: { payments: true } });
    if (!invoice || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BusinessRuleError("WORKFLOW", "This invoice is already cancelled or unavailable.");
    }
    if (!canCancelInvoice(invoice.status, invoice.payments.length)) {
      throw new BusinessRuleError("RM2", "An invoice with recorded payments cannot be cancelled. Its payment history must be preserved.");
    }
    const updated = await transaction.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason },
    });
    await logAudit({ companyId: input.companyId, userId: input.userId, action: AuditAction.INVOICE_CANCELLED, entity: "Invoice", entityId: invoice.id, details: `${invoice.number ?? "Draft"} · ${reason}` }, transaction);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}
