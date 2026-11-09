import Link from "next/link";
import { ContactType } from "@prisma/client";
import { createInvoice } from "@/lib/actions/invoices";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabels, invoiceStatusTone } from "@/lib/invoices";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { error, success } = await searchParams;
  const [invoices, clients] = await Promise.all([
    db.invoice.findMany({ where: { companyId: company.id }, include: { contact: true }, orderBy: { createdAt: "desc" } }),
    db.contact.findMany({ where: { companyId: company.id, type: ContactType.CLIENT }, orderBy: { name: "asc" } }),
  ]);
  const defaultDueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Invoices" description="Create drafts, validate them and keep a traceable cancellation history." />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="contacts-layout">
        <Card>
          {invoices.length === 0 ? <EmptyState title="No invoices yet" detail="Create a draft for a client. Its number is assigned when you validate it." /> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Invoice</th><th>Client</th><th>Due date</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>{invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.number ?? "Draft"}</strong></td><td>{invoice.contact.name}</td><td>{formatDate(invoice.dueDate)}</td><td>{formatMoney(invoice.total)}</td>
                  <td><StatusBadge tone={invoiceStatusTone(invoice.status)}>{invoiceStatusLabels[invoice.status]}</StatusBadge></td>
                  <td><Link className="table-link" href={`/invoices/${invoice.id}`}>Open</Link></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
        <Card title="New draft invoice">
          {clients.length === 0 ? <p className="muted">Add a client first on the <Link className="table-link" href="/contacts">Clients & suppliers</Link> page.</p> : (
            <form action={createInvoice} className="form-stack">
              <label>Client<select name="contactId" required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
              <label>Total (DT)<input name="total" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label>
              <label>Due date<input name="dueDate" type="date" defaultValue={defaultDueDate} required /></label>
              <label>Notes <span className="field-hint">Optional</span><textarea name="notes" /></label>
              <SubmitButton>Save draft</SubmitButton>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
