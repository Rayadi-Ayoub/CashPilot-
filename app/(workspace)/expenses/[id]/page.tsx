import Link from "next/link";
import { notFound } from "next/navigation";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseStatusLabels, expenseStatusTone } from "@/lib/expenses";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { company, role, user } = await getCompanyContext();
  const { id } = await params;
  const expense = await db.expense.findFirst({ where: { id, companyId: company.id, ...(canManage(role) ? {} : { submittedById: user.id }) }, include: { submittedBy: true, supplier: true } });
  if (!expense) notFound();
  return (
    <>
      <Link className="back-link" href="/expenses">← Back to expenses</Link>
      <PageHeader title={expense.description} description={`${expense.category} · submitted by ${expense.submittedBy.name}`} action={<StatusBadge tone={expenseStatusTone(expense.status)}>{expenseStatusLabels[expense.status]}</StatusBadge>} />
      <Card title="Expense request">
        <dl className="detail-grid">
          <div><dt>Amount</dt><dd className="money-value">{formatMoney(expense.amount)}</dd></div>
          <div><dt>Expense date</dt><dd>{formatDate(expense.expenseDate)}</dd></div>
          <div><dt>Supplier</dt><dd>{expense.supplier?.name || "No supplier"}</dd></div>
        </dl>
        <div className="invoice-notes"><Link className="button button-secondary" href={`/receipts/${expense.id}`} target="_blank">Open {expense.receiptName}</Link></div>
      </Card>
    </>
  );
}
