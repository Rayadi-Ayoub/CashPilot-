# CashPilot - DAST (OWASP ZAP) - Nader's mission (ISO 6.6)

## Étape 1 — Lancer l'application

```bash
npm run build
npm start
# L'application écoute sur http://localhost:3000
```

## Étape 2 — Scan ZAP avant durcissement

```bash
docker run --rm -v "${PWD}:/zap/wrk:rw" -t \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r 6.6-zap-avant.html
```

Le rapport est généré dans `docs/preuves/6.6-zap-avant.html`.

## Étape 3 — Durcissement (déjà appliqué dans next.config.ts)

En-têtes de sécurité ajoutées :
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` restrictive
- `Permissions-Policy` restrictive

Rate limiting login : 5 tentatives par email sur 15 minutes (dans `lib/actions/auth.ts`).

## Étape 4 — Scan ZAP après durcissement

```bash
docker run --rm -v "${PWD}:/zap/wrk:rw" -t \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r 6.6-zap-apres.html
```

Le rapport est généré dans `docs/preuves/6.6-zap-apres.html`.

## Preuves attendues (ISO 6.6)

- `docs/preuves/6.6-zap-avant.html` — rapport avant durcissement
- `docs/preuves/6.6-zap-apres.html` — rapport après durcissement
- Comparaison avant/après dans le rapport ISO (section 6.6)
