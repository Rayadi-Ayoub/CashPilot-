import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { cancelInvoice, validateInvoice } from "@/lib/actions/invoices";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoiceRemaining } from "@/lib/payments";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { PaymentForm } from "@/components/PaymentForm";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabels, invoiceStatusTone } from "@/lib/invoices";

export default async function InvoiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const [{ id }, { error, success }] = await Promise.all([params, searchParams]);
  const invoice = await db.invoice.findFirst({ where: { id, companyId: company.id }, include: { contact: true, payments: { include: { recordedBy: true }, orderBy: { paidAt: "desc" } } } });
  if (!invoice) notFound();
  const remaining = invoiceRemaining(invoice);
  return (
    <>
      <Link className="back-link" href="/invoices">← Back to invoices</Link>
      <PageHeader title={invoice.number ?? "Draft invoice"} description={invoice.contact.name} action={<StatusBadge tone={invoiceStatusTone(invoice.status)}>{invoiceStatusLabels[invoice.status]}</StatusBadge>} />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="detail-layout">
        <div className="action-stack">
          <Card title="Invoice details">
            <dl className="detail-grid">
              <div><dt>Total</dt><dd className="money-value">{formatMoney(invoice.total)}</dd></div>
              <div><dt>Remaining</dt><dd className="money-value">{formatMoney(remaining)}</dd></div>
              <div><dt>Due date</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
            </dl>
            <div className="invoice-notes"><h3>Notes</h3><p>{invoice.notes || "No notes."}</p><p>Issued: {invoice.issueDate ? formatDate(invoice.issueDate) : "Not issued"}</p></div>
            {invoice.cancellationReason && <div className="form-message error"><strong>Cancellation reason</strong><br />{invoice.cancellationReason}<br /><small>{invoice.cancelledAt && formatDate(invoice.cancelledAt)}</small></div>}
            <Link className="button button-secondary" href={`/invoices/${invoice.id}/pdf`}>Export PDF</Link>
          </Card>
          <Card title={`Payment history · ${invoice.payments.length}`}>
            {invoice.payments.length === 0 ? <EmptyState title="No payments" detail="Full and partial payments will appear here." /> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Recorded by</th></tr></thead><tbody>{invoice.payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paidAt)}</td><td>{payment.method}{payment.reference && <small className="table-subtitle">{payment.reference}</small>}</td><td>{formatMoney(payment.amount)}</td><td>{payment.recordedBy.name}</td></tr>)}</tbody></table></div>}
          </Card>
        </div>
        <div className="action-stack">
          {invoice.status === InvoiceStatus.VALIDATED && remaining.gt(0) && <Card title="Record a payment"><PaymentForm invoiceId={invoice.id} /></Card>}
          {invoice.status === InvoiceStatus.VALIDATED && remaining.isZero() && <Card><StatusBadge tone="success">Paid in full</StatusBadge><p className="muted status-detail">All payments are preserved in the invoice history.</p></Card>}
          {invoice.status === InvoiceStatus.DRAFT && <Card title="Validate invoice"><p className="muted">Validation assigns a permanent invoice number. Financial records are never deleted.</p><form action={validateInvoice}><input type="hidden" name="invoiceId" value={invoice.id} /><SubmitButton>Validate invoice</SubmitButton></form></Card>}
          {invoice.status !== InvoiceStatus.CANCELLED && invoice.payments.length === 0 && <Card title="Cancel invoice"><p className="muted">Cancellation keeps the invoice in the history and requires a reason.</p><form action={cancelInvoice} className="form-stack"><input type="hidden" name="invoiceId" value={invoice.id} /><label>Reason<textarea name="reason" required /></label><SubmitButton className="button button-danger">Cancel invoice</SubmitButton></form></Card>}
        </div>
      </div>
    </>
  );
}
