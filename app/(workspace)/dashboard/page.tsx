import Link from "next/link";
import { ContactType, ExpenseStatus, InvoiceStatus } from "@prisma/client";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { getForecastData } from "@/lib/forecast";
import { invoiceRemaining } from "@/lib/payments";
import { expenseStatusLabels, expenseStatusTone } from "@/lib/expenses";
import { sumMoney } from "@/lib/money";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

const PERIODS = [30, 60, 90] as const;
type SearchParams = { period?: string; client?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { company, role, user } = await getCompanyContext();
  if (!canManage(role)) {
    const requests = await db.expense.findMany({ where: { companyId: company.id, submittedById: user.id }, orderBy: { createdAt: "desc" }, take: 6 });
    const pendingCount = requests.filter((request) => request.status === ExpenseStatus.PENDING).length;
    return (
      <>
        <PageHeader title={`Hello, ${user.name}`} description={`Follow your expense requests for ${company.name}.`} action={<Link className="button button-primary" href="/expenses">Submit an expense</Link>} />
        <div className="stats-grid stats-grid-two"><Card className="stat-card"><span className="stat-label">MY RECENT REQUESTS</span><strong className="stat-value">{requests.length}</strong><span className="stat-detail">Latest six requests</span></Card><Card className="stat-card"><span className="stat-label">AWAITING APPROVAL</span><strong className="stat-value">{pendingCount}</strong><span className="stat-detail">Requests awaiting the owner</span></Card></div>
        <Card title="My expense requests">{requests.length === 0 ? <EmptyState title="No requests yet" detail="Submit an expense with its receipt to start the approval workflow." /> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td>{formatDate(request.expenseDate)}</td><td><Link className="table-link" href={`/expenses/${request.id}`}>{request.description}</Link></td><td>{formatMoney(request.amount)}</td><td><StatusBadge tone={expenseStatusTone(request.status)}>{expenseStatusLabels[request.status]}</StatusBadge></td></tr>)}</tbody></table></div>}</Card>
      </>
    );
  }

  // Filtres du tableau de bord : période (30/60/90 jours) et client.
  const params = await searchParams;
  const period = PERIODS.find((value) => String(value) === params.period) ?? 30;
  const forecast = await getForecastData(company.id);
  const clients = await db.contact.findMany({ where: { companyId: company.id, type: ContactType.CLIENT }, orderBy: { name: "asc" } });
  const clientId = clients.some((client) => client.id === params.client) ? params.client : undefined;
  const periodStart = new Date(forecast.referenceDate.getTime() - period * 24 * 60 * 60 * 1000);
  const [invoices, pendingExpenses, recentPayments, periodPayments] = await Promise.all([
    db.invoice.findMany({ where: { companyId: company.id, status: InvoiceStatus.VALIDATED, ...(clientId ? { contactId: clientId } : {}) }, include: { contact: true, payments: true }, orderBy: { dueDate: "asc" } }),
    db.expense.findMany({ where: { companyId: company.id, status: ExpenseStatus.PENDING }, include: { submittedBy: true }, orderBy: { createdAt: "asc" } }),
    db.payment.findMany({ where: { companyId: company.id, ...(clientId ? { invoice: { contactId: clientId } } : {}) }, include: { invoice: { include: { contact: true } } }, orderBy: { paidAt: "desc" }, take: 5 }),
    db.payment.findMany({ where: { companyId: company.id, paidAt: { gte: periodStart }, ...(clientId ? { invoice: { contactId: clientId } } : {}) }, select: { amount: true } }),
  ]);
  const collectedInPeriod = sumMoney(periodPayments.map((payment) => payment.amount));
  const selectedClient = clients.find((client) => client.id === clientId);
  const outstandingInvoices = invoices.filter((invoice) => invoiceRemaining(invoice).gt(0));
  const overdueInvoices = outstandingInvoices.filter((invoice) => invoice.dueDate < forecast.referenceDate);
  const outstandingAmount = sumMoney(outstandingInvoices.map((invoice) => invoiceRemaining(invoice)));
  const negativeDays = forecast.points.filter((point) => point.balance.isNegative());
  const alertCount = overdueInvoices.length + pendingExpenses.length + (negativeDays.length > 0 ? 1 : 0);
  return (
    <>
      <PageHeader title={`${company.name} overview`} description={`Real cash and upcoming commitments on ${formatDate(forecast.referenceDate)}.`} action={<Link className="button button-primary" href="/invoices">Create an invoice</Link>} />
      <form className="filter-bar" method="get" aria-label="Dashboard filters">
        <label>Period<select name="period" defaultValue={String(period)}>{PERIODS.map((value) => <option key={value} value={value}>Next / last {value} days</option>)}</select></label>
        <label>Client<select name="client" defaultValue={clientId ?? ""}><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <div className="filter-actions"><button className="button button-primary button-small" type="submit">Apply</button><Link className="text-button" href="/dashboard">Reset</Link></div>
      </form>
      <div className="stats-grid dashboard-stats">
        <Card className="stat-card"><span className="stat-label">REAL CASH</span><strong className="stat-value">{formatMoney(forecast.referenceBalance)}</strong><Link className="table-link" href="/cash">View movements →</Link></Card>
        <Card className="stat-card"><span className="stat-label">FORECAST · {period} DAYS</span><strong className={`stat-value ${forecast.points[period].balance.isNegative() ? "negative" : ""}`}>{formatMoney(forecast.points[period].balance)}</strong><Link className="table-link" href="/forecasts">View forecast →</Link></Card>
        <Card className="stat-card"><span className="stat-label">COLLECTED · LAST {period} DAYS</span><strong className="stat-value">{formatMoney(collectedInPeriod)}</strong><span className="stat-detail">{periodPayments.length} payment{periodPayments.length === 1 ? "" : "s"}{selectedClient ? ` · ${selectedClient.name}` : ""}</span></Card>
        <Card className="stat-card"><span className="stat-label">OUTSTANDING INVOICES</span><strong className="stat-value">{formatMoney(outstandingAmount)}</strong><span className="stat-detail">{outstandingInvoices.length} unpaid invoice{outstandingInvoices.length === 1 ? "" : "s"}{selectedClient ? ` · ${selectedClient.name}` : ""}</span></Card>
        <Card className="stat-card"><span className="stat-label">ALERTS</span><strong className={`stat-value ${alertCount > 0 ? "negative" : ""}`}>{alertCount}</strong><span className="stat-detail">Items requiring attention</span></Card>
      </div>
      <div className="dashboard-layout">
        <div className="action-stack">
          <Card title="Alerts requiring attention">
            {alertCount === 0 ? <div className="all-clear"><StatusBadge tone="success">All clear</StatusBadge><p>No overdue invoices, pending approvals or negative forecast.</p></div> : <div className="alert-list">
              {overdueInvoices.map((invoice) => <Link className="alert-row" href={`/invoices/${invoice.id}`} key={invoice.id}><span className="alert-icon">!</span><div><strong>Overdue invoice · {invoice.number}</strong><span>{invoice.contact.name} · due {formatDate(invoice.dueDate)}</span></div><strong>{formatMoney(invoiceRemaining(invoice))}</strong></Link>)}
              {pendingExpenses.map((expense) => <Link className="alert-row warning" href={`/expenses/${expense.id}`} key={expense.id}><span className="alert-icon">!</span><div><strong>Expense awaiting approval</strong><span>{expense.description} · {expense.submittedBy.name}</span></div><strong>{formatMoney(expense.amount)}</strong></Link>)}
              {negativeDays.length > 0 && <Link className="alert-row" href="/forecasts"><span className="alert-icon">!</span><div><strong>Negative forecast balance</strong><span>First negative on {formatDate(negativeDays[0].date)} · review upcoming expenses</span></div><strong>{formatMoney(negativeDays[0].balance)}</strong></Link>}
            </div>}
          </Card>
          <Card title="Recent customer payments">{recentPayments.length === 0 ? <EmptyState title="No payments yet" detail="Recorded customer payments will appear here." /> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Client</th><th>Invoice</th><th>Amount</th></tr></thead><tbody>{recentPayments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paidAt)}</td><td>{payment.invoice.contact.name}</td><td>{payment.invoice.number}</td><td className="positive">+{formatMoney(payment.amount)}</td></tr>)}</tbody></table></div>}</Card>
        </div>
        <Card title="Quick actions"><div className="quick-links"><Link href="/invoices"><strong>Create an invoice</strong><span>Save a draft or validate it</span></Link><Link href="/payments"><strong>Record a payment</strong><span>Full or partial customer receipt</span></Link><Link href="/expenses"><strong>Review expenses</strong><span>Receipts, approval and payment</span></Link><Link href="/simulation"><strong>Run a what-if scenario</strong><span>Compare without changing real data</span></Link></div></Card>
      </div>
    </>
  );
}
