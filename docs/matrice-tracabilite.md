# Matrice de traçabilité – CashPilot

Chaque exigence du cahier des charges est reliée à ses tests, à l'outil utilisé, au résultat obtenu et à la preuve.

**Règle d'or :** une ligne n'est marquée ✅ qu'après une exécution réelle, avec sa preuve dans `docs/preuves/`. Une ligne ⏳ est en cours, et chaque responsable la remplit avec son résultat réel. Un outil impossible à exécuter est noté ❌ « non exécuté — procédure fournie », jamais simulé.

Dernière mise à jour : 25/11/2026, 19h.

## A. Exigences fonctionnelles (section 4 du cahier)

| ID | Exigence | ISO | Test(s) | Outil | Résultat obtenu | Preuve | Resp. | État |
|---|---|---|---|---|---|---|---|---|
| F1 | Authentification + 3 rôles aux droits différenciés | 6.1, 6.6 | Contrôles `requireManager` / `requireOwner` ; page Audit refusée au collaborateur ; tests 401/403 de l'API | Navigateur, Newman | Le collaborateur reçoit « Only the company owner can view the audit log » | À capturer | Nader | ⏳ |
| F2 | ≥ 4 entités liées (1-N, N-N) avec CRUD | 6.1 | 11 entités ; tests d'intégration sur Company, Contact, Invoice, Payment, Expense, CashAdjustment, AuditLog | Vitest | 21/21 tests passés | `6.5-tests-integration-fiabilite.png` | Ayoub | ✅ |
| F3 | Workflow à statuts avec règles de transition | 6.1 | `invoices.test.ts` (validation, double validation refusée, annulation) ; E2E facture → paiement | Vitest, Playwright | Tests Vitest passés ; E2E à exécuter | `6.5-tests-integration-fiabilite.png` | Ayoub, Hassan | ✅ / ⏳ |
| F4 | Tableau de bord : indicateurs agrégés + filtres | 6.1 | Filtre période 60 j + client Carthage Retail | Navigateur | 1 150 DT encaissés, 2 750 DT impayés, 3 alertes : valeurs vérifiées à la main | `6.1-dashboard-filtres.png` | Ayoub | ✅ |
| F5 | Recherche / filtrage sur une entité à fort volume | 6.1, 6.2 | Recherche « sfax » sur 203 factures ; filtres statut, dates, pagination | Navigateur | 17 factures sur 203 trouvées | `6.1-recherche-factures.png` | Ayoub | ✅ |
| F6 | Journal d'audit (qui, quoi, quand) | 6.1, 6.6 | `cash.test.ts` (2 tests audit) ; `payments.test.ts` (ligne écrite avec le paiement) ; contrôle à l'écran | Vitest, navigateur | Connexions et paiements tracés automatiquement, avec l'heure exacte | `6.1-audit-log.png` | Ayoub | ✅ |
| F7 | ≥ 5 règles métier documentées et testables | 6.1 | RM1 à RM7, voir partie B | Vitest | 7 règles documentées, 6 couvertes par des tests automatiques | `regles-metier.md` | Ayoub | ✅ |

## B. Règles métier

| ID | Règle | Test(s) | Outil | Résultat | Resp. | État |
|---|---|---|---|---|---|---|
| RM1 | Paiement ≤ reste dû, même en accès concurrents | `payments.test.ts` (3), `reliability.test.ts` (2) | Vitest | Passés : 2 × 700 DT simultanés sur 1 000 DT → un seul accepté | Ayoub | ✅ |
| RM2 | Annulation interdite après paiement ; motif obligatoire | `invoices.test.ts` (3) | Vitest | Passés | Ayoub | ✅ |
| RM3 | Numéro de facture unique par entreprise | `invoices.test.ts` (2) | Vitest | Passés (contrainte unique, format `INV-AAAA-NNNN`) | Ayoub | ✅ |
| RM4 | Contact unique (entreprise, type, nom) | `invoices.test.ts` (1) | Vitest | Passé | Ayoub | ✅ |
| RM5 | Dépense refusée jamais payable ; approbation par l'Owner seul | Scénario E2E 4 | Playwright | À exécuter | Hassan | ⏳ |
| RM6 | Montant > 0, 2 décimales maximum, calcul décimal exact | `payments.test.ts` (1) + tests unitaires `parseMoney` | Vitest | Intégration passée ; unitaires à exécuter | Ayoub, Hassan | ✅ / ⏳ |
| RM7 | Solde initial saisi une fois ; corrections par ajustement motivé | `cash.test.ts` (1) | Vitest | Passé : solde réel = 5 700 DT attendu et obtenu | Ayoub | ✅ |

