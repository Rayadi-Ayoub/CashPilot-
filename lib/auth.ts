import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cashpilot_session")?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { memberships: { include: { company: true }, orderBy: { joinedAt: "asc" } } } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getCompanyContext() {
  const user = await requireUser();
  if (user.memberships.length === 0) redirect("/register");

  const cookieStore = await cookies();
  const selectedId = cookieStore.get("cashpilot_company")?.value;
  const membership = user.memberships.find((item) => item.companyId === selectedId) ?? user.memberships[0];
  return { user, membership, company: membership.company, role: membership.role };
}

export function canManage(role: Role) {
  return role === Role.OWNER || role === Role.MANAGER;
}

export function requireManager(role: Role) {
  if (!canManage(role)) throw new Error("Only the owner or financial manager can perform this action.");
}

export function requireOwner(role: Role) {
  if (role !== Role.OWNER) throw new Error("Only the company owner can perform this action.");
}

export const roleLabels: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Financial manager",
  COLLABORATOR: "Collaborator",
};
