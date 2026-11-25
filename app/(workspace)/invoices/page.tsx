import Link from "next/link";
import { ContactType, InvoiceStatus, Prisma } from "@prisma/client";
import { createInvoice } from "@/lib/actions/invoices";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabels, invoiceStatusTone } from "@/lib/invoices";
import { PAGE_SIZE, cleanQuery, dateRange, parsePage } from "@/lib/filters";
import { Pagination } from "@/components/Pagination";

type SearchParams = { error?: string; success?: string; q?: string; status?: string; from?: string; to?: string; page?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const params = await searchParams;
  const { error, success } = params;
  const q = cleanQuery(params.q);
  const status = params.status && params.status in InvoiceStatus ? (params.status as InvoiceStatus) : undefined;
  const dueDate = dateRange(params.from, params.to);
  const page = parsePage(params.page);
  // Recherche par numéro de facture ou nom du client, filtres par statut et échéance.
  const where: Prisma.InvoiceWhereInput = {
    companyId: company.id,
    ...(status ? { status } : {}),
    ...(dueDate ? { dueDate } : {}),
    ...(q ? { OR: [{ number: { contains: q } }, { contact: { name: { contains: q } } }, { notes: { contains: q } }] } : {}),
  };
  const [invoices, total, allCount, clients] = await Promise.all([
    db.invoice.findMany({ where, include: { contact: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.invoice.count({ where }),
    db.invoice.count({ where: { companyId: company.id } }),
    db.contact.findMany({ where: { companyId: company.id, type: ContactType.CLIENT }, orderBy: { name: "asc" } }),
  ]);
  const filters = { q, status, from: params.from, to: params.to };
  const filtering = Boolean(q || status || dueDate);
  const defaultDueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Invoices" description="Create drafts, validate them and keep a traceable cancellation history." />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="contacts-layout">
        <Card>
          <form className="filter-bar" method="get" role="search">
            <label className="filter-search">Search<input name="q" defaultValue={q} placeholder="Invoice number or client" /></label>
            <label>Status<select name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{Object.values(InvoiceStatus).map((value) => <option key={value} value={value}>{invoiceStatusLabels[value]}</option>)}</select></label>
            <label>Due from<input name="from" type="date" defaultValue={params.from} /></label>
            <label>Due to<input name="to" type="date" defaultValue={params.to} /></label>
            <div className="filter-actions"><button className="button button-primary button-small" type="submit">Search</button><Link className="text-button" href="/invoices">Reset</Link></div>
          </form>
          <p className="result-count">{filtering ? `${total} of ${allCount} invoices match` : `${allCount} invoices`}</p>
          {invoices.length === 0 ? <EmptyState title={filtering ? "No matching invoices" : "No invoices yet"} detail={filtering ? "Try another client, number, status or date range." : "Create a draft for a client. Its number is assigned when you validate it."} /> : (
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
          <Pagination base="/invoices" page={page} total={total} pageSize={PAGE_SIZE} params={filters} />
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
