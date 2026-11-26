# CashPilot — Mission de Nader : Sécurité et API (ISO 6.6, 6.3)

> **Cahier des charges ISO 25010 — CashPilot**
> Rôle : Nader — Sécurité et API (charge lourde)
> Sections couvertes : 6.3 (compatibilité système tiers), 6.6 (sécurité), 7 (API, SAST, DAST)
> Preuves à déposer : `6.3-newman.html`, `6.3-api-externe.png`, `6.6-semgrep.json`, `6.6-zap-avant.html`, `6.6-zap-apres.html`, `6.6-controle-acces.png`

---

## 1. Vue d'ensemble de la mission

Nader est responsable de prouver l'absence de failles OWASP dans CashPilot, de fournir une API REST testée, et d'assurer la coexistence avec un système tiers (API de taux de change). Il couvre les caractéristiques ISO 6.3 (compatibilité) et 6.6 (sécurité), ainsi que les couches de test 7 : API, SAST, DAST.

### Livrables attendus (preuves)

| Preuve | Description | Section ISO |
|--------|-------------|-------------|
| `6.3-newman.html` | Rapport Newman des tests API REST | 6.3 |
| `6.3-api-externe.png` | Capture du solde en EUR sur le dashboard | 6.3 |
| `6.6-semgrep.json` | Rapport SAST Semgrep | 6.6 |
| `6.6-zap-avant.html` | Rapport ZAP avant durcissement | 6.6 |
| `6.6-zap-apres.html` | Rapport ZAP après durcissement | 6.6 |
| `6.6-controle-acces.png` | Capture d'un refus d'accès (403 collaborateur) | 6.6 |

---

## 2. Ce qu'il faut installer

### 2.1 Dépendances du projet (déjà présentes)

Le projet utilise déjà :
- **Next.js 16** (React 19, Server Actions)
- **Prisma 6** avec SQLite
- **bcryptjs** pour le hachage des mots de passe
- **Vitest** pour les tests unitaires
- **Playwright** pour les tests E2E

### 2.2 Outils à installer par Nader

| Outil | Installation | Usage |
|-------|-------------|-------|
| **Newman** + **newman-reporter-htmlextra** | `npm i -D newman newman-reporter-htmlextra` | Exécuter la collection Postman en CLI |
| **Docker** | https://docker.com | Exécuter Semgrep et OWASP ZAP |
| **Semgrep** (image Docker) | `docker pull semgrep/semgrep` | SAST — analyse statique du code |
| **OWASP ZAP** (image Docker) | `docker pull ghcr.io/zaproxy/zaproxy:stable` | DAST — scan de l'application en marche |
| **Postman** (optionnel) | https://postman.com | Importer et visualiser la collection `.json` |

