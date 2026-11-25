"use server";

import { ContactType, ExpenseStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditAction, logAudit } from "@/lib/audit";
import { parseMoney } from "@/lib/money";

const receiptTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function expenseError(message: string): never {
  redirect(`/expenses?error=${encodeURIComponent(message)}`);
}

export async function createExpense(formData: FormData) {
  const { company, user } = await getCompanyContext();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const expenseDate = String(formData.get("expenseDate") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "");
  const receipt = formData.get("receipt");
  let amount;
  try {
    amount = parseMoney(formData.get("amount"));
  } catch (error) {
    expenseError((error as Error).message);
  }
  if (!category || !description) expenseError("Enter a category and description.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || Number.isNaN(new Date(`${expenseDate}T00:00:00`).getTime())) expenseError("Choose a valid expense date.");
  if (supplierId && !(await db.contact.findFirst({ where: { id: supplierId, companyId: company.id, type: ContactType.SUPPLIER } }))) expenseError("Choose a supplier from this company.");
  if (!(receipt instanceof File) || receipt.size === 0) expenseError("A receipt is required.");
  const extension = receiptTypes[receipt.type];
  if (!extension) expenseError("The receipt must be a PDF, JPEG, PNG or WebP file.");
  if (receipt.size > 5 * 1024 * 1024) expenseError("The receipt must not exceed 5 MB.");

  const storedName = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "data", "uploads", company.id);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, storedName);
  await writeFile(filePath, Buffer.from(await receipt.arrayBuffer()));
  try {
    const expense = await db.expense.create({
      data: {
        companyId: company.id,
        submittedById: user.id,
        supplierId: supplierId || null,
        category,
        description,
        amount,
        expenseDate: new Date(`${expenseDate}T00:00:00.000Z`),
        status: ExpenseStatus.PENDING,
        receiptName: receipt.name.slice(0, 180) || `receipt${extension}`,
        receiptStoredName: storedName,
        receiptType: receipt.type,
      },
    });
    await logAudit({ companyId: company.id, userId: user.id, action: AuditAction.EXPENSE_SUBMITTED, entity: "Expense", entityId: expense.id, details: `${description} · ${amount.toFixed(2)} DT` });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
  revalidatePath("/expenses");
  redirect("/expenses?success=Expense submitted for approval.");
}
