import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { canManage, getCompanyContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { company, role, user } = await getCompanyContext();
  const { id } = await params;
  const expense = await db.expense.findFirst({ where: { id, companyId: company.id, ...(canManage(role) ? {} : { submittedById: user.id }) } });
  if (!expense) return new NextResponse("Receipt not found", { status: 404 });
  const filePath = path.join(process.cwd(), "data", "uploads", company.id, expense.receiptStoredName);
  const receipt = await readFile(filePath);
  return new NextResponse(new Uint8Array(receipt), { headers: { "Content-Type": expense.receiptType, "Content-Disposition": `inline; filename="${encodeURIComponent(expense.receiptName)}"`, "X-Content-Type-Options": "nosniff" } });
}
