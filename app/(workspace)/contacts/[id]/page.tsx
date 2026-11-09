import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactType } from "@prisma/client";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { id } = await params;
  const contact = await db.contact.findFirst({ where: { id, companyId: company.id } });
  if (!contact) notFound();
  return (
    <>
      <Link className="back-link" href="/contacts">← Back to contacts</Link>
      <PageHeader title={contact.name} description={`Contact since ${formatDate(contact.createdAt)}`} action={<StatusBadge tone={contact.type === ContactType.CLIENT ? "info" : "neutral"}>{contact.type === ContactType.CLIENT ? "Client" : "Supplier"}</StatusBadge>} />
      <Card title="Contact details">
        <dl className="detail-grid">
          <div><dt>Email</dt><dd>{contact.email || "Not provided"}</dd></div>
          <div><dt>Phone</dt><dd>{contact.phone || "Not provided"}</dd></div>
          <div><dt>Address</dt><dd>{contact.address || "Not provided"}</dd></div>
        </dl>
      </Card>
    </>
  );
}
