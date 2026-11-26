set -e

echo "=== CashPilot API Tests (Newman) ==="

# Install Newman and reporter
echo "[1/4] Installing Newman + htmlextra reporter..."
npm i -D newman newman-reporter-htmlextra

# Run the collection and export HTML report
echo "[2/4] Running Postman collection via Newman..."
npx newman run tests/api/cashpilot.postman_collection.json \
  -r cli,htmlextra \
  --reporter-htmlextra-export docs/preuves/6.3-newman.html

echo "[3/4] HTML report exported: docs/preuves/6.3-newman.html"

# Summary
echo ""
echo "=== Newman run complete ==="
echo "Open docs/preuves/6.3-newman.html in a browser to view the report."
echo ""
echo "Preuves à déposer (ISO 6.3):"
echo "  - docs/preuves/6.3-newman.html"
