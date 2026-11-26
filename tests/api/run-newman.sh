#!/usr/bin/env bash
# Tests API (ISO 25010 – 6.3 et 6.6) avec Newman.
# Prérequis : l'application tourne sur http://localhost:3000 (npm run dev ou npm start)
# et la base de démonstration existe (npm run db:seed).
set -euo pipefail

echo "=== CashPilot – tests API (Newman) ==="
echo "[1/2] Création de sessions de test (Owner, Collaborateur)…"
eval "$(npx tsx tests/api/create-api-sessions.ts)"

echo "[2/2] Exécution de la collection Postman…"
mkdir -p docs/preuves
npx newman run tests/api/cashpilot.postman_collection.json \
  --env-var "session_token=${OWNER_TOKEN}" \
  --env-var "collaborator_token=${COLLABORATOR_TOKEN}" \
  --env-var "invoice_id=${INVOICE_ID}" \
  -r cli,htmlextra \
  --reporter-htmlextra-export docs/preuves/6.3-newman.html

echo "Rapport HTML : docs/preuves/6.3-newman.html"
