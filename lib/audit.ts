import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

/** Actions sensibles enregistrées dans le journal d'audit (qui a fait quoi, quand). */
export const AuditAction = {
  LOGIN: "LOGIN",
  LOGIN_FAILED: "LOGIN_FAILED",
  REGISTER: "REGISTER",
  MEMBER_ADDED: "MEMBER_ADDED",
  CONTACT_CREATED: "CONTACT_CREATED",
  INVOICE_CREATED: "INVOICE_CREATED",
  INVOICE_VALIDATED: "INVOICE_VALIDATED",
  INVOICE_CANCELLED: "INVOICE_CANCELLED",
  PAYMENT_RECORDED: "PAYMENT_RECORDED",
  EXPENSE_SUBMITTED: "EXPENSE_SUBMITTED",
  EXPENSE_APPROVED: "EXPENSE_APPROVED",
  EXPENSE_REJECTED: "EXPENSE_REJECTED",
  EXPENSE_PAID: "EXPENSE_PAID",
  OPENING_BALANCE_SET: "OPENING_BALANCE_SET",
  CASH_ADJUSTMENT: "CASH_ADJUSTMENT",
} as const;

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

export const auditActionLabels: Record<AuditActionName, string> = {
  LOGIN: "Sign-in",
  LOGIN_FAILED: "Failed sign-in",
  REGISTER: "Company created",
  MEMBER_ADDED: "Member added",
  CONTACT_CREATED: "Contact created",
  INVOICE_CREATED: "Invoice created",
  INVOICE_VALIDATED: "Invoice validated",
  INVOICE_CANCELLED: "Invoice cancelled",
  PAYMENT_RECORDED: "Payment recorded",
  EXPENSE_SUBMITTED: "Expense submitted",
  EXPENSE_APPROVED: "Expense approved",
  EXPENSE_REJECTED: "Expense refused",
  EXPENSE_PAID: "Expense paid",
  OPENING_BALANCE_SET: "Opening balance set",
  CASH_ADJUSTMENT: "Cash adjustment",
};

export type AuditInput = {
  companyId: string;
  userId: string;
  action: AuditActionName;
  entity: string;
  entityId?: string;
  details?: string;
};

type AuditClient = Prisma.TransactionClient | PrismaClient;

/**
 * Écrit une ligne dans le journal d'audit.
 * À l'intérieur d'une transaction, passer le client de transaction pour que
 * l'action et sa trace soient validées (ou annulées) ensemble.
 */
export async function logAudit(input: AuditInput, client: AuditClient = db) {
  return client.auditLog.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? "",
      details: (input.details ?? "").slice(0, 500),
    },
  });
}
