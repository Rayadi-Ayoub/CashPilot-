import Link from "next/link";
import { InvoiceStatus } from "@prisma/client";
import { createSimulation } from "@/lib/actions/simulations";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoiceRemaining } from "@/lib/payments";
import { getSimulationComparison } from "@/lib/simulation";
import { formatDate, formatMoney } from "@/lib/format";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ProjectionChart } from "@/components/ProjectionChart";

export default async function SimulationPage({ searchParams }: { searchParams: Promise<{ scenario?: string; error?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { scenario, error } = await searchParams;
  const [invoices, scenarios] = await Promise.all([
    db.invoice.findMany({ where: { companyId: company.id, status: InvoiceStatus.VALIDATED }, include: { contact: true, payments: true }, orderBy: { dueDate: "asc" } }),
    db.simulation.findMany({ where: { companyId: company.id }, include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const unpaidInvoices = invoices.filter((invoice) => invoiceRemaining(invoice).gt(0));
  const selected = scenario ? scenarios.find((item) => item.id === scenario) : scenarios[0];
  const comparison = selected ? await getSimulationComparison(company.id, selected) : null;
  const defaultExpenseDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const defaultIncomeDate = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  const negativeDays = comparison?.simulatedPoints.filter((point) => point.balance.isNegative()) ?? [];
  return (
    <>
      <PageHeader title="What-if simulation" description="Test decisions in a separate scenario and compare them with the unchanged real-cash forecast." />
      {error && <div className="form-message error">{error}</div>}
      <div className="simulation-layout">
        <Card title="New scenario">
          <form action={createSimulation} className="form-stack">
            <label>Scenario name<input name="name" placeholder="Customer pays 20 days late" required /></label>
            <fieldset className="scenario-section"><legend>Delay a customer payment</legend><div className="form-grid"><label>Invoice<select name="delayInvoiceId" defaultValue=""><option value="">No delayed invoice</option>{unpaidInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} · {invoice.contact.name}</option>)}</select></label><label>Delay (days)<input name="delayDays" type="number" min="0" max="365" step="1" defaultValue="0" /></label></div></fieldset>
            <fieldset className="scenario-section"><legend>Add a new expense</legend><label>Label<input name="newExpenseLabel" placeholder="New equipment" /></label><div className="form-grid"><label>Amount (DT)<input name="newExpenseAmount" type="number" min="0.01" step="0.01" /></label><label>Date<input name="newExpenseDate" type="date" defaultValue={defaultExpenseDate} /></label></div></fieldset>
            <fieldset className="scenario-section"><legend>Add expected income</legend><label>Label<input name="expectedIncomeLabel" placeholder="Expected funding" /></label><div className="form-grid"><label>Amount (DT)<input name="expectedIncomeAmount" type="number" min="0.01" step="0.01" /></label><label>Date<input name="expectedIncomeDate" type="date" defaultValue={defaultIncomeDate} /></label></div></fieldset>
            <SubmitButton>Run and save simulation</SubmitButton>
          </form>
        </Card>
        <Card title={`Saved scenarios · ${scenarios.length}`}>
          {scenarios.length === 0 ? <p className="muted">Your saved comparisons will appear here. They never create real transactions.</p> : <div className="scenario-list">{scenarios.map((item) => <Link className={`scenario-link ${selected?.id === item.id ? "active" : ""}`} key={item.id} href={`/simulation?scenario=${item.id}`}><strong>{item.name}</strong><span>{formatDate(item.createdAt)} · {item.createdBy.name}</span></Link>)}</div>}
        </Card>
      </div>
      {selected && comparison && <div className="simulation-results">
        <div className="results-heading"><div><p className="eyebrow">SCENARIO COMPARISON</p><h2>{selected.name}</h2></div><StatusBadge tone="info">Simulation only</StatusBadge></div>
        <Card><ProjectionChart baseline={comparison.points} simulated={comparison.simulatedPoints} /></Card>
        <div className="stats-grid">{[30, 60, 90].map((days) => {
          const baseline = comparison.points[days].balance;
          const simulated = comparison.simulatedPoints[days].balance;
          return <Card className="stat-card" key={days}><span className="stat-label">DAY {days}</span><strong className={`stat-value ${simulated.isNegative() ? "negative" : ""}`}>{formatMoney(simulated)}</strong><span className="stat-detail">Initial: {formatMoney(baseline)}</span><span className={simulated.minus(baseline).isNegative() ? "negative" : "positive"}>Difference: {simulated.minus(baseline).gte(0) ? "+" : ""}{formatMoney(simulated.minus(baseline))}</span></Card>;
        })}</div>
        {negativeDays.length > 0 && <div className="form-message error"><strong>Simulated cash shortage</strong><br />The simulated balance first becomes negative on {formatDate(negativeDays[0].date)}. Adjust the dates or amounts to compare another decision.</div>}
        <Card title="Hypotheses used">
          <ul className="hypothesis-list">
            <li>Both projections start from the same real balance: <strong>{formatMoney(comparison.referenceBalance)}</strong> on {formatDate(comparison.referenceDate)}.</li>
            {selected.delayInvoiceId && <li>The selected unpaid invoice is delayed by <strong>{selected.delayDays} days</strong>. Its real due date is unchanged.</li>}
            {selected.newExpenseAmount && <li>Virtual expense: {selected.newExpenseLabel} · {formatMoney(selected.newExpenseAmount)} on {formatDate(selected.newExpenseDate!)}.</li>}
            {selected.expectedIncomeAmount && <li>Virtual income: {selected.expectedIncomeLabel} · {formatMoney(selected.expectedIncomeAmount)} on {formatDate(selected.expectedIncomeDate!)}.</li>}
          </ul>
          <p className="muted">No invoice, payment, expense or real cash movement was created or modified by this scenario.</p>
        </Card>
      </div>}
    </>
  );
}
