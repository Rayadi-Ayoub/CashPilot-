import { describe, expect, it } from "vitest";
import { InvoiceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessRuleError } from "@/lib/businessRules";
import { recordPayment } from "@/lib/paymentService";
import { invoiceRemaining } from "@/lib/payments";
import { createCompany, createInvoice, dt } from "./fixtures";

// Intégration : logique de paiement ↔ base SQLite réelle (ISO 25010 – 6.1 aptitude fonctionnelle).
describe("Paiements clients (intégration avec la base)", () => {
  it("RM1 – un paiement partiel diminue le reste dû et écrit une ligne d'audit", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "3000.00");

    const payment = await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("1000.00"), paidAt: new Date(), method: "Bank transfer" });

    const reloaded = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { payments: true } });
    expect(invoiceRemaining(reloaded).toFixed(2)).toBe("2000.00");
    const audit = await db.auditLog.findMany({ where: { companyId: company.id, action: "PAYMENT_RECORDED" } });
    expect(audit).toHaveLength(1);
    expect(audit[0].entityId).toBe(payment.id);
    expect(audit[0].userId).toBe(owner.id);
  });

  it("RM1 – un paiement supérieur au reste dû est refusé, sans rien écrire", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "400.00");
    await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("150.00"), paidAt: new Date(), method: "Cash" });

    await expect(
      recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("250.01"), paidAt: new Date(), method: "Cash" }),
    ).rejects.toThrow(/remaining amount of 250.00 DT/);

    expect(await db.payment.count({ where: { invoiceId: invoice.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { companyId: company.id, action: "PAYMENT_RECORDED" } })).toBe(1);
  });

  it("RM1 – le paiement exact du reste dû solde la facture", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "400.00");
    await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("150.00"), paidAt: new Date(), method: "Cash" });
    await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("250.00"), paidAt: new Date(), method: "Cash" });
    const reloaded = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { payments: true } });
    expect(invoiceRemaining(reloaded).isZero()).toBe(true);
  });

  it("Workflow – impossible de payer une facture en brouillon", async () => {
    const { company, owner, client } = await createCompany();
    const draft = await createInvoice(company.id, client.id, "500.00", InvoiceStatus.DRAFT);
    await expect(
      recordPayment(db, { companyId: company.id, invoiceId: draft.id, recordedById: owner.id, amount: dt("100.00"), paidAt: new Date(), method: "Cash" }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(await db.payment.count({ where: { invoiceId: draft.id } })).toBe(0);
  });

  it("RM6 – un montant nul ou négatif est refusé", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "500.00");
    for (const amount of ["0", "-10.00"]) {
      await expect(
        recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt(amount), paidAt: new Date(), method: "Cash" }),
      ).rejects.toBeInstanceOf(BusinessRuleError);
    }
  });

  it("Sécurité – une entreprise ne peut pas payer la facture d'une autre entreprise", async () => {
    const first = await createCompany();
    const second = await createCompany();
    const invoice = await createInvoice(first.company.id, first.client.id, "500.00");
    await expect(
      recordPayment(db, { companyId: second.company.id, invoiceId: invoice.id, recordedById: second.owner.id, amount: dt("100.00"), paidAt: new Date(), method: "Cash" }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(await db.payment.count({ where: { invoiceId: invoice.id } })).toBe(0);
  });
});
