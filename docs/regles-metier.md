# Règles métier – CashPilot

Le cahier des charges demande **au moins 5 règles métier explicites, documentées et testables**. CashPilot en applique **7** (RM1 à RM7). Chacune est appliquée côté serveur : il est impossible de la contourner depuis le navigateur.

| ID | Règle | Où elle est appliquée | Test(s) automatique(s) | État |
|---|---|---|---|---|
| RM1 | Un paiement ne peut jamais dépasser le reste dû de la facture, même si plusieurs paiements arrivent en même temps. | `lib/paymentService.ts` → `recordPayment` (transaction `Serializable`) | `payments.test.ts` (3 tests RM1), `reliability.test.ts` (paiements simultanés 2 × 700 DT et 5 × 300 DT) | ✅ testé |
| RM2 | Une facture qui a reçu un paiement ne peut pas être annulée, et toute annulation exige un motif. | `lib/invoiceService.ts` → `cancelInvoiceRecord` | `invoices.test.ts` (3 tests RM2) | ✅ testé |
| RM3 | Le numéro de facture (`INV-AAAA-NNNN`) est unique dans une entreprise. Il est attribué à la validation. | Contrainte `@@unique([companyId, number])` + `validateInvoiceRecord` | `invoices.test.ts` (RM3 + format du numéro) | ✅ testé |
| RM4 | Un contact est unique dans une entreprise pour un type (client / fournisseur) et un nom donnés. | Contrainte `@@unique([companyId, type, name])` + `lib/actions/contacts.ts` | `invoices.test.ts` (RM4) | ✅ testé |
| RM5 | Seul l'Owner approuve ou refuse une dépense. Seule une dépense **approuvée** peut être marquée payée : une dépense refusée ne peut jamais l'être. | `lib/actions/expenseApproval.ts` (mise à jour conditionnée au statut) | Test E2E Playwright prévu (scénario 4, Hassan) | ⏳ test E2E à exécuter |
| RM6 | Tout montant est strictement positif, avec au plus 2 décimales. Les calculs utilisent des décimaux exacts (`Prisma.Decimal`), jamais des nombres à virgule flottante. | `lib/money.ts` → `parseMoney`, `recordPayment` | `payments.test.ts` (RM6 : 0 et −10 refusés) + tests unitaires `parseMoney` (Hassan) | ✅ testé (unitaires à compléter) |
| RM7 | Le solde initial ne peut être saisi qu'une fois. Toute correction passe par un ajustement de caisse daté, non nul et motivé : l'historique n'est jamais réécrit. | `lib/actions/cash.ts` | `cash.test.ts` (solde réel = initial + paiements − dépenses payées + ajustements) | ✅ testé (calcul) |

## Règles de sécurité et de cohérence complémentaires

Ces règles ne sont pas comptées dans les 5 exigées, mais elles sont appliquées et vérifiées :

- **Isolation des entreprises** : une entreprise ne peut ni lire ni payer la facture d'une autre. Testé dans `payments.test.ts`.
- **Collaborateur** : il ne voit que ses propres dépenses et justificatifs, même avec les filtres de recherche (`expenses/page.tsx`, `receipts/[id]/route.ts`).
- **Justificatif obligatoire** pour toute dépense : PDF, JPEG, PNG ou WebP, 5 Mo maximum (`lib/actions/expenses.ts`).
- **Simulation** : un scénario « what-if » ne modifie jamais les factures, paiements ou dépenses réels (`lib/simulation.ts`).
- **Traçabilité** : chaque action sensible écrit une ligne dans le journal d'audit. Pour les paiements, validations et annulations, cette ligne est écrite dans la même transaction que l'action (`lib/audit.ts`).

## Commande de vérification

```bash
npm test
```

Résultat du 25/11/2026 à 18:13 sur le Mac de l'équipe : **4 fichiers, 21 tests passés** (capture : `preuves/6.5-tests-integration-fiabilite.png`).
