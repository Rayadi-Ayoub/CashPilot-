# Rapport ISO 25010 – contribution de Hassen (tests unitaires, E2E, compatibilité, CI)

Sections à intégrer par Ayoub dans `docs/rapport-iso25010.md`. Tous les chiffres
ci-dessous proviennent d'exécutions réelles du 25/11/2026 (règle d'or), et chaque
résultat renvoie à sa preuve dans `docs/preuves/`.

## 6.1 Aptitude fonctionnelle (part tests unitaires + E2E)

1. **Exigence** : les parcours principaux et les règles métier RM1, RM2, RM5 et RM6
   se comportent comme spécifié.
2. **Outils et commandes** :
   - Vitest : `npm run test` (tests unitaires `tests/unit/`)
   - Playwright : `npx playwright test --project=chromium` (`tests/e2e/`)
3. **Résultats obtenus** :
   - **61/61 tests unitaires passés** (9 fichiers), dont 24 nommés d'après une règle métier
     (RM1, RM2, RM5, RM6).
   - **8/8 tests E2E passés sur Chromium**, soit les 6 scénarios du cahier plus 2 cas négatifs :
     1. connexion Owner → tableau de bord (+ mot de passe erroné refusé) ;
     2. création → validation → paiement partiel de 400 DT : reste dû de 1 000 à 600 DT ;
     3. paiement supérieur au reste dû refusé, message RM1 affiché ;
     4. le collaborateur soumet une dépense avec reçu, l'Owner l'approuve, elle est marquée payée ;
     5. le collaborateur n'a pas accès à la page Factures ;
     6. recherche « Sfax » parmi les factures du jeu de volume (+ recherche sans résultat).
4. **Preuves** : `6.7-vitest.png`, `6.7-vitest-coverage.log`, `6.1-playwright-rapport.png`.
5. **Conclusion** : **conforme** pour le périmètre testé.

## 6.3 Compatibilité (navigateurs)

1. **Exigence** : l'application fonctionne sur au moins 2 navigateurs.
2. **Outil et commande** : Playwright 1.65 sur 3 moteurs,
   `npx playwright test --project=chromium --project=firefox --project=webkit`.
3. **Résultat obtenu** : **24/24 tests passés** (8 tests × 3 moteurs :
   Chromium 159, Firefox 159, WebKit 27.2), plus les 3 connexions de préparation
   (une par rôle), soit 27/27 ; 0 échec, 0 instable, durée 1,3 min.
   Chaque rôle se connecte une seule fois par le vrai formulaire et la session est
   réutilisée : au plus 4 tentatives de connexion par compte pour tout le run,
   compatible avec une limitation des tentatives de connexion (section 6.6).
4. **Preuves** : `6.3-3-navigateurs.png`, `6.3-playwright-3-navigateurs.log`
   (en complément du test manuel Chrome / Firefox / Edge de Fares).
5. **Conclusion** : **conforme** (3 moteurs ≥ 2 exigés).

## 6.7 Maintenabilité (part couverture + intégration continue)

1. **Exigence** : code en couches, couverture mesurée supérieure à 70 %, contrôle qualité
   automatisé.
2. **Outils et commandes** : `npm run test:coverage` (Vitest + v8), `npm run typecheck`
   (`tsc --noEmit`), GitHub Actions (`.github/workflows/ci.yml`).
