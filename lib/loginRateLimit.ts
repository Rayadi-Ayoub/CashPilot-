/**
 * Limitation des tentatives de connexion (ISO 25010 – 6.6, OWASP A07).
 * Après 5 échecs pour un même email en 15 minutes, la connexion est bloquée
 * jusqu'à la fin de la fenêtre. Seuls les échecs sont comptés, et une
 * connexion réussie remet le compteur à zéro.
 * Le compteur est en mémoire : il est remis à zéro au redémarrage du serveur.
 */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_LOGIN_FAILURES = 5;

type Attempt = { count: number; firstFailure: number };

export function createLoginRateLimiter(now: () => number = Date.now) {
  const failures = new Map<string, Attempt>();

  const current = (key: string) => {
    const record = failures.get(key);
    if (record && now() - record.firstFailure > LOGIN_WINDOW_MS) {
      failures.delete(key);
      return undefined;
    }
    return record;
  };

  return {
    isBlocked(key: string) {
      return (current(key)?.count ?? 0) >= MAX_LOGIN_FAILURES;
    },
    recordFailure(key: string) {
      const record = current(key);
      if (record) record.count += 1;
      else failures.set(key, { count: 1, firstFailure: now() });
    },
    reset(key: string) {
      failures.delete(key);
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter();
