# Preuves d'exécution – CashPilot (ISO/IEC 25010)

Toutes les captures ci-dessous proviennent d'exécutions réelles du 25/11/2026 sur le Mac de l'équipe (règle d'or du cahier des charges).

## 6.1 Aptitude fonctionnelle

| Fichier | Exigence du cahier | Ce que montre la capture |
|---|---|---|
| `6.1-recherche-factures.png` | Recherche / filtrage sur une entité à fort volume | Recherche « sfax » : 17 factures sur 203 |
| `6.1-dashboard-filtres.png` | Tableau de bord avec indicateurs agrégés et filtres | Période 60 jours + client Carthage Retail : 1 150 DT encaissés, 2 750 DT impayés, 3 alertes |
| `6.1-audit-log.png` | Journal d'audit des actions sensibles | Qui / quoi / quand, avec filtres par action, utilisateur et dates |

## 6.5 Fiabilité

| Fichier | Ce que montre la capture |
|---|---|
| `6.5-tests-integration-fiabilite.png` | `npm test` : 4 fichiers, 21 tests passés (dont 5 tests de fiabilité : paiements simultanés, rollback, reprise) |
| `6.5-reprise-1-avant-facture.png` | Paiement de 100 DT (réf. TEST-REPRISE) sur INV-2026-0001 : reste dû 1 900 DT |
| `6.5-reprise-2-avant-audit.png` | Ligne d'audit « Payment recorded · 100.00 DT » à 18:39:33 |
| `6.5-reprise-3-serveur-arrete.png` | Arrêt brutal (Ctrl+C) puis `curl` : « Failed to connect to localhost port 3000 » |
| `6.5-reprise-4-apres-facture.png` | Après redémarrage : paiement de 100 DT présent, reste dû toujours 1 900 DT |
| `6.5-reprise-5-apres-audit.png` | Après redémarrage : ligne d'audit de 18:39:33 intacte, 13 actions enregistrées |

**Conclusion 6.5 :** après un arrêt brutal du serveur, aucune donnée validée n'est perdue et l'application reprend normalement. Conforme.