## C. Caractéristiques de qualité ISO/IEC 25010 (section 6 du cahier)

| # | Exigence mesurable | Couche de test | Outil | Résultat obtenu | Preuve | Resp. | État |
|---|---|---|---|---|---|---|---|
| 6.1 | Toutes les fonctionnalités de la section 4 implémentées et exactes | Intégration + E2E | Vitest, Playwright | Intégration : 21/21 ; E2E : à exécuter | `6.5-tests-integration-fiabilite.png` | Ayoub, Hassan | ✅ / ⏳ |
| 6.2 | p95 < 500 ms avec 20 utilisateurs simultanés | Performance | k6 | p95 = … ms | `6.2-k6.png` | Fares | ⏳ |
| 6.3 | Fonctionne sur ≥ 2 navigateurs + coexistence avec une API externe | Compatibilité, API | Playwright (Chromium, Firefox, WebKit), Newman | … | `6.3-*.png`, `6.3-newman.html` | Hassan, Nader, Fares | ⏳ |
| 6.4 | Parcours validé, accessibilité de base | E2E, recette, audit | Playwright, Lighthouse, recette manuelle | Score accessibilité = … | `6.4-*.png` | Fares, Hassan | ⏳ |
| 6.5 | Aucune perte de données en cas d'erreur ou de panne ; reprise correcte | Fiabilité | Vitest (5 tests) + test de reprise manuel | 5/5 tests passés. Après arrêt brutal (Ctrl+C) puis redémarrage : paiement de 100 DT, reste dû de 1 900 DT et ligne d'audit de 18:39:33 intacts | `6.5-tests-integration-fiabilite.png`, `6.5-reprise-1` à `5` | Ayoub | ✅ |
| 6.6 | Authentification robuste, contrôle d'accès par rôle, pas de faille OWASP Top 10 | SAST, SCA, DAST | Semgrep, npm audit, OWASP ZAP | … alertes avant / après correction | `6.6-*.json`, `6.6-zap-*.html` | Nader, Fares | ⏳ |
| 6.7 | Code en couches, complexité maîtrisée, couverture mesurée | Qualité, unitaires | `npm run test:coverage`, SonarCloud, `tsc` | Couverture = … % ; `tsc` : 0 erreur | `6.7-*.png` | Hassan, Fares | ⏳ |
| 6.8 | Installation reproductible sur une autre machine | Portabilité | Docker Compose + guide d'installation | … | `6.8-docker*.png` | Fares | ⏳ |

## D. Livrables (section 8 du cahier)

| Livrable | Emplacement | État |
|---|---|---|
| Code source versionné (Git, historique de commits) | Dépôt GitHub, une branche par membre | ✅ en cours (branche `ayoub` : 4 commits) |
| Rapport de conception | `docs/rapport-conception.md` | ✅ |
| Matrice de traçabilité | `docs/matrice-tracabilite.md` (ce fichier) | ⏳ à compléter par chaque membre |
| Jeux de tests exécutables + rapports | `tests/`, `coverage/`, rapports Playwright / k6 / Newman | ⏳ |
| Rapport de conformité ISO 25010 | `docs/rapport-iso25010.md` | ⏳ |
| Guide d'installation | `README.md` | ✅ (section Docker à ajouter par Fares) |
| Soutenance : démo + 2 couches de test en direct | Vitest (`npm test`) + Playwright (`--headed`) | ⏳ |

## Comment compléter une ligne

1. Exécutez réellement le test ou l'outil.
2. Placez la capture ou le rapport dans `docs/preuves/`, avec un nom commençant par le numéro ISO (exemple : `6.2-k6.png`).
3. Remplacez `…` par le résultat chiffré et ⏳ par ✅. Si l'outil ne peut pas être exécuté, notez ❌ « non exécuté — procédure fournie ».
