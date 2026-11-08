import { getCompanyContext, requireManager } from "@/lib/auth";
import { balanceAt, getForecastData } from "@/lib/forecast";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { sumMoney } from "@/lib/money";

export default async function ForecastsPage() {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const forecast = await getForecastData(company.id);
  const expectedIncome = sumMoney(forecast.flows.filter((flow) => flow.kind === "INCOME").map((flow) => flow.amount));
  const plannedExpenses = sumMoney(forecast.flows.filter((flow) => flow.kind === "EXPENSE").map((flow) => flow.amount));
  const negativePeriods = forecast.points.filter((point) => point.balance.isNegative());
  return (
    <>
      <PageHeader title="Cash forecasts" description={`Projection from the real balance on ${formatDate(forecast.referenceDate)}, using only remaining amounts and expected dates.`} />
      <div className="stats-grid">
        {[30, 60, 90].map((days) => <Card className="stat-card" key={days}><span className="stat-label">IN {days} DAYS · {formatDate(forecast.points[days].date).toUpperCase()}</span><strong className={`stat-value ${balanceAt(forecast.points, days).isNegative() ? "negative" : ""}`}>{formatMoney(balanceAt(forecast.points, days))}</strong><span className="stat-detail">Projected cash balance</span></Card>)}
      </div>
      <div className="stats-grid stats-grid-two">
        <Card className="stat-card"><span className="stat-label">EXPECTED RECEIPTS</span><strong className="stat-value positive">+{formatMoney(expectedIncome)}</strong><span className="stat-detail">Unpaid invoice balances only</span></Card>
        <Card className="stat-card"><span className="stat-label">PLANNED EXPENSES</span><strong className="stat-value negative">-{formatMoney(plannedExpenses)}</strong><span className="stat-detail">Approved and unpaid only</span></Card>
      </div>
      {negativePeriods.length > 0 && <div className="form-message error"><strong>Cash shortage predicted</strong><br />The balance becomes negative on {formatDate(negativePeriods[0].date)}. Lowest projected balance: {formatMoney(negativePeriods.reduce((lowest, point) => point.balance.lt(lowest.balance) ? point : lowest).balance)}.</div>}
      <div className="forecast-layout">
        <Card title="Dated forecast assumptions">
          {forecast.flows.length === 0 ? <EmptyState title="No expected movements" detail="Validated unpaid invoices and approved unpaid expenses will appear here." /> : <div className="table-wrap"><table><thead><tr><th>Expected date</th><th>Movement</th><th>Source</th><th>Amount</th></tr></thead><tbody>
            {forecast.flows.map((flow) => <tr key={`${flow.source}-${flow.id}`}><td>{formatDate(flow.date)}</td><td>{flow.label}</td><td><StatusBadge tone={flow.kind === "INCOME" ? "info" : "warning"}>{flow.kind === "INCOME" ? "Expected receipt" : "Planned expense"}</StatusBadge></td><td className={flow.kind === "INCOME" ? "positive" : "negative"}>{flow.kind === "INCOME" ? "+" : "−"}{formatMoney(flow.amount)}</td></tr>)}
          </tbody></table></div>}
        </Card>
        <Card title="Calculation & assumptions">
          <ol className="assumption-list">
            <li>Start with the real cash balance: <strong>{formatMoney(forecast.referenceBalance)}</strong>.</li>
            <li>Add only the remaining amounts of validated invoices on their due dates.</li>
            <li>Subtract approved, unpaid expenses on their expected dates.</li>
            <li>Overdue amounts are expected from today.</li>
          </ol>
          <p className="muted">Draft and cancelled invoices, pending or refused expenses, paid expenses and payments already received are excluded from future flows.</p>
        </Card>
      </div>
    </>
  );
}
