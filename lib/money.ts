import { Prisma } from "@prisma/client";

export function parseMoney(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("Enter a positive amount with at most two decimal places.");
  const amount = new Prisma.Decimal(text);
  if (amount.lte(0)) throw new Error("The amount must be greater than zero.");
  return amount;
}

export function sumMoney(values: { toString(): string }[]) {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(value.toString()), new Prisma.Decimal(0));
}
