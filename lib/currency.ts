/**
 * Coexistence avec un système tiers (ISO 25010 – 6.3) : taux de change
 * TND → EUR fourni par une API publique sans clé (open.er-api.com).
 * Le taux est mis en cache 1 heure. Si l'API est lente (> 5 s) ou
 * indisponible, l'application continue de fonctionner et affiche
 * « Taux indisponible » au lieu de planter.
 */
const RATE_URL = "https://open.er-api.com/v6/latest/TND";

export type EurRate = { rate: number | null; source: string };

export function parseEurRate(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as { result?: unknown; rates?: Record<string, unknown> };
  const rate = payload.result === "success" ? payload.rates?.EUR : undefined;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function getEurRate(fetcher: typeof fetch = fetch): Promise<EurRate> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher(RATE_URL, { signal: controller.signal, next: { revalidate: 3600 } } as RequestInit);
    if (!response.ok) return { rate: null, source: "indisponible" };
    const rate = parseEurRate(await response.json());
    return rate === null ? { rate: null, source: "indisponible" } : { rate, source: "open.er-api.com" };
  } catch {
    return { rate: null, source: "indisponible" };
  } finally {
    clearTimeout(timeout);
  }
}
