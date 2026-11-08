"use server";

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCompanyContext, requireOwner } from "@/lib/auth";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function createSession(userId: string, companyId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const cookieStore = await cookies();
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  cookieStore.set("cashpilot_session", token, { ...options, expires: expiresAt });
  cookieStore.set("cashpilot_company", companyId, options);
}

export async function register(formData: FormData) {
  const name = value(formData, "name");
  const companyName = value(formData, "companyName");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  if (!name || !companyName || !email || password.length < 8) {
    redirect("/register?error=Complete all fields. The password must contain at least 8 characters.");
  }
  if (await db.user.findUnique({ where: { email } })) {
    redirect("/register?error=An account already exists for this email.");
  }

  const result = await db.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });
    const company = await transaction.company.create({
      data: { name: companyName, memberships: { create: { userId: user.id, role: Role.OWNER } } },
    });
    return { user, company };
  });
  await createSession(result.user.id, result.company.id);
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const user = await db.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)) || user.memberships.length === 0) {
    redirect("/login?error=Invalid email or password.");
  }
  await createSession(user.id, user.memberships[0].companyId);
  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cashpilot_session")?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  cookieStore.delete("cashpilot_session");
  cookieStore.delete("cashpilot_company");
  redirect("/login");
}

export async function switchCompany(formData: FormData) {
  const { user } = await getCompanyContext();
  const companyId = value(formData, "companyId");
  if (!user.memberships.some((item) => item.companyId === companyId)) throw new Error("You are not a member of this company.");
  (await cookies()).set("cashpilot_company", companyId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function addMember(formData: FormData) {
  const { company, role: currentRole } = await getCompanyContext();
  requireOwner(currentRole);
  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const role = value(formData, "role");
  if (!name || !email || (role !== Role.MANAGER && role !== Role.COLLABORATOR)) {
    redirect("/company?error=Enter a name, email and valid role.");
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (!existingUser && password.length < 8) {
    redirect("/company?error=A new member needs a password of at least 8 characters.");
  }
  if (existingUser && (await db.membership.findUnique({ where: { userId_companyId: { userId: existingUser.id, companyId: company.id } } }))) {
    redirect("/company?error=This user is already a company member.");
  }

  const user = existingUser ?? await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
  });
  await db.membership.create({ data: { userId: user.id, companyId: company.id, role: role as Role } });
  revalidatePath("/company");
  redirect("/company?success=Member added. They can now sign in.");
}