### 2.3 Fichiers créés/modifiés pour cette mission

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/api/v1/invoices/route.ts` | Créé | GET liste des factures de l'entreprise |
| `app/api/v1/invoices/[id]/route.ts` | Créé | GET détail d'une facture avec paiements et reste dû |
| `next.config.ts` | Modifié | Ajout des en-têtes de sécurité (CSP, X-Frame-Options, etc.) |
| `lib/actions/auth.ts` | Modifié | Rate limiting login (5 tentatives / 15 min par email) |
| `lib/currency.ts` | Créé | Appel API publique de taux de change (DT → EUR) |
| `app/(workspace)/dashboard/page.tsx` | Modifié | Affichage du solde converti en EUR avec fallback |
| `tests/api/cashpilot.postman_collection.json` | Créé | Collection Postman avec 6 tests API |
| `tests/api/run-newman.sh` | Créé | Script d'exécution Newman |
| `docs/SAST-README.md` | Créé | Documentation SAST Semgrep |
| `docs/DAST-README.md` | Créé | Documentation DAST OWASP ZAP |
| `docs/ACCESS-CONTROL-README.md` | Créé | Documentation tests de contrôle d'accès |
| `docs/OWASP-6.6-REPORT.md` | Créé | Rapport OWASP Top 10 pour section 6.6 |

---

## 3. Comment ça marche

### 3.1 API REST (ISO 6.3)

Deux endpoints REST sont exposés sous `/api/v1/` :

**GET `/api/v1/invoices`**
- Retourne la liste des factures de l'entreprise connectée
- Vérifie la session via `lib/auth.ts` (`getCompanyContext`)
- Réponses : `200` (JSON), `401` (non connecté), `403` (collaborateur sans droit selon contexte)

**GET `/api/v1/invoices/[id]`**
- Retourne le détail d'une facture avec ses paiements et le reste dû
- Vérifie que la facture appartient à l'entreprise de l'utilisateur
- Réponses : `200` (JSON), `401` (non connecté), `403` (collaborateur), `404` (facture inconnue ou d'une autre entreprise)

### 3.2 Sécurité (ISO 6.6)

#### Authentification et contrôle d'accès
- Sessions serveur avec cookie `httpOnly`, `sameSite=lax`, `secure` en production
- Mots de passe hashés avec bcrypt (coût 12)
- Rôles : `OWNER`, `MANAGER`, `COLLABORATOR` avec contrôle granulaire via `requireOwner`, `requireManager`, `canManage`
- Les routes API filtrent par `companyId` pour isoler les données entre entreprises

#### Rate limiting
- Maximum 5 tentatives de connexion par email sur 15 minutes
- Au-delà, l'utilisateur est bloqué avec un message d'erreur
- Le compteur se réinitialise après 15 minutes ou en cas de succès

#### En-têtes de sécurité (next.config.ts)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

#### Journal d'audit
Toutes les actions sensibles sont tracées dans la table `AuditLog` : qui (userId), quoi (action, entity), quand (createdAt), détails.

### 3.3 API externe — Taux de change (ISO 6.3)

- Appel à `https://api.exchangerate.host/latest?base=DT&symbols=EUR`
- Timeout de 5 secondes avec `AbortController`
- En cas d'indisponibilité : affichage « Taux indisponible » sans planter l'application
- Le solde DT est converti en EUR sur le dashboard (uniquement pour OWNER/MANAGER)

---

## 4. Comment implémenter (étape par étape)

### Étape 1 — Créer les routes API REST

```bash
mkdir -p app/api/v1/invoices app/api/v1/invoices/[id]
```

