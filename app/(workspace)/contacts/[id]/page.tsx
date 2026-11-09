import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactType } from "@prisma/client";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusLabels, invoiceStatusTone } from "@/lib/invoices";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { id } = await params;
  const contact = await db.contact.findFirst({ where: { id, companyId: company.id }, include: { invoices: { orderBy: { createdAt: "desc" } } } });
  if (!contact) notFound();
  return (
    <>
      <Link className="back-link" href="/contacts">← Back to contacts</Link>
      <PageHeader title={contact.name} description={`Contact since ${formatDate(contact.createdAt)}`} action={<StatusBadge tone={contact.type === ContactType.CLIENT ? "info" : "neutral"}>{contact.type === ContactType.CLIENT ? "Client" : "Supplier"}</StatusBadge>} />
      <div className="detail-layout">
        <Card title="Contact details">
          <dl className="detail-grid">
            <div><dt>Email</dt><dd>{contact.email || "Not provided"}</dd></div>
            <div><dt>Phone</dt><dd>{contact.phone || "Not provided"}</dd></div>
            <div><dt>Address</dt><dd>{contact.address || "Not provided"}</dd></div>
          </dl>
        </Card>
        <Card title={`Invoice history · ${contact.invoices.length}`}>
          {contact.invoices.length === 0 ? <EmptyState title="No invoices" detail="Invoices for this contact will appear here." /> : (
            <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Due</th><th>Total</th><th>Status</th></tr></thead><tbody>
              {contact.invoices.map((invoice) => <tr key={invoice.id}><td><Link className="table-link" href={`/invoices/${invoice.id}`}>{invoice.number ?? "Draft"}</Link></td><td>{formatDate(invoice.dueDate)}</td><td>{formatMoney(invoice.total)}</td><td><StatusBadge tone={invoiceStatusTone(invoice.status)}>{invoiceStatusLabels[invoice.status]}</StatusBadge></td></tr>)}
            </tbody></table></div>
          )}
        </Card>
      </div>
    </>
  );
}
