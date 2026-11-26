# CashPilot – Sécurité (ISO/IEC 25010 – 6.6) et OWASP Top 10

Responsables : Nader (API, durcissement, SAST/DAST), Fares (SCA). Mise à jour : 26/11/2026.

**Règle d'or :** un outil n'est indiqué « exécuté » que si son rapport réel est dans `docs/preuves/`. Sinon il est noté « à exécuter » ou « non exécuté — procédure fournie ».

## 1. OWASP Top 10 (2021) – protections en place et comment elles sont vérifiées

| Risque | Protection dans CashPilot | Vérification |
|---|---|---|
| A01 Broken Access Control | Rôles vérifiés côté serveur dans chaque page et action (`requireManager`, `requireOwner`). API REST : `requireApiManager` (`lib/apiAuth.ts`) → **401** sans session, **403** pour un collaborateur. Toutes les requêtes filtrent par `companyId`. | `tests/integration/api.test.ts` (6 tests : 401, session expirée, 403 liste + détail, isolation des entreprises, 404) ; Newman (403 collaborateur) ; `payments.test.ts` (paiement inter-entreprises refusé) |
| A02 Cryptographic Failures | Mots de passe bcrypt (coût 12) ; jeton de session aléatoire de 32 octets ; cookie `httpOnly`, `sameSite=lax`, `secure` en production | Revue de code (`lib/actions/auth.ts`) |
| A03 Injection | Prisma : requêtes paramétrées, aucune concaténation SQL. Validation stricte des montants (`parseMoney`) et des dates | Tests `money.test.ts`, `filters.test.ts` |
| A04 Insecure Design | Règles métier RM1–RM7 côté serveur, transactions `Serializable`, journal d'audit | `reliability.test.ts`, `regles-metier.md` |
| A05 Security Misconfiguration | En-têtes HTTP : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` (sans `unsafe-eval` en production) | En-têtes visibles dans la réponse HTTP ; scan ZAP |
| A06 Vulnerable Components | `npm audit` dans la CI (GitHub Actions) | `6.6-npm-audit.json` (à régénérer après la fusion, voir §2) |
| A07 Identification & Authentication Failures | Sessions serveur révocables ; blocage après 5 échecs de connexion en 15 min (`lib/loginRateLimit.ts`) ; chaque échec tracé (`LOGIN_FAILED`) | `tests/unit/loginRateLimit.test.ts` (4 tests) |
| A08 Software & Data Integrity Failures | Pas de JWT côté client ; transactions ; `package-lock.json` versionné, `npm ci` en CI et Docker | Revue de code, CI |
| A09 Security Logging & Monitoring Failures | Journal d'audit : connexions, échecs, factures, paiements, dépenses, caisse, membres | `cash.test.ts`, `payments.test.ts`, capture `6.1-audit-log.png` |
| A10 SSRF | Un seul appel sortant, vers une URL fixe (`open.er-api.com`), sans paramètre venant de l'utilisateur ; délai de 5 s ; échec géré sans plantage | `tests/unit/currency.test.ts` |

## 2. Outils de sécurité (section 7 du cahier)

| Couche | Outil | Commande | État | Résultat | Preuve |
|---|---|---|---|---|---|
| SAST | Snyk Code (VS Code) ou Semgrep | Voir `SAST-README.md` | ⏳ à exécuter | … | `6.6-sast.png` / `6.6-semgrep.json` |
| SCA | npm audit (+ Snyk Open Source) | `npm audit --json > docs/preuves/6.6-npm-audit.json` | ⏳ à régénérer sur `main` | Avant fusion de Newman : 4 vulnérabilités élevées (Prisma 6) | `6.6-npm-audit.json` |
| DAST | OWASP ZAP baseline | Voir `DAST-README.md` | ⏳ à exécuter | … | `6.6-zap-avant.html`, `6.6-zap-apres.html` |
| Contrôle d'accès | Vitest + Newman | `npm test` ; `bash tests/api/run-newman.sh` | ⏳ à exécuter sur le Mac de l'équipe | … | `6.6-controle-acces.png`, `6.3-newman.html` |

## 3. Historique des corrections

| Date | Problème | Correction |
|---|---|---|
| 26/11/2026 | L'API renvoyait toutes les factures à un collaborateur (A01) et redirigeait vers `/login` au lieu de 401 | `lib/apiAuth.ts` + 6 tests d'intégration |
| 26/11/2026 | Blocage des connexions : échecs comptés deux fois, et page d'erreur au blocage (ligne d'audit avec identifiants vides) | `lib/loginRateLimit.ts` + 4 tests unitaires |
| 26/11/2026 | CSP : `eval()` bloqué en développement | `unsafe-eval` en développement uniquement |
| 26/11/2026 | API de change : devise `DT` invalide, fournisseur nécessitant une clé | `TND` via `open.er-api.com`, repli « Rate unavailable », 4 tests |
