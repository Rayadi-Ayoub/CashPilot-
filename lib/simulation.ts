import { Prisma, Simulation } from "@prisma/client";
import { addDays, buildProjection, ForecastFlow, getForecastData } from "./forecast";

export async function getSimulationComparison(companyId: string, simulation: Simulation) {
  const baseline = await getForecastData(companyId);
  const flows: ForecastFlow[] = baseline.flows.map((flow) => {
    if (flow.source === "INVOICE" && flow.id === simulation.delayInvoiceId) {
      return { ...flow, date: addDays(flow.date, simulation.delayDays), label: `${flow.label} · delayed ${simulation.delayDays} days` };
    }
    return { ...flow };
  });
  if (simulation.newExpenseAmount && simulation.newExpenseDate) {
    flows.push({ id: simulation.id, date: simulation.newExpenseDate, label: simulation.newExpenseLabel, kind: "EXPENSE", amount: new Prisma.Decimal(simulation.newExpenseAmount), source: "SIMULATION" });
  }
  if (simulation.expectedIncomeAmount && simulation.expectedIncomeDate) {
    flows.push({ id: simulation.id, date: simulation.expectedIncomeDate, label: simulation.expectedIncomeLabel, kind: "INCOME", amount: new Prisma.Decimal(simulation.expectedIncomeAmount), source: "SIMULATION" });
  }
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());
  return { ...baseline, simulatedFlows: flows, simulatedPoints: buildProjection(baseline.referenceBalance, flows, baseline.referenceDate) };
}
