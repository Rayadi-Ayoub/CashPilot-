import { describe, expect, it } from "vitest";
import { ExpenseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getRealBalance } from "@/lib/cash";
import { logAudit } from "@/lib/audit";
import { recordPayment } from "@/lib/paymentService";
import { createCompany, createInvoice, dt } from "./fixtures";

const receipt = { receiptName: "r.pdf", receiptStoredName: "r.pdf", receiptType: "application/pdf" };

describe("Trésorerie réelle et journal d'audit (intégration)", () => {
  it("Solde réel = solde initial + paiements − dépenses payées + ajustements", async () => {
    const { company, owner, client } = await createCompany("5000.00");
    const invoice = await createInvoice(company.id, client.id, "3000.00");
    await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("1000.00"), paidAt: new Date(), method: "Bank transfer" });
    const base = { companyId: company.id, submittedById: owner.id, category: "Office supplies", description: "Test", expenseDate: new Date(), ...receipt };
    await db.expense.create({ data: { ...base, amount: dt("250.00"), status: ExpenseStatus.PAID, paidAt: new Date() } });
    // Les dépenses approuvées non payées et refusées ne touchent pas la trésorerie réelle.
    await db.expense.create({ data: { ...base, amount: dt("999.00"), status: ExpenseStatus.APPROVED } });
    await db.expense.create({ data: { ...base, amount: dt("90.00"), status: ExpenseStatus.REJECTED } });
    // RM7 : une correction passe par un ajustement traçable.
    await db.cashAdjustment.create({ data: { companyId: company.id, createdById: owner.id, amount: dt("-50.00"), reason: "Bank fees", adjustmentDate: new Date() } });

    expect((await getRealBalance(company.id)).toFixed(2)).toBe("5700.00");
  });

  it("Journal d'audit – enregistre qui, quoi et quand, du plus récent au plus ancien", async () => {
    const { company, owner } = await createCompany();
    await logAudit({ companyId: company.id, userId: owner.id, action: "LOGIN", entity: "User", entityId: owner.id });
    await logAudit({ companyId: company.id, userId: owner.id, action: "CASH_ADJUSTMENT", entity: "CashAdjustment", details: "-50.00 DT · Bank fees" });
    const entries = await db.auditLog.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, include: { user: true } });
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.user.id === owner.id && entry.createdAt instanceof Date)).toBe(true);
    expect(entries.map((entry) => entry.action)).toContain("CASH_ADJUSTMENT");
  });

  it("Journal d'audit – les détails trop longs sont tronqués à 500 caractères", async () => {
    const { company, owner } = await createCompany();
    const entry = await logAudit({ companyId: company.id, userId: owner.id, action: "CONTACT_CREATED", entity: "Contact", details: "x".repeat(800) });
    expect(entry.details).toHaveLength(500);
  });
});
