import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoiceRemaining } from "@/lib/payments";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PaymentForm } from "@/components/PaymentForm";
import { formatDate, formatMoney } from "@/lib/format";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { error } = await searchParams;
  const [payments, invoices] = await Promise.all([
    db.payment.findMany({ where: { companyId: company.id }, include: { invoice: { include: { contact: true } }, recordedBy: true }, orderBy: { paidAt: "desc" } }),
    db.invoice.findMany({ where: { companyId: company.id, status: InvoiceStatus.VALIDATED }, include: { contact: true, payments: true }, orderBy: { dueDate: "asc" } }),
  ]);
  const unpaidInvoices = invoices.map((invoice) => ({ id: invoice.id, number: invoice.number, contact: invoice.contact, remaining: invoiceRemaining(invoice).toFixed(2) })).filter((invoice) => Number(invoice.remaining) > 0);
  return (
    <>
      <PageHeader title="Customer payments" description="Record full or partial payments. Each payment immediately reduces its invoice balance." />
      {error && <div className="form-message error">{error}</div>}
      <div className="contacts-layout">
        <Card title={`Payment history · ${payments.length}`}>
          {payments.length === 0 ? <EmptyState title="No payments recorded" detail="Payments will appear here without changing the original invoice." /> : (
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Client</th><th>Method</th><th>Amount</th><th>Recorded by</th></tr></thead><tbody>
              {payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paidAt)}</td><td><Link className="table-link" href={`/invoices/${payment.invoiceId}`}>{payment.invoice.number}</Link></td><td>{payment.invoice.contact.name}</td><td>{payment.method}{payment.reference && <small className="table-subtitle">{payment.reference}</small>}</td><td><strong>+{formatMoney(payment.amount)}</strong></td><td>{payment.recordedBy.name}</td></tr>)}
            </tbody></table></div>
          )}
        </Card>
        <Card title="Record a payment">
          {unpaidInvoices.length === 0 ? <p className="muted">No validated invoice has an outstanding balance.</p> : <PaymentForm invoices={unpaidInvoices} />}
        </Card>
      </div>
    </>
  );
}
