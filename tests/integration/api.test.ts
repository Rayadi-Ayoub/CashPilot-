import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { recordPayment } from "@/lib/paymentService";
import { createCompany, createInvoice, dt } from "./fixtures";

// Le cookie de session lu par l'API est simulé : chaque test choisit qui appelle.
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "cashpilot_session" && session.token ? { value: session.token } : undefined),
  }),
}));

import { GET as listInvoices } from "@/app/api/v1/invoices/route";
import { GET as getInvoice } from "@/app/api/v1/invoices/[id]/route";

async function signIn(userId: string) {
  const token = randomUUID();
  await db.session.create({ data: { token, userId, expiresAt: new Date(Date.now() + 3600_000) } });
  session.token = token;
}

const detail = (id: string) => getInvoice(new Request(`http://localhost/api/v1/invoices/${id}`), { params: Promise.resolve({ id }) });

// API REST (ISO 25010 – 6.3) et contrôle d'accès (6.6, OWASP A01).
describe("API REST /api/v1/invoices", () => {
  beforeEach(() => {
    session.token = undefined;
  });

  it("401 en JSON sans session (pas de redirection vers /login)", async () => {
    const response = await listInvoices();
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ error: "Authentication required." });
  });

  it("401 avec une session expirée", async () => {
    const { owner } = await createCompany();
    const token = randomUUID();
    await db.session.create({ data: { token, userId: owner.id, expiresAt: new Date(Date.now() - 1000) } });
    session.token = token;
    expect((await listInvoices()).status).toBe(401);
  });

  it("403 pour un collaborateur, sur la liste et sur le détail", async () => {
    const { company, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "500.00");
    const collaborator = await db.user.create({ data: { name: "Collab", email: `collab-${randomUUID()}@test.local`, passwordHash: "x" } });
    await db.membership.create({ data: { userId: collaborator.id, companyId: company.id, role: Role.COLLABORATOR } });
    await signIn(collaborator.id);

    expect((await listInvoices()).status).toBe(403);
    expect((await detail(invoice.id)).status).toBe(403);
  });

  it("200 pour l'Owner : uniquement les factures de son entreprise", async () => {
    const mine = await createCompany();
    const other = await createCompany();
    const myInvoice = await createInvoice(mine.company.id, mine.client.id, "300.00");
    const otherInvoice = await createInvoice(other.company.id, other.client.id, "900.00");
    await signIn(mine.owner.id);

    const response = await listInvoices();
    expect(response.status).toBe(200);
    const ids = ((await response.json()) as { id: string }[]).map((invoice) => invoice.id);
    expect(ids).toContain(myInvoice.id);
    expect(ids).not.toContain(otherInvoice.id);
  });

  it("404 pour la facture d'une autre entreprise ou une facture inconnue", async () => {
    const mine = await createCompany();
    const other = await createCompany();
    const otherInvoice = await createInvoice(other.company.id, other.client.id, "900.00");
    await signIn(mine.owner.id);

    expect((await detail(otherInvoice.id)).status).toBe(404);
    expect((await detail("invoice-inexistante")).status).toBe(404);
  });

  it("200 sur le détail : reste dû = total − paiements (RM1)", async () => {
    const { company, owner, client } = await createCompany();
    const invoice = await createInvoice(company.id, client.id, "1000.00");
    await recordPayment(db, { companyId: company.id, invoiceId: invoice.id, recordedById: owner.id, amount: dt("350.00"), paidAt: new Date(), method: "Cash" });
    await signIn(owner.id);

    const response = await detail(invoice.id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(1000);
    expect(body.remaining).toBe(650);
    expect(body.payments).toHaveLength(1);
  });
});
