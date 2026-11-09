"use server";

import { ContactType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext, requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createContact(formData: FormData) {
  const { company, role } = await getCompanyContext();
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
  await db.contact.create({ data: { companyId: company.id, name, type, email, phone, address } });
  revalidatePath("/contacts");
  redirect("/contacts?success=Contact added.");
}
