import { Card, PageHeader } from "@/components/ui";
import { getCompanyContext } from "@/lib/auth";

export default async function DashboardPage() {
  const { company } = await getCompanyContext();
  return (
    <>
      <PageHeader title={`Welcome to ${company.name}`} description="Your company workspace is ready." />
      <Card title="CashPilot setup complete">
        <p className="muted">Use Company & access to invite your financial manager and collaborators.</p>
      </Card>
    </>
  );
}