Créer `app/api/v1/invoices/route.ts` (liste des factures) et `app/api/v1/invoices/[id]/route.ts` (détail d'une facture). Voir les fichiers déjà créés dans ce dépôt.

**Test manuel :**
```bash
npm run dev
# Ouvrir http://localhost:3000/api/v1/invoices avec un cookie de session valide
```

### Étape 2 — Ajouter les en-têtes de sécurité

Modifier `next.config.ts` pour ajouter la fonction `async headers()` avec les 5 en-têtes de sécurité (déjà fait).

**Vérification :**
```bash
curl -I http://localhost:3000
# Doit retourner X-Frame-Options: DENY, X-Content-Type-Options: nosniff, etc.
```

### Étape 3 — Ajouter le rate limiting sur le login

Modifier `lib/actions/auth.ts` pour ajouter :
- `LOGIN_ATTEMPTS` Map pour tracer les tentatives par email
- `checkRateLimit(email)` — retourne `{ allowed, remaining }`
- `recordFailedLogin(email)` — incrémente le compteur
- Intégration dans la fonction `login()` (déjà fait)

### Étape 4 — Ajouter l'API de taux de change

Créer `lib/currency.ts` avec :
- `getEurRate()` — fetch sur `api.exchangerate.host`, timeout 5s, retour `{ rate, source }`
- `convertToEur(amountDT)` — conversion DT → EUR

Modifier `app/(workspace)/dashboard/page.tsx` pour :
- Importer `getEurRate`
- Appeler l'API en parallèle avec `getForecastData`
- Afficher le solde en EUR ou « Taux indisponible »

### Étape 5 — Créer la collection Postman

Fichier : `tests/api/cashpilot.postman_collection.json` (déjà créé)

La collection contient 6 tests :
1. GET /api/v1/invoices — 200 + structure JSON + temps de réponse < 500ms
2. GET /api/v1/invoices — 401 (non authentifié)
3. GET /api/v1/invoices/[id] — 200 détail avec paiements et reste dû correct
4. GET /api/v1/invoices/[id] — 404 (facture inconnue)
5. GET /api/v1/invoices — 403 (collaborateur)
6. GET /api/v1/invoices/[id] — temps de réponse < 500ms

### Étape 6 — Exécuter les tests avec Newman

```bash
# 1. Installer Newman
npm i -D newman newman-reporter-htmlextra

# 2. Lancer l'application (sur un autre terminal)
npm run dev

# 3. Se connecter dans le navigateur, copier la valeur du cookie cashpilot_session

# 4. Exécuter Newman
npx newman run tests/api/cashpilot.postman_collection.json \
  -r cli,htmlextra \
  --reporter-htmlextra-export docs/preuves/6.3-newman.html
```

**Rapport :** `docs/preuves/6.3-newman.html`

### Étape 7 — SAST avec Semgrep

```bash
docker run --rm -v "${PWD}:/src" semgrep/semgrep semgrep \
  --config p/owasp-top-ten \
  --config p/typescript \
  --json -o docs/preuves/6.6-semgrep.json
```

Lister les alertes et corriger les plus graves. Documenter dans le rapport ISO.

**Preuve :** `docs/preuves/6.6-semgrep.json`

### Étape 8 — DAST avec OWASP ZAP

**Avant durcissement :**
```bash
# Lancer l'app sur le port 3000
npm run build && npm start

# Scan ZAP
docker run --rm -v "${PWD}:/zap/wrk:rw" -t \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r 6.6-zap-avant.html
```

**Après durcissement** (en-têtes + rate limiting déjà appliqués) :
```bash
docker run --rm -v "${PWD}:/zap/wrk:rw" -t \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r 6.6-zap-apres.html
```

**Preuves :** `docs/preuves/6.6-zap-avant.html` et `docs/preuves/6.6-zap-apres.html`

### Étape 9 — Tests de contrôle d'accès

Tester les scénarios suivants et capturer les écrans :

1. **Collaborateur tente de valider une facture** → doit être refusé (403 ou redirection)
2. **Collaborateur tente d'approuver une dépense** → doit être refusé
3. **Utilisateur d'une autre entreprise accède à une facture** → 403/404
4. **Accès à un reçu sans autorisation** → 401/403

**Preuve :** `docs/preuves/6.6-controle-acces.png`

### Étape 10 — Affichage du solde en EUR (API externe)

Sur le dashboard, ajouter une carte « SOLDE EN EUR » qui :
- Affiche le solde DT converti en EUR quand l'API répond
- Affiche « Taux indisponible » quand l'API est jointe mais échoue ou indisponible
- Ne fait jamais planter l'application (try/catch + timeout)

**Preuve :** `docs/preuves/6.3-api-externe.png`

---

## 5. Définitions : OWASP, SAST, DAST

### 5.1 OWASP (Open Web Application Security Project)

**Définition :** L'OWASP est une fondation à but non lucratif dédiée à l'amélioration de la sécurité des logiciels. Elle produit des outils, des documents, des forums et des projets open source pour aider les organisations à concevoir, développer et déployer des applications sécurisées.

**OWASP Top 10 :** C'est la liste des 10 risques de sécurité les plus critiques pour les applications web, mise à jour périodiquement. Elle sert de référence pour l'évaluation et le traitement des vulnérabilités.

| Rang (2021) | Risque | Description |
|-------------|--------|-------------|
| A01 | Broken Access Control | Contrôle d'accès défaillant — un utilisateur accède à des données ou actions hors de ses droits |
| A02 | Cryptographic Failures | Défaillances cryptographiques — chiffrement faible, mots de passe non hashés, clés exposées |
| A03 | Injection | Injection — SQL, NoSQL, LDAP, commande OS via des données non fiables injectées dans un interpréteur |
| A04 | Insecure Design | Conception non sécurisée — absence de contrôles de sécurité dès la conception (threat modeling manquant) |
| A05 | Security Misconfiguration | Mauvaise configuration de sécurité — par défaut non sécurisée, fonctionnalités inutiles activées |
| A06 | Vulnerable and Outdated Components | Composants vulnérables et obsolètes — bibliothèques avec CVE connues |
| A07 | Identification and Authentication Failures | Échecs d'identification et d'authentification — session volée, brute force, mots de passe faibles |
| A08 | Software and Data Integrity Failures | Défaillances d'intégrité logicielle et des données — mise à jour non signée, deserialization non fiable |
| A09 | Security Logging and Monitoring Failures | Défaillances de journalisation et de surveillance — pas de traces d'audit, détection tardive des intrusions |
| A10 | Server-Side Request Forgery (SSRF) | Requêtes falsifiées côté serveur — l'app est poussée à requêter des ressources internes ou externes |

**Dans CashPilot :** Le tableau complet des protections par risque OWASP est détaillé à la section 6.6 (voir `docs/OWASP-6.6-REPORT.md`).

---

### 5.2 SAST (Static Application Security Testing)

**Définition :** Le SAST (test de sécurité statique des applications) est une méthode d'analyse du code source, du bytecode ou du binaire d'une application **sans l'exécuter**. Il cherche des vulnérabilités de sécurité (failles d'injection, mots de passe en dur, erreurs de configuration, etc.) directement dans le texte du code.

