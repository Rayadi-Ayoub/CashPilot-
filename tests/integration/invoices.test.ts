import { describe, expect, it } from "vitest";
import { ContactType, InvoiceStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessRuleError } from "@/lib/businessRules";
import { cancelInvoiceRecord, validateInvoiceRecord } from "@/lib/invoiceService";
import { recordPayment } from "@/lib/paymentService";
import { createCompany, createInvoice, dt } from "./fixtures";

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

describe("Factures : workflow et règles métier (intégration)", () => {
  it("Workflow – un brouillon validé reçoit un numéro INV-AAAA-NNNN et une ligne d'audit", async () => {
    const { company, owner, client } = await createCompany();
    const draft = await createInvoice(company.id, client.id, "800.00", InvoiceStatus.DRAFT);

    const validated = await validateInvoiceRecord(db, { companyId: company.id, invoiceId: draft.id, userId: owner.id });

    expect(validated.status).toBe(InvoiceStatus.VALIDATED);
    expect(validated.number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(await db.auditLog.count({ where: { companyId: company.id, action: "INVOICE_VALIDATED", entityId: draft.id } })).toBe(1);
  });

  it("Workflow – une facture déjà validée ne peut pas être validée une seconde fois", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "800.00");
    await expect(validateInvoiceRecord(db, { companyId: company.id, invoiceId: invoice.id, userId: owner.id })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("RM3 – deux factures ne peuvent pas avoir le même numéro dans une entreprise", async () => {
    const { company, client } = await createCompany();
    const data = { companyId: company.id, contactId: client.id, total: dt("100.00"), dueDate: new Date(), status: InvoiceStatus.VALIDATED, number: "INV-2026-0001" };
    await db.invoice.create({ data });
    const error = await db.invoice.create({ data }).catch((caught: unknown) => caught);
    expect(isUniqueViolation(error)).toBe(true);
  });

  it("RM2 – une facture avec un paiement ne peut pas être annulée", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("100.00"), paidAt: new Date(), method: "Cash" });

    await expect(cancelInvoiceRecord(db, { companyId: company.id, invoiceId: invoice.id, userId: owner.id, reason: "Client error" })).rejects.toThrow(/cannot be cancelled/);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe(InvoiceStatus.VALIDATED);
  });

  it("RM2 – l'annulation exige un motif", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    await expect(cancelInvoiceRecord(db, { companyId: company.id, invoiceId: invoice.id, userId: owner.id, reason: "   " })).rejects.toThrow(/reason is required/);
  });

  it("RM2 – une annulation valide conserve le motif et la trace dans l'audit", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    const cancelled = await cancelInvoiceRecord(db, { companyId: company.id, invoiceId: invoice.id, userId: owner.id, reason: "Order cancelled" });
    expect(cancelled.status).toBe(InvoiceStatus.CANCELLED);
    expect(cancelled.cancellationReason).toBe("Order cancelled");
    const audit = await db.auditLog.findFirstOrThrow({ where: { companyId: company.id, action: "INVOICE_CANCELLED" } });
    expect(audit.details).toContain("Order cancelled");
  });

  it("RM4 – un contact est unique par entreprise, type et nom", async () => {
    const { company } = await createCompany();
    const data = { companyId: company.id, type: ContactType.SUPPLIER, name: "Atlas Office Supplies" };
    await db.contact.create({ data });
    const error = await db.contact.create({ data }).catch((caught: unknown) => caught);
    expect(isUniqueViolation(error)).toBe(true);
  });
});
