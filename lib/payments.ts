import { Prisma } from "@prisma/client";

export function invoiceRemaining(invoice: { total: Prisma.Decimal | number | string; payments: { amount: Prisma.Decimal | number | string }[] }) {
  const paid = invoice.payments.reduce((sum, payment) => sum.plus(payment.amount.toString()), new Prisma.Decimal(0));
  return new Prisma.Decimal(invoice.total.toString()).minus(paid);
}
