import { randomUUID } from "node:crypto";
import { ContactType, InvoiceStatus, Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";

/** Crée une entreprise isolée (owner + client) pour un test, avec un solde initial. */
export async function createCompany(initialBalance = "5000.00") {
  const id = randomUUID().slice(0, 8);
  const owner = await db.user.create({ data: { name: `Owner ${id}`, email: `owner-${id}@test.local`, passwordHash: "not-used" } });
  const company = await db.company.create({
    data: {
      name: `Test company ${id}`,
      initialBalance,
      initialBalanceSetAt: new Date(),
      memberships: { create: { userId: owner.id, role: Role.OWNER } },
    },
  });
  const client = await db.contact.create({ data: { companyId: company.id, type: ContactType.CLIENT, name: `Client ${id}` } });
  return { company, owner, client };
}

/** Crée une facture validée (ou brouillon) pour l'entreprise donnée. */
export async function createInvoice(companyId: string, contactId: string, total: string, status: InvoiceStatus = InvoiceStatus.VALIDATED) {
  const validated = status === InvoiceStatus.VALIDATED;
  return db.invoice.create({
    data: {
      companyId,
      contactId,
      total: new Prisma.Decimal(total),
      dueDate: new Date(Date.now() + 30 * 86400000),
      status,
      ...(validated ? { number: `INV-TEST-${randomUUID().slice(0, 8)}`, issueDate: new Date(), validatedAt: new Date() } : {}),
    },
  });
}

export const dt = (value: string) => new Prisma.Decimal(value);
