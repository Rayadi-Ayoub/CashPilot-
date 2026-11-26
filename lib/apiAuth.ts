import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canManage, getCurrentUser } from "./auth";

/**
 * Contrôle d'accès de l'API REST (ISO 25010 – 6.6, OWASP A01).
 * - 401 si aucune session valide (pas de redirection HTML vers /login) ;
 * - 403 si l'utilisateur est collaborateur : comme dans l'interface, seuls
 *   l'Owner et le Financial manager ont accès aux factures ;
 * - sinon, renvoie l'entreprise active, à utiliser pour filtrer chaque requête.
 */
export async function requireApiManager() {
  const user = await getCurrentUser();
  if (!user || user.memberships.length === 0) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  const selectedId = (await cookies()).get("cashpilot_company")?.value;
  const membership = user.memberships.find((item) => item.companyId === selectedId) ?? user.memberships[0];
  if (!canManage(membership.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden: invoices are restricted to owners and financial managers." }, { status: 403 }),
    };
  }
  return { user, company: membership.company, role: membership.role };
}
