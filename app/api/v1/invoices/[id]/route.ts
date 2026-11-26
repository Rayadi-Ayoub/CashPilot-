import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiManager } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiManager();
  if (auth.error) return auth.error;
  const { company } = auth;
  const { id } = await params;

  const invoice = await db.invoice.findFirst({
    where: { id, companyId: company.id },
    include: {
      contact: true,
      payments: { include: { recordedBy: true }, orderBy: { paidAt: "desc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const paid = invoice.payments.reduce(
    (sum: Prisma.Decimal, p) => sum.plus(p.amount),
    new Prisma.Decimal(0)
  );
  const remaining = new Prisma.Decimal(invoice.total.toString()).minus(paid);

  return NextResponse.json({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    total: Number(invoice.total),
    remaining: Number(remaining),
    contact: { id: invoice.contact.id, name: invoice.contact.name },
    dueDate: invoice.dueDate,
    issueDate: invoice.issueDate,
    notes: invoice.notes,
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      paidAt: p.paidAt,
      recordedBy: p.recordedBy.name,
    })),
    createdAt: invoice.createdAt,
  });
}
