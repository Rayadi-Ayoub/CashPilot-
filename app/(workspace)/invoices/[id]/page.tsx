import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";
import { cancelInvoice, validateInvoice } from "@/lib/actions/invoices";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabels, invoiceStatusTone } from "@/lib/invoices";

export default async function InvoiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const [{ id }, { error, success }] = await Promise.all([params, searchParams]);
  const invoice = await db.invoice.findFirst({ where: { id, companyId: company.id }, include: { contact: true } });
  if (!invoice) notFound();
  return (
    <>
      <Link className="back-link" href="/invoices">← Back to invoices</Link>
      <PageHeader title={invoice.number ?? "Draft invoice"} description={invoice.contact.name} action={<StatusBadge tone={invoiceStatusTone(invoice.status)}>{invoiceStatusLabels[invoice.status]}</StatusBadge>} />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="detail-layout">
        <Card title="Invoice details">
          <dl className="detail-grid">
            <div><dt>Total</dt><dd className="money-value">{formatMoney(invoice.total)}</dd></div>
            <div><dt>Due date</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
            <div><dt>Issue date</dt><dd>{invoice.issueDate ? formatDate(invoice.issueDate) : "Not issued"}</dd></div>
          </dl>
          <div className="invoice-notes"><h3>Notes</h3><p>{invoice.notes || "No notes."}</p></div>
          {invoice.cancellationReason && <div className="form-message error"><strong>Cancellation reason</strong><br />{invoice.cancellationReason}<br /><small>{invoice.cancelledAt && formatDate(invoice.cancelledAt)}</small></div>}
          <Link className="button button-secondary" href={`/invoices/${invoice.id}/pdf`}>Export PDF</Link>
        </Card>
        <div className="action-stack">
          {invoice.status === InvoiceStatus.DRAFT && <Card title="Validate invoice"><p className="muted">Validation assigns a permanent invoice number. Financial records are never deleted.</p><form action={validateInvoice}><input type="hidden" name="invoiceId" value={invoice.id} /><SubmitButton>Validate invoice</SubmitButton></form></Card>}
          {invoice.status !== InvoiceStatus.CANCELLED && <Card title="Cancel invoice"><p className="muted">Cancellation keeps the invoice in the history and requires a reason.</p><form action={cancelInvoice} className="form-stack"><input type="hidden" name="invoiceId" value={invoice.id} /><label>Reason<textarea name="reason" required /></label><SubmitButton className="button button-danger">Cancel invoice</SubmitButton></form></Card>}
        </div>
      </div>
    </>
  );
}