3. **Résultats obtenus** :
   - Couverture sur `lib/` (Server Actions exclues), tests unitaires et d'intégration
     confondus (82 tests) : **lignes 72,18 %** (109/151), instructions 70,74 %,
     branches 73,94 %, fonctions 71,87 %.
   - Modules métier purs à 100 % : `money`, `payments`, `invoices`, `expenses`,
     `filters`, `format`, `paymentReminder`. Restent peu couverts : `simulation.ts` (0 %),
     `auth.ts` (18 %, lecture de cookies) et `cash.ts` (40 %), qui demandent un serveur
     ou une base de données.
   - `tsc --noEmit` : **0 erreur**.
   - Testabilité : les règles de transition RM2 et RM5 ont été extraites en fonctions
     pures (`canCancelInvoice`, `canPayExpense`…) et testées unitairement.
   - CI : le workflow exécute `npm ci`, `prisma migrate deploy`, `typecheck`,
     `test:coverage` et `npm audit`. Ces étapes ont été rejouées en local et passent toutes.
     **Exécution GitHub Actions : non exécutée** tant que la branche n'est pas poussée
     (procédure : pousser la branche, ouvrir l'onglet Actions).
4. **Preuves** : `6.7-couverture.png`, `6.7-vitest.png`, `6.7-vitest-coverage.log`,
   `6.7-ci-github.png` (à capturer après le premier run).
5. **Conclusion** : couverture et typage **conformes** ; CI **partiellement conforme**
   tant que le run GitHub n'est pas capturé.

**Point SCA à reporter en 6.6 (Nader / Fares)** : `npm audit --audit-level=high`
signale 4 vulnérabilités élevées, toutes dans la chaîne Prisma 6 (`deepmerge-ts`,
`effect` via `@prisma/config`). La seule correction est la montée en version majeure
Prisma 7. L'étape d'audit en CI est donc non bloquante (`continue-on-error`), et le
résultat reste visible dans chaque run.

## Lignes pour la matrice de traçabilité

À reporter par Ayoub dans `docs/matrice-tracabilite.md` :

| ID | Exigence | ISO | Test(s) | Outil | Résultat obtenu | Preuve | Resp. | État |
|---|---|---|---|---|---|---|---|---|
| F1 | Authentification + 3 rôles | 6.1, 6.6 | `roles.test.ts` (4) ; E2E scénarios 1, 1b, 5 | Vitest, Playwright | Passés ; le collaborateur ne voit aucune donnée de facture | `6.7-vitest.png`, `6.1-playwright-rapport.png` | Hassan | ✅ |
| F3 | Workflow à statuts | 6.1 | `transitions.test.ts` (10) ; E2E scénarios 2 et 4 | Vitest, Playwright | 10/10 ; E2E 2 et 4 passés ×3 navigateurs | `6.7-vitest.png`, `6.3-3-navigateurs.png` | Hassan | ✅ |
| F5 | Recherche à fort volume | 6.1 | E2E scénarios 6 et 6b | Playwright | Passés ×3 navigateurs | `6.1-playwright-rapport.png` | Hassan | ✅ |
| RM1 | Paiement ≤ reste dû | 6.1 | `payments.test.ts` (unit, 4), `paymentReminder.test.ts` ; E2E scénario 3 | Vitest, Playwright | Passés ; message « Payment exceeds the remaining amount of 300.00 DT. » | `6.7-vitest.png`, `6.1-playwright-rapport.png` | Hassan | ✅ |
| RM2 | Annulation interdite après paiement ; motif obligatoire | 6.1 | `transitions.test.ts` (5 tests RM2) | Vitest | Passés | `6.7-vitest.png` | Hassan | ✅ |
| RM5 | Dépense refusée jamais payable | 6.1 | `transitions.test.ts` (4 tests RM5) ; E2E scénario 4 | Vitest, Playwright | Passés ×3 navigateurs | `6.7-vitest.png`, `6.3-3-navigateurs.png` | Hassan | ✅ |
| RM6 | Montant > 0, 2 décimales maximum | 6.1 | `money.test.ts` (9 tests RM6) | Vitest | Passés (négatif, zéro, 3 décimales, texte, vide refusés) | `6.7-vitest.png` | Hassan | ✅ |
| 6.1 | Fonctionnalités exactes (part unitaires + E2E) | 6.1 | `tests/unit/`, `tests/e2e/` | Vitest, Playwright | 61/61 unitaires ; 8/8 E2E Chromium | `6.7-vitest.png`, `6.1-playwright-rapport.png` | Hassan | ✅ |
| 6.3 | ≥ 2 navigateurs | 6.3 | `tests/e2e/*` | Playwright (Chromium, Firefox, WebKit) | 24/24 passés (+ 3 connexions de préparation) | `6.3-3-navigateurs.png` | Hassan | ✅ |
| 6.7 | Couverture mesurée > 70 % | 6.7 | `npm run test:coverage` | Vitest v8 | Lignes 72,18 % sur `lib/` (hors Server Actions) ; `tsc` 0 erreur | `6.7-couverture.png` | Hassan | ✅ |
| 6.7 | Intégration continue | 6.7 | `.github/workflows/ci.yml` | GitHub Actions | Étapes vertes en local ; run GitHub à capturer après le push | `6.7-ci-github.png` | Hassan | ⏳ |

## Démonstration à la soutenance

```bash
npm run test:coverage                          # 82 tests + tableau de couverture
npx playwright test --headed --project=chromium  # le jury voit le navigateur
```
