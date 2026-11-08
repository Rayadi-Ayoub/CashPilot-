import Link from "next/link";
import { ContactType } from "@prisma/client";
import { createExpense } from "@/lib/actions/expenses";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseStatusLabels, expenseStatusTone } from "@/lib/expenses";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role, user } = await getCompanyContext();
  const { error, success } = await searchParams;
  const manager = canManage(role);
  const [expenses, suppliers] = await Promise.all([
    db.expense.findMany({ where: { companyId: company.id, ...(manager ? {} : { submittedById: user.id }) }, include: { submittedBy: true, supplier: true }, orderBy: { createdAt: "desc" } }),
    db.contact.findMany({ where: { companyId: company.id, type: ContactType.SUPPLIER }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Expenses" description={manager ? "Review company expenses and their supporting receipts." : "Submit an expense and follow the status of your requests."} />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="contacts-layout">
        <Card title={manager ? `Company expenses · ${expenses.length}` : `My requests · ${expenses.length}`}>
          {expenses.length === 0 ? <EmptyState title="No expenses" detail="Submit an expense with its receipt to start the approval workflow." /> : (
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th>{manager && <th>Submitted by</th>}<th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>
              {expenses.map((expense) => <tr key={expense.id}><td>{formatDate(expense.expenseDate)}</td><td>{expense.category}</td><td><Link className="table-link" href={`/expenses/${expense.id}`}>{expense.description}</Link>{expense.supplier && <small className="table-subtitle">{expense.supplier.name}</small>}</td>{manager && <td>{expense.submittedBy.name}</td>}<td>{formatMoney(expense.amount)}</td><td><StatusBadge tone={expenseStatusTone(expense.status)}>{expenseStatusLabels[expense.status]}</StatusBadge></td><td><Link className="table-link" href={`/receipts/${expense.id}`} target="_blank">View</Link></td></tr>)}
            </tbody></table></div>
          )}
        </Card>
        <Card title="Submit an expense">
          <form action={createExpense} className="form-stack">
            <label>Category<select name="category" defaultValue="Office supplies"><option>Office supplies</option><option>Travel</option><option>Rent</option><option>Utilities</option><option>Services</option><option>Other</option></select></label>
            <label>Description<input name="description" required /></label>
            <div className="form-grid"><label>Amount (DT)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Expense date<input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label></div>
            <label>Supplier <span className="field-hint">Optional</span><select name="supplierId" defaultValue=""><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label>Receipt <span className="field-hint">PDF or image, up to 5 MB</span><input name="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required /></label>
            <SubmitButton>Submit for approval</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
