"use server";

export async function getEurRate(): Promise<{ rate: number | null; source: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.exchangerate.host/latest?base=DT&symbols=EUR", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return { rate: null, source: "indisponible" };
    const data = await res.json();
    const rate = data.rates?.EUR;
    if (typeof rate !== "number") return { rate: null, source: "indisponible" };
    return { rate, source: "api.exchangerate.host" };
  } catch {
    return { rate: null, source: "indisponible" };
  }
}

export async function convertToEur(amountDT: number): Promise<{ eur: number | null; rate: number | null; source: string }> {
  const { rate, source } = await getEurRate();
  if (rate === null) return { eur: null, rate: null, source };
  return { eur: amountDT * rate, rate, source };
}
