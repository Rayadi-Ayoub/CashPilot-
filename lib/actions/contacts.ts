"use server";

import { ContactType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction, logAudit } from "@/lib/audit";

export async function createContact(formData: FormData) {
  const { company, role, user } = await getCompanyContext();
  requireManager(role);
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type"));
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (!name || (type !== ContactType.CLIENT && type !== ContactType.SUPPLIER)) {
    redirect("/contacts?error=Enter a name and choose client or supplier.");
  }

  const existing = await db.contact.findFirst({ where: { companyId: company.id, type, name: { equals: name } } });
  if (existing) redirect("/contacts?error=A contact with this name and type already exists.");
  const contact = await db.contact.create({ data: { companyId: company.id, name, type, email, phone, address } });
  await logAudit({ companyId: company.id, userId: user.id, action: AuditAction.CONTACT_CREATED, entity: "Contact", entityId: contact.id, details: `${type} · ${name}` });
  revalidatePath("/contacts");
  redirect("/contacts?success=Contact added.");
}
