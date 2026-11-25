import { InvoiceStatus, Prisma, PrismaClient } from "@prisma/client";
import { AuditAction, logAudit } from "./audit";
import { BusinessRuleError } from "./businessRules";
import { invoiceRemaining } from "./payments";

export type RecordPaymentInput = {
  companyId: string;
  invoiceId: string;
  recordedById: string;
  amount: Prisma.Decimal;
  paidAt: Date;
  method: string;
  reference?: string;
};

/**
 * Enregistre un paiement client dans une transaction sérialisable.
 * RM1 : le paiement ne peut jamais dépasser le reste dû, même si deux
 * paiements arrivent en même temps. Le paiement et sa ligne d'audit sont
 * validés ensemble, ou annulés ensemble en cas d'erreur.
 */
export async function recordPayment(client: PrismaClient, input: RecordPaymentInput) {
  if (input.amount.lte(0)) throw new BusinessRuleError("RM6", "The payment amount must be greater than zero.");
  if (!input.method.trim()) throw new BusinessRuleError("RM6", "Choose a payment method.");

  return client.$transaction(async (transaction) => {
    const invoice = await transaction.invoice.findFirst({
      where: { id: input.invoiceId, companyId: input.companyId },
      include: { payments: true },
    });
    if (!invoice || invoice.status !== InvoiceStatus.VALIDATED) {
      throw new BusinessRuleError("RM1", "Payments can only be added to a validated invoice.");
    }
    const remaining = invoiceRemaining(invoice);
    if (input.amount.gt(remaining)) {
      throw new BusinessRuleError("RM1", `Payment exceeds the remaining amount of ${remaining.toFixed(2)} DT.`);
    }
    const payment = await transaction.payment.create({
      data: {
        companyId: input.companyId,
        invoiceId: input.invoiceId,
        recordedById: input.recordedById,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method.trim(),
        reference: (input.reference ?? "").trim(),
      },
    });
    await logAudit({
      companyId: input.companyId,
      userId: input.recordedById,
      action: AuditAction.PAYMENT_RECORDED,
      entity: "Payment",
      entityId: payment.id,
      details: `${input.amount.toFixed(2)} DT on ${invoice.number ?? invoice.id} (${input.method.trim()})`,
    }, transaction);
    return payment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}
