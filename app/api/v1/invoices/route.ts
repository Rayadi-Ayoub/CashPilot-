import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiManager } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireApiManager();
  if (auth.error) return auth.error;
  const { company } = auth;

  const invoices = await db.invoice.findMany({
    where: { companyId: company.id },
    include: {
      contact: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    invoices.map((invoice) => {
      const paid = invoice.payments.reduce(
        (sum: Prisma.Decimal, p) => sum.plus(p.amount),
        new Prisma.Decimal(0)
      );
      const remaining = new Prisma.Decimal(invoice.total.toString()).minus(paid);

      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        total: Number(invoice.total),
        remaining: Number(remaining),
        contact: invoice.contact.name,
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
      };
    })
  );
}
