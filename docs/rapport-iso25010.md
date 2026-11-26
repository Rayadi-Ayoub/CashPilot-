# CashPilot — Rapport de qualité ISO/IEC 25010

**Contribution de Mohamed Fares Sallemi**  
**Périmètre** — Performance (6.2), facilité d’utilisation (6.4) et portabilité (6.8).

## 6.2 — Efficacité de performance

### Objectif

Vérifier que le temps de réponse au 95e percentile (p95) reste inférieur
à 500 ms avec 20 utilisateurs virtuels. Le p95 correspond au temps sous
lequel environ 95 % des requêtes ont reçu une réponse.

### Méthode

CashPilot a été lancé en mode production dans Docker. Deux scripts k6 ont
été exécutés séparément pendant 30 secondes, avec 20 utilisateurs virtuels
et une pause d’une seconde entre deux requêtes de chaque utilisateur.

- `tests/perf/load.js` mesure le chargement de la page de connexion.
- `tests/perf/dashboard.js` mesure le chargement du tableau de bord. Les
  utilisateurs virtuels partagent une session de démonstration déjà ouverte.
  Les redirections sont désactivées pour détecter un éventuel retour vers
  la page de connexion.

### Résultats

| Page | Requêtes | Temps moyen | p95 | Réponses HTTP 200 |
|---|---:|---:|---:|---:|
| `/login` | 556 | 92,25 ms | 174,97 ms | 556 sur 556 |
| `/dashboard` | 460 | 344,92 ms | 435,84 ms | 460 sur 460 |

**Conclusion.** Les deux pages respectent le seuil de 500 ms dans les
conditions du test. Le tableau de bord présente le p95 le plus élevé,
à 435,84 ms. Aucune requête HTTP n’a échoué.

**Preuves** — [Résultat k6 de la connexion](preuves/6.2-k6.png) ·
[Résultat k6 du tableau de bord](preuves/6.2-k6-dashboard.png)

## 6.4 — Facilité d’utilisation

### Objectif

Évaluer l’accessibilité des pages de connexion, de tableau de bord et de
factures. Compléter cette évaluation par une recette utilisateur sur les
principales opérations métier.

### Méthode et résultats

Un audit Lighthouse a été réalisé dans Chrome sur chacune des trois pages.
Les scores sont exprimés sur 100.

| Page | Accessibilité | Bonnes pratiques | Preuve |
|---|---:|---:|---|
| Connexion `/login` | 100 | 96 | [Capture](preuves/6.4-lighthouse-login.png) |
| Tableau de bord `/dashboard` | [à relever] | [à relever] | [Capture](preuves/6.4-lighthouse-dashboard.png) |
| Factures `/invoices` | [à relever] | [à relever] | [Capture](preuves/6.4-lighthouse-invoices.png) |

### Recette utilisateur — Validée

J’ai testé les cinq scénarios prévus dans CashPilot : la connexion,
la création d’une facture, l’enregistrement d’un paiement, la soumission
d’une dépense et son approbation avec un compte autorisé.



## 6.8 — Portabilité
**Test réalisé.** Depuis la racine du dépôt, j’ai lancé `docker compose up -d`.
Docker Compose a créé le conteneur et les volumes destinés à la base SQLite
et aux fichiers envoyés. J’ai consulté les journaux avec
`docker compose logs -f cashpilot` pour vérifier le démarrage.

### Objectif

Permettre à un coéquipier de lancer CashPilot sur une deuxième machine
en suivant le guide d’installation du projet.

### Mise en œuvre

Le `Dockerfile` décrit la construction de l’image de CashPilot.
Le fichier `docker-compose.yml` configure le démarrage du service, l’accès
à l’application sur le port 3000 et les volumes destinés à la base SQLite
et aux reçus.

### Vérification sur le premier PC

1. La commande `docker compose up -d` a démarré le conteneur CashPilot et
   créé les deux volumes.
2. Les journaux ont confirmé la création de la base SQLite dans
   `/app/data/db/cashpilot.db` et l’application réussie des huit migrations
   Prisma.
3. Le serveur Next.js a démarré en mode production. L’application était
   accessible à l’adresse `http://localhost:3000`.
4. La commande `docker compose exec cashpilot npm run db:seed` a créé les
   trois comptes de démonstration : propriétaire, responsable et collaborateur.

**Conclusion.** Le démarrage de CashPilot avec Docker a été vérifié sur le
premier PC. L’installation sur une deuxième machine à partir du README
reste à confirmer.

**Preuves** — [Démarrage Docker](preuves/6.8-docker.png) ·
[Guide d’installation](../README.md)