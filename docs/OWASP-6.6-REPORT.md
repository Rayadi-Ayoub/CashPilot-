# CashPilot - Rapport ISO 25010 Section 6.6 (Sécurité) - Nader

## Tableau OWASP Top 10 — Protections dans CashPilot

| OWASP Top 10 Risque | Protection implémentée dans CashPilot | Preuve |
|---------------------|--------------------------------------|--------|
| A01:2021 – Broken Access Control | Contrôle d'accès par rôle (OWNER/MANAGER/COLLABORATOR) via `lib/auth.ts` (`requireManager`, `requireOwner`, `canManage`). Routes API vérifient `companyId` et session. | `lib/auth.ts`, `app/api/v1/invoices/route.ts`, `6.6-controle-acces.png` |
| A02:2021 – Cryptographic Failures | Mots de passe hashés avec bcrypt (coût 12). Cookie session `httpOnly`, `sameSite=lax`, `secure` en production. | `lib/actions/auth.ts` (createSession) |
| A03:2021 – Injection | Prisma ORM avec requêtes paramétrées (pas de concaténation SQL). Validation des entrées (Zod-like via parseMoney, regex). | `prisma/schema.prisma`, `lib/money.ts` |
| A04:2021 – Insecure Design | Règles métier documentées (RM1-RM7), transactions `prisma.$transaction` pour l'atomicité, journal d'audit (`AuditLog`). | `lib/payments.ts`, `lib/audit.ts`, `prisma/schema.prisma` |
| A05:2021 – Security Misconfiguration | En-têtes de sécurité dans `next.config.ts` : X-Frame-Options DENY, X-Content-Type-Options nosniff, CSP, Referrer-Policy, Permissions-Policy. | `next.config.ts` |
| A06:2021 – Vulnerable Components | `npm audit` exécuté, vulnérabilités documentées. SCA par Fares. | `docs/preuves/6.6-npm-audit.json` |
| A07:2021 – Identification & Auth Failures | Authentification par sessions serveur (cookie httpOnly), rate limiting login (5 tentatives/15min par email), logout sécurisé. | `lib/actions/auth.ts`, `next.config.ts` |
| A08:2021 – Software & Data Integrity Failures | Signatures de session côté serveur uniquement, pas de JWT côté client. Prisma transactions pour l'intégrité des données. | `lib/actions/auth.ts` |
| A09:2021 – Security Logging & Monitoring Failures | Journal d'audit complet (`AuditLog` : qui, quoi, quand, entité, détails). Actions sensibles tracées : login, factures, paiements, dépenses, ajustements, membres. | `lib/audit.ts`, `app/(workspace)/audit/page.tsx` |
| A10:2021 – SSRF | Pas d'appel d'URL externe côté serveur sauf API de taux de change avec timeout 5s et try/catch (pas de plantage). | `lib/currency.ts` |

## Outils de sécurité exécutés

| Outil | Objectif | Fichier de preuve |
|-------|----------|-------------------|
| Semgrep (SAST) | Détection vulnérabilités code source (OWASP Top 10 + TypeScript) | `docs/preuves/6.6-semgrep.json` |
| OWASP ZAP (DAST) | Scan application en marche, avant/après durcissement | `docs/preuves/6.6-zap-avant.html`, `docs/preuves/6.6-zap-apres.html` |
| npm audit (SCA) | CVE dans dépendances npm | `docs/preuves/6.6-npm-audit.json` |

## Preuves à déposer (ISO 6.6)

- `docs/preuves/6.6-semgrep.json`
- `docs/preuves/6.6-zap-avant.html`
- `docs/preuves/6.6-zap-apres.html`
- `docs/preuves/6.6-controle-acces.png`
- `docs/preuves/6.6-npm-audit.json` (fourni par Fares)
