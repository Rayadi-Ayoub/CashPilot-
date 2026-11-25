import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { recordPayment } from "@/lib/paymentService";
import { createCompany, createInvoice, dt } from "./fixtures";

// Fiabilité (ISO 25010 – 6.5) : cohérence après échec, accès concurrents, persistance.
describe("Fiabilité", () => {
  it("Deux paiements simultanés de 700 DT sur une facture de 1000 DT : un seul est accepté", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    const pay = () => recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("700.00"), paidAt: new Date(), method: "Card" });

    const results = await Promise.allSettled([pay(), pay()]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const total = await db.payment.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
    expect(Number(total._sum.amount)).toBe(700);
  });

  it("Cinq paiements simultanés de 300 DT : le total payé ne dépasse jamais la facture", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("300.00"), paidAt: new Date(), method: "Card" })),
    );
    const accepted = results.filter((result) => result.status === "fulfilled").length;
    const total = Number((await db.payment.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } }))._sum.amount ?? 0);

    expect(accepted).toBeGreaterThanOrEqual(1);
    expect(accepted).toBeLessThanOrEqual(3);
    expect(total).toBe(accepted * 300);
    expect(total).toBeLessThanOrEqual(1000);
    // Chaque paiement accepté a exactement une ligne d'audit, aucun refusé n'en a.
    expect(await db.auditLog.count({ where: { companyId: company.id, action: "PAYMENT_RECORDED" } })).toBe(accepted);
  });

  it("Panne au milieu d'une transaction : aucune donnée partielle n'est conservée (rollback)", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");

    await expect(db.$transaction(async (transaction) => {
      await transaction.payment.create({ data: { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("500.00"), paidAt: new Date(), method: "Cash" } });
      await transaction.auditLog.create({ data: { companyId: company.id, userId: owner.id, action: "PAYMENT_RECORDED", entity: "Payment" } });
      throw new Error("Panne simulée après l'écriture");
    })).rejects.toThrow("Panne simulée");

    expect(await db.payment.count({ where: { invoiceId: invoice.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { companyId: company.id } })).toBe(0);
  });

  it("Après une erreur, l'application continue de fonctionner normalement", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    await expect(recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("5000.00"), paidAt: new Date(), method: "Cash" })).rejects.toThrow();
    await expect(recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("1000.00"), paidAt: new Date(), method: "Cash" })).resolves.toBeDefined();
  });

  it("Reprise : les données validées sont relues par un nouveau client après fermeture de la connexion", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    const payment = await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("400.00"), paidAt: new Date(), method: "Cash" });

    // Simule un redémarrage : nouvelle connexion indépendante à la même base.
    const restarted = new PrismaClient();
    try {
      const reloaded = await restarted.payment.findUnique({ where: { id: payment.id } });
      expect(reloaded?.amount.toFixed(2)).toBe("400.00");
      expect(await restarted.auditLog.count({ where: { companyId: company.id, entityId: payment.id } })).toBe(1);
    } finally {
      await restarted.$disconnect();
    }
  });
});
