# CashPilot - Tests de contrôle d'accès - Nader's mission (ISO 6.6)

## Scénarios à tester

### 1. Collaborateur ne peut pas valider une facture
- Se connecter en tant que COLLABORATOR
- Accéder à `/invoices/[id]` et tenter de valider
- Résultat attendu : accès refusé (redirection ou erreur 403)

### 2. Collaborateur ne peut pas approuver une dépense
- Se connecter en tant que COLLABORATOR
- Accéder à `/expenses/[id]` et tenter d'approuver
- Résultat attendu : accès refusé

### 3. Utilisateur d'une autre entreprise ne voit pas les factures
- Se connecter avec un utilisateur appartenant à l'entreprise A
- Appeler `GET /api/v1/invoices` ou `/api/v1/invoices/[id_dautre_entreprise]`
- Résultat attendu : 404 ou 403 (facture inconnue ou d'une autre entreprise)

### 4. Reçu non téléchargeable sans autorisation
- Tenter d'accéder à `/expenses/[id]/receipt` sans être authentifié ou sans droit
- Résultat attendu : 401 ou 403

## Comment exécuter

1. Lancer l'app : `npm run dev`
2. Se connecter avec différents rôles (OWNER, MANAGER, COLLABORATOR)
3. Tenter chaque scénario ci-dessus
4. Capturer l'écran pour chaque refus d'accès
5. Déposer la capture dans `docs/preuves/6.6-controle-acces.png`

## Preuve attendue

- `docs/preuves/6.6-controle-acces.png` — capture d'un 403 pour le collaborateur
