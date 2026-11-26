# CashPilot - SAST (Semgrep) - Nader's mission (ISO 6.6)

## Commande Semgrep

```bash
docker run --rm -v "${PWD}:/src" semgrep/semgrep semgrep \
  --config p/owasp-top-ten \
  --config p/typescript \
  --json -o docs/preuves/6.6-semgrep.json
```

## Analyse des alertes

Après exécution, ouvrir `docs/preuves/6.6-semgrep.json` et lister les alertes par sévérité. Corriger les plus graves (OWASP Top 10 : injection, auth broken, XSS, etc.).

## Preuve attendue

- `docs/preuves/6.6-semgrep.json` — rapport Semgrep brut
- Liste des alertes corrigées dans le rapport ISO (section 6.6)

## Intégration CI

Ajouter à `.github/workflows/ci.yml` si souhaité :
```yaml
- name: SAST Semgrep
  run: |
    docker run --rm -v "${{ github.workspace }}:/src" semgrep/semgrep semgrep --config p/owasp-top-ten --config p/typescript
```
