import { createCashAdjustment, setInitialBalance } from "@/lib/actions/cash";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { getCashMovements, getRealBalance } from "@/lib/cash";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";

export default async function CashPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role } = await getCompanyContext();
  requireManager(role);
  const { error, success } = await searchParams;
  const [balance, movements, currentCompany, received, spent] = await Promise.all([
    getRealBalance(company.id),
    getCashMovements(company.id),
    db.company.findUniqueOrThrow({ where: { id: company.id } }),
    db.payment.aggregate({ where: { companyId: company.id }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { companyId: company.id, status: "PAID" }, _sum: { amount: true } }),
  ]);
  return (
    <>
      <PageHeader title="Cash balance" description="Realized movements only. Drafts, unpaid invoices and planned expenses do not affect this balance." />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="stats-grid">
        <Card className="stat-card"><span className="stat-label">REAL CASH BALANCE</span><strong className="stat-value">{formatMoney(balance)}</strong><span className="stat-detail">Initial balance + realized movements</span></Card>
        <Card className="stat-card"><span className="stat-label">CUSTOMER PAYMENTS</span><strong className="stat-value positive">+{formatMoney(received._sum.amount ?? 0)}</strong><span className="stat-detail">All recorded receipts</span></Card>
        <Card className="stat-card"><span className="stat-label">PAID EXPENSES</span><strong className="stat-value negative">-{formatMoney(spent._sum.amount ?? 0)}</strong><span className="stat-detail">Approved and paid only</span></Card>
      </div>
      <div className="cash-layout">
        <Card title="Movement history">
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Movement</th><th>Type</th><th>Amount</th></tr></thead><tbody>
            {movements.map((movement) => <tr key={movement.id}><td>{formatDate(movement.date)}</td><td><strong>{movement.label}</strong><small className="table-subtitle">{movement.detail}</small></td><td>{movement.type}</td><td className={movement.amount.isNegative() ? "negative" : "positive"}><strong>{movement.amount.isNegative() ? "−" : "+"}{formatMoney(movement.amount.abs())}</strong></td></tr>)}
          </tbody></table></div>
        </Card>
        <div className="action-stack">
          {!currentCompany.initialBalanceSetAt && <Card title="Set opening balance"><p className="muted">This can be set once. Later corrections use a traceable adjustment.</p><form action={setInitialBalance} className="form-stack"><label>Initial balance (DT)<input name="initialBalance" type="number" min="0" step="0.01" defaultValue="0.00" required /></label><SubmitButton>Save opening balance</SubmitButton></form></Card>}
          <Card title="Add a cash adjustment"><p className="muted">Use a positive or negative amount. The original operations remain unchanged.</p><form action={createCashAdjustment} className="form-stack"><label>Amount (DT)<input name="amount" type="number" step="0.01" placeholder="-10.00 or 10.00" required /></label><label>Date<input name="adjustmentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Reason<textarea name="reason" required /></label><SubmitButton>Add adjustment</SubmitButton></form></Card>
        </div>
      </div>
    </>
  );
}
