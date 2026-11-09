import Link from "next/link";
import { ContactType } from "@prisma/client";
import { createContact } from "@/lib/actions/contacts";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ type?: string; error?: string; success?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { type, error, success } = await searchParams;
  const selectedType = type === ContactType.CLIENT || type === ContactType.SUPPLIER ? type : undefined;
  const contacts = await db.contact.findMany({ where: { companyId: company.id, type: selectedType }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="Clients & suppliers" description="Keep contact details and financial history together." />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="contacts-layout">
        <div>
          <div className="filter-tabs">
            <Link className={!selectedType ? "active" : ""} href="/contacts">All</Link>
            <Link className={selectedType === ContactType.CLIENT ? "active" : ""} href="/contacts?type=CLIENT">Clients</Link>
            <Link className={selectedType === ContactType.SUPPLIER ? "active" : ""} href="/contacts?type=SUPPLIER">Suppliers</Link>
          </div>
          <Card>
            {contacts.length === 0 ? <EmptyState title="No contacts yet" detail="Add your first client or supplier using the form." /> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th></th></tr></thead>
                <tbody>{contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td><strong>{contact.name}</strong></td>
                    <td><StatusBadge tone={contact.type === ContactType.CLIENT ? "info" : "neutral"}>{contact.type === ContactType.CLIENT ? "Client" : "Supplier"}</StatusBadge></td>
                    <td>{contact.email || "—"}</td><td>{contact.phone || "—"}</td>
                    <td><Link className="table-link" href={`/contacts/${contact.id}`}>View</Link></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
        </div>
        <Card title="Add a contact">
          <form action={createContact} className="form-stack">
            <label>Name<input name="name" required /></label>
            <label>Type<select name="type" defaultValue={ContactType.CLIENT}><option value={ContactType.CLIENT}>Client</option><option value={ContactType.SUPPLIER}>Supplier</option></select></label>
            <label>Email <span className="field-hint">Optional</span><input type="email" name="email" /></label>
            <label>Phone <span className="field-hint">Optional</span><input name="phone" /></label>
            <label>Address <span className="field-hint">Optional</span><textarea name="address" /></label>
            <SubmitButton>Add contact</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
