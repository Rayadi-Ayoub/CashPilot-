import { Role } from "@prisma/client";
import { addMember } from "@/lib/actions/auth";
import { getCompanyContext, roleLabels } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate } from "@/lib/format";

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { company, role } = await getCompanyContext();
  const { error, success } = await searchParams;
  const members = await db.membership.findMany({ where: { companyId: company.id }, include: { user: true }, orderBy: { joinedAt: "asc" } });
  return (
    <>
      <PageHeader title="Company & access" description={`Manage ${company.name} and the people who can access its data.`} />
      {error && <div className="form-message error">{error}</div>}
      {success && <div className="form-message success">{success}</div>}
      <div className="two-columns">
        <Card title={`Members · ${members.length}`}>
          <div className="member-list">
            {members.map((member) => (
              <div className="member-row" key={member.id}>
                <div className="avatar">{member.user.name.slice(0, 1).toUpperCase()}</div>
                <div className="member-details"><strong>{member.user.name}</strong><span>{member.user.email}</span><small>Joined {formatDate(member.joinedAt)}</small></div>
                <StatusBadge tone={member.role === Role.OWNER ? "success" : "neutral"}>{roleLabels[member.role]}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
        {role === Role.OWNER ? (
          <Card title="Add a member">
            <p className="muted">If the email is new, CashPilot creates their sign-in account. Existing users keep their current password.</p>
            <form action={addMember} className="form-stack">
              <label>Full name<input name="name" required /></label>
              <label>Email<input type="email" name="email" required /></label>
              <label>Temporary password <span className="field-hint">New users only</span><input type="password" name="password" minLength={8} /></label>
              <label>Role<select name="role" defaultValue={Role.MANAGER}><option value={Role.MANAGER}>Financial manager</option><option value={Role.COLLABORATOR}>Collaborator</option></select></label>
              <SubmitButton>Add member</SubmitButton>
            </form>
          </Card>
        ) : <Card title="Your permissions"><p>You are signed in as <strong>{roleLabels[role]}</strong>. Only the owner can add company members.</p></Card>}
      </div>
    </>
  );
}
