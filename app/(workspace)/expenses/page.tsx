import Link from "next/link";
import { ContactType, ExpenseStatus, Prisma } from "@prisma/client";
import { createExpense } from "@/lib/actions/expenses";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseStatusLabels, expenseStatusTone } from "@/lib/expenses";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";
import { PAGE_SIZE, cleanQuery, dateRange, parsePage } from "@/lib/filters";
import { Pagination } from "@/components/Pagination";

const categories = ["Office supplies", "Travel", "Rent", "Utilities", "Services", "Other"];
type SearchParams = { error?: string; success?: string; q?: string; status?: string; category?: string; from?: string; to?: string; page?: string };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { company, role, user } = await getCompanyContext();
  const params = await searchParams;
  const { error, success } = params;
  const manager = canManage(role);
  const q = cleanQuery(params.q);
  const status = params.status && params.status in ExpenseStatus ? (params.status as ExpenseStatus) : undefined;
  const category = params.category && categories.includes(params.category) ? params.category : undefined;
  const expenseDate = dateRange(params.from, params.to);
  const page = parsePage(params.page);
  // Un collaborateur ne voit que ses propres demandes, même avec des filtres.
  const scope: Prisma.ExpenseWhereInput = { companyId: company.id, ...(manager ? {} : { submittedById: user.id }) };
  const where: Prisma.ExpenseWhereInput = {
    ...scope,
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(expenseDate ? { expenseDate } : {}),
    ...(q ? { OR: [{ description: { contains: q } }, { supplier: { name: { contains: q } } }, { submittedBy: { name: { contains: q } } }] } : {}),
  };
  const [expenses, total, allCount, suppliers] = await Promise.all([
    db.expense.findMany({ where, include: { submittedBy: true, supplier: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.expense.count({ where }),
    db.expense.count({ where: scope }),
    db.contact.findMany({ where: { companyId: company.id, type: ContactType.SUPPLIER }, orderBy: { name: "asc" } }),
  ]);
  const filters = { q, status, category, from: params.from, to: params.to };
  const filtering = Boolean(q || status || category || expenseDate);
  return (
    <>
      <PageHeader title="Expenses" description={manager ? "Review company expenses and their supporting receipts." : "Submit an expense and follow the status of your requests."} />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="contacts-layout">
        <Card title={manager ? `Company expenses · ${allCount}` : `My requests · ${allCount}`}>
          <form className="filter-bar" method="get" role="search">
            <label className="filter-search">Search<input name="q" defaultValue={q} placeholder={manager ? "Description, supplier or employee" : "Description or supplier"} /></label>
            <label>Status<select name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{Object.values(ExpenseStatus).map((value) => <option key={value} value={value}>{expenseStatusLabels[value]}</option>)}</select></label>
            <label>Category<select name="category" defaultValue={category ?? ""}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>From<input name="from" type="date" defaultValue={params.from} /></label>
            <label>To<input name="to" type="date" defaultValue={params.to} /></label>
            <div className="filter-actions"><button className="button button-primary button-small" type="submit">Search</button><Link className="text-button" href="/expenses">Reset</Link></div>
          </form>
          {filtering && <p className="result-count">{total} of {allCount} expenses match</p>}
          {expenses.length === 0 ? <EmptyState title={filtering ? "No matching expenses" : "No expenses"} detail={filtering ? "Try another search, status, category or date range." : "Submit an expense with its receipt to start the approval workflow."} /> : (
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th>{manager && <th>Submitted by</th>}<th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>
              {expenses.map((expense) => <tr key={expense.id}><td>{formatDate(expense.expenseDate)}</td><td>{expense.category}</td><td><Link className="table-link" href={`/expenses/${expense.id}`}>{expense.description}</Link>{expense.supplier && <small className="table-subtitle">{expense.supplier.name}</small>}</td>{manager && <td>{expense.submittedBy.name}</td>}<td>{formatMoney(expense.amount)}</td><td><StatusBadge tone={expenseStatusTone(expense.status)}>{expenseStatusLabels[expense.status]}</StatusBadge></td><td><Link className="table-link" href={`/receipts/${expense.id}`} target="_blank">View</Link></td></tr>)}
            </tbody></table></div>
          )}
          <Pagination base="/expenses" page={page} total={total} pageSize={PAGE_SIZE} params={filters} />
        </Card>
        <Card title="Submit an expense">
          <form action={createExpense} className="form-stack">
            <label>Category<select name="category" defaultValue="Office supplies">{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
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
