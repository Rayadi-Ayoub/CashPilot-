import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseStatus, Role } from "@prisma/client";
import { markExpensePaid, reviewExpense } from "@/lib/actions/expenseApproval";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseStatusLabels, expenseStatusTone } from "@/lib/expenses";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ExpenseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role, user } = await getCompanyContext();
  const [{ id }, { error, success }] = await Promise.all([params, searchParams]);
  const expense = await db.expense.findFirst({ where: { id, companyId: company.id, ...(canManage(role) ? {} : { submittedById: user.id }) }, include: { submittedBy: true, supplier: true, reviewedBy: true, paidBy: true } });
  if (!expense) notFound();
  return (
    <>
      <Link className="back-link" href="/expenses">← Back to expenses</Link>
      <PageHeader title={expense.description} description={`${expense.category} · submitted by ${expense.submittedBy.name}`} action={<StatusBadge tone={expenseStatusTone(expense.status)}>{expenseStatusLabels[expense.status]}</StatusBadge>} />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="detail-layout">
        <div className="action-stack">
          <Card title="Expense request">
            <dl className="detail-grid">
              <div><dt>Amount</dt><dd className="money-value">{formatMoney(expense.amount)}</dd></div>
              <div><dt>Expense date</dt><dd>{formatDate(expense.expenseDate)}</dd></div>
              <div><dt>Supplier</dt><dd>{expense.supplier?.name || "No supplier"}</dd></div>
            </dl>
            <div className="invoice-notes"><Link className="button button-secondary" href={`/receipts/${expense.id}`} target="_blank">Open {expense.receiptName}</Link></div>
          </Card>
          {expense.reviewedBy && <Card title="Decision history"><p><strong>{expense.status === ExpenseStatus.REJECTED ? "Refused" : "Approved"} by {expense.reviewedBy.name}</strong></p><p className="muted">{expense.reviewedAt && formatDate(expense.reviewedAt)}</p><p>{expense.reviewNote || "No review note."}</p></Card>}
          {expense.paidBy && expense.paidAt && <Card title="Payment history"><p>Recorded by <strong>{expense.paidBy.name}</strong> on {formatDate(expense.paidAt)}.</p></Card>}
        </div>
        <div className="action-stack">
          {role === Role.OWNER && expense.status === ExpenseStatus.PENDING && <Card title="Review expense"><form action={reviewExpense} className="form-stack"><input type="hidden" name="expenseId" value={expense.id} /><label>Decision note <span className="field-hint">Required for refusal</span><textarea name="note" /></label><div className="button-row"><button className="button button-primary" name="decision" value="APPROVE" type="submit">Approve</button><button className="button button-danger" name="decision" value="REJECT" type="submit">Refuse</button></div></form></Card>}
          {canManage(role) && expense.status === ExpenseStatus.APPROVED && <Card title="Record payment"><p className="muted">Only approved expenses can reach this step.</p><form action={markExpensePaid} className="form-stack"><input type="hidden" name="expenseId" value={expense.id} /><label>Payment date<input name="paymentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><SubmitButton>Mark as paid</SubmitButton></form></Card>}
        </div>
      </div>
    </>
  );
}
