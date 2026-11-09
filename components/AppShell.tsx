import { canManage, getCompanyContext, roleLabels } from "@/lib/auth";
import { logout, switchCompany } from "@/lib/actions/auth";
import { NavLink } from "./NavLink";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, company, role } = await getCompanyContext();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard"><span className="brand-mark">C</span> CashPilot</a>
        <div className="company-picker">
          <span className="sidebar-label">WORKSPACE</span>
          <form action={switchCompany}>
            <select name="companyId" defaultValue={company.id} aria-label="Current company" onChange={undefined}>
              {user.memberships.map((item) => <option key={item.companyId} value={item.companyId}>{item.company.name}</option>)}
            </select>
            <button className="text-button" type="submit">Switch workspace</button>
          </form>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink href="/dashboard">Overview</NavLink>
          {canManage(role) && <NavLink href="/contacts">Clients & suppliers</NavLink>}
          <NavLink href="/company">Company & access</NavLink>
        </nav>
        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <span>{roleLabels[role]}</span>
          <form action={logout}><button className="text-button" type="submit">Sign out</button></form>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
