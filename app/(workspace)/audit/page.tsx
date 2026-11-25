import Link from "next/link";
import { Prisma, Role } from "@prisma/client";
import { getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction, auditActionLabels, type AuditActionName } from "@/lib/audit";
import { PAGE_SIZE, cleanQuery, dateRange, parsePage } from "@/lib/filters";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { Pagination } from "@/components/Pagination";

type SearchParams = { action?: string; userId?: string; q?: string; from?: string; to?: string; page?: string };

const actionTone = (action: string): "neutral" | "success" | "warning" | "danger" | "info" => {
  if (action === AuditAction.LOGIN_FAILED || action === AuditAction.INVOICE_CANCELLED || action === AuditAction.EXPENSE_REJECTED) return "danger";
  if (action === AuditAction.PAYMENT_RECORDED || action === AuditAction.EXPENSE_PAID || action === AuditAction.INVOICE_VALIDATED || action === AuditAction.EXPENSE_APPROVED) return "success";
  if (action === AuditAction.CASH_ADJUSTMENT || action === AuditAction.OPENING_BALANCE_SET) return "warning";
  if (action === AuditAction.LOGIN) return "info";
  return "neutral";
};

const formatDateTime = (date: Date) => new Intl.DateTimeFormat("fr-TN", { dateStyle: "short", timeStyle: "medium", timeZone: "Africa/Tunis" }).format(date);

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { company, role } = await getCompanyContext();
  if (role !== Role.OWNER) {
    return (
      <>
        <PageHeader title="Audit log" />
        <div className="form-message error">Only the company owner can view the audit log.</div>
      </>
    );
  }
  const params = await searchParams;
  const action = params.action && params.action in auditActionLabels ? params.action : "";
  const userId = params.userId ?? "";
  const q = cleanQuery(params.q);
  const page = parsePage(params.page);
  const createdAt = dateRange(params.from, params.to);

  const where: Prisma.AuditLogWhereInput = {
    companyId: company.id,
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q ? { OR: [{ details: { contains: q } }, { entity: { contains: q } }, { entityId: { contains: q } }] } : {}),
  };

  const [entries, total, members] = await Promise.all([
    db.auditLog.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.auditLog.count({ where }),
    db.membership.findMany({ where: { companyId: company.id }, include: { user: true }, orderBy: { joinedAt: "asc" } }),
  ]);
  const filters = { action, userId, q, from: params.from, to: params.to };

  return (
    <>
      <PageHeader title="Audit log" description="Who did what, and when: every sensitive action is recorded and cannot be edited." />
      <Card>
        <form className="filter-bar" method="get">
          <label className="filter-search">Search<input name="q" defaultValue={q} placeholder="Invoice number, amount, reason…" /></label>
          <label>Action<select name="action" defaultValue={action}><option value="">All actions</option>{(Object.keys(auditActionLabels) as AuditActionName[]).map((key) => <option key={key} value={key}>{auditActionLabels[key]}</option>)}</select></label>
          <label>User<select name="userId" defaultValue={userId}><option value="">All users</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select></label>
          <label>From<input name="from" type="date" defaultValue={params.from} /></label>
          <label>To<input name="to" type="date" defaultValue={params.to} /></label>
          <div className="filter-actions"><button className="button button-primary button-small" type="submit">Filter</button><Link className="text-button" href="/audit">Reset</Link></div>
        </form>
        <p className="result-count">{total} recorded action{total === 1 ? "" : "s"}</p>
        {entries.length === 0 ? <EmptyState title="No matching actions" detail="Sensitive actions such as validations, payments and approvals will appear here." /> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Date & time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>{entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.createdAt)}</td>
                <td>{entry.user.name}<small className="table-subtitle">{entry.user.email}</small></td>
                <td><StatusBadge tone={actionTone(entry.action)}>{auditActionLabels[entry.action as AuditActionName] ?? entry.action}</StatusBadge></td>
                <td>{entry.entity}</td>
                <td className="audit-details">{entry.details || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <Pagination base="/audit" page={page} total={total} pageSize={PAGE_SIZE} params={filters} />
      </Card>
    </>
  );
}