**Caractéristiques :**
- Analyse statique (code non exécuté)
- Détecte les vulnérabilités tôt dans le cycle de développement (shift left)
- Donne la ligne et le fichier exact du problème
- Peut produire des faux positifs

**Outil utilisé dans CashPilot : Semgrep**

Semgrep est un outil SAST open source qui analyse le code source à l'aide de règles de correspondance de patterns. Il supporte TypeScript et les règles OWASP Top 10.

**Commande :**
```bash
docker run --rm -v "${PWD}:/src" semgrep/semgrep semgrep \
  --config p/owasp-top-ten \
  --config p/typescript \
  --json -o docs/preuves/6.6-semgrep.json
```

**Preuve attendue :** `docs/preuves/6.6-semgrep.json`

**Dans le rapport ISO 25010 :** Le SAST couvre les caractéristiques 6.6 (sécurité) et 6.7 (maintenabilité).

---

### 5.3 DAST (Dynamic Application Security Testing)

**Définition :** Le DAST (test de sécurité dynamique des applications) est une méthode d'analyse d'une application **en cours d'exécution**. Il simule des attaques réelles contre l'application déployée pour détecter des vulnérabilités exploitables (XSS, injections, problèmes d'authentification, en-têtes manquants, etc.) sans accès au code source.

**Caractéristiques :**
- Analyse dynamique (application exécutée)
- Teste l'application comme un attaqueur externe le ferait
- Ne donne pas la ligne de code exacte, mais l'URL et le paramètre vulnérable
- Nécessite une instance de l'application en fonctionnement

**Outil utilisé dans CashPilot : OWASP ZAP (Zed Attack Proxy)**

ZAP est un scanner DAST open source maintenu par OWASP. Il explore l'application, envoie des requêtes malveillantes et rapporte les failles détectées.

**Commande (avant durcissement) :**
```bash
docker run --rm -v "${PWD}:/zap/wrk:rw" -t \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r 6.6-zap-avant.html
```

**Commande (après durcissement) :**
```bash
docker run --rm -v "${PWD}:/zap/wrk:rw" -t \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r 6.6-zap-apres.html
```

**Preuves attendues :** `docs/preuves/6.6-zap-avant.html` et `docs/preuves/6.6-zap-apres.html`

**Dans le rapport ISO 25010 :** Le DAST couvre la caractéristique 6.6 (sécurité). La comparaison avant/après durcissement est la preuve principale de l'efficacité des mesures de sécurité.

---

### 5.4 Différence entre SAST et DAST

| Critère | SAST (Semgrep) | DAST (OWASP ZAP) |
|---------|----------------|------------------|
| Moment d'exécution | Avant l'exécution (développement, CI) | Pendant l'exécution (application déployée) |
| Accès au code | Oui (code source requis) | Non (teste via HTTP comme un attaquant) |
| Type de vulnérabilités | Faille dans le code (injection, secrets en dur) | Faille exploitable à distance (XSS, headers manquants, auth) |
| Précision | Ligne de fichier exacte | URL et paramètre vulnérable |
| Faux positifs | Plus fréquents | Moins fréquents |
| Intégration CI | Facile (analyse à chaque commit) | Nécessite une instance de l'app en cours |

**Dans CashPilot :** Les deux sont utilisés de manière complémentaire — Semgrep pour analyser le code source, ZAP pour scanner l'application en cours d'exécution, avec une comparaison avant/après durcissement pour mesurer l'impact des en-têtes de sécurité et du rate limiting.

---

### 5.5 SCA (Software Composition Analysis) — complément

Bien que ce ne soit pas une demande directe de Nader, le cahier des charges inclut une couche SCA gérée par Fares (npm audit). Elle analyse les dépendances npm pour détecter les CVE connues.

**Outil :** `npm audit` → `docs/preuves/6.6-npm-audit.json`

---

## 6. Rapport ISO 25010 — Section 6.6 (Sécurité)

Contenu à inclure dans le rapport de conformité (voir `docs/OWASP-6.6-REPORT.md`) :

### Tableau OWASP Top 10

Pour chacun des 10 risques OWASP, indiquer la protection implémentée dans CashPilot :

| Risque OWASP | Protection CashPilot |
|-------------|---------------------|
| A01 Broken Access Control | Contrôle d'accès par rôle, filtrage companyId, requireOwner/requireManager |
| A02 Cryptographic Failures | bcrypt (coût 12), cookie httpOnly/sameSite/secure |
| A03 Injection | Prisma ORM requêtes paramétrées, validation des entrées |
| A04 Insecure Design | Règles métier RM1-RM7, transactions Prisma, journal d'audit |
| A05 Security Misconfiguration | En-têtes sécurité dans next.config.ts |
| A06 Vulnerable Components | npm audit, dépendances à jour |
| A07 Identification & Auth Failures | Sessions serveur, rate limiting login, bcrypt |
| A08 Software & Data Integrity | Prisma transactions, sessions côté serveur |
| A09 Security Logging | AuditLog complet (qui, quoi, quand) |
| A10 SSRF | API taux de change avec timeout et try/catch |

### Outils de sécurité

| Outil | Type | Preuve |
|-------|------|--------|
| Semgrep | SAST | `docs/preuves/6.6-semgrep.json` |
| OWASP ZAP | DAST | `docs/preuves/6.6-zap-avant.html`, `6.6-zap-apres.html` |
| npm audit | SCA | `docs/preuves/6.6-npm-audit.json` (par Fares) |

---

## 6. Checklist de validation avant soutenance

- [ ] `app/api/v1/invoices/route.ts` — GET liste fonctionne (200 JSON)
- [ ] `app/api/v1/invoices/[id]/route.ts` — GET détail fonctionne (200, 404)
- [ ] Session non connectée → 401 sur les routes API
- [ ] Collaborateur → 403 sur les routes API (ou selon règles métier)
- [ ] Facture d'une autre entreprise → 404
- [ ] Postman collection exportée : `tests/api/cashpilot.postman_collection.json`
- [ ] Newman exécuté : `docs/preuves/6.3-newman.html`
- [ ] Rate limiting login : 5 tentatives / 15 min bloquent l'accès
- [ ] En-têtes de sécurité présents dans `next.config.ts`
- [ ] Semgrep exécuté : `docs/preuves/6.6-semgrep.json`
- [ ] ZAP avant : `docs/preuves/6.6-zap-avant.html`
- [ ] ZAP après : `docs/preuves/6.6-zap-apres.html`
- [ ] Test contrôle d'accès capturé : `docs/preuves/6.6-controle-acces.png`
- [ ] Solde EUR affiché sur dashboard : `docs/preuves/6.3-api-externe.png`
- [ ] Fallback « Taux indisponible » quand l'API de change est down
- [ ] Rapport OWASP Top 10 rédigé (section 6.6 du rapport ISO)

---

## 7. À la soutenance

Présenter :
1. La sécurité de CashPilot (en-têtes, rate limiting, bcrypt, contrôle d'accès)
2. Le rapport ZAP avant / après durcissement
3. Une démo d'un 403 pour le collaborateur (tentative de validation de facture bloquée)
4. Les tests API via Postman/Newman

---

**Fin du document — Mission Nader**
