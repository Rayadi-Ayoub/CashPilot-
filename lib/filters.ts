/** Outils partagés pour la recherche et les filtres des listes (factures, dépenses, audit). */

export const PAGE_SIZE = 25;

/** Accepte uniquement une date AAAA-MM-JJ valide ; sinon undefined. */
export function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Fin de journée (inclusif) pour un filtre « jusqu'au ». */
export function endOfDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Filtre Prisma sur une plage de dates, ou undefined si aucune borne. */
export function dateRange(from?: string, to?: string) {
  const start = parseDateParam(from);
  const end = parseDateParam(to);
  if (!start && !end) return undefined;
  return { ...(start ? { gte: start } : {}), ...(end ? { lte: endOfDay(end) } : {}) };
}

/** Texte de recherche nettoyé (100 caractères maximum). */
export function cleanQuery(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 100);
}

/** Numéro de page valide (1 par défaut). */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Construit une URL de liste en gardant les filtres actifs. */
export function buildQuery(base: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
