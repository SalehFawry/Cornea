#!/bin/bash
# Switch to Energy Dashboard
# This script switches from the original dashboard to the energy dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo "Switching to Energy Dashboard"
echo "=============================================="
echo ""

# Check if energy-dashboard-live.html exists
if [ ! -f "${SCRIPT_DIR}/energy-dashboard-live.html" ]; then
    echo "ERROR: Energy dashboard file not found!"
    echo "  Looking for: energy-dashboard-live.html"
    exit 1
fi

# Backup current index.html (only if it isn't already our redirect)
echo "Step 1: Backing up current index.html..."
if [ -f "${SCRIPT_DIR}/index.html" ] && ! grep -q "energy-dashboard" "${SCRIPT_DIR}/index.html" 2>/dev/null; then
    cp "${SCRIPT_DIR}/index.html" "${SCRIPT_DIR}/index-current-backup.html"
    echo "  ✓ Backed up to index-current-backup.html"
else
    echo "  · index.html already points at energy dashboard (skipping backup)"
fi
echo ""

# Create redirect index.html (live data, real backend)
echo "Step 2: Creating energy dashboard redirect..."
cat > "${SCRIPT_DIR}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=./energy-dashboard-live.html">
  <title>Redirecting to Energy Dashboard (Live)...</title>
</head>
<body>
  <p>Redirecting to <a href="./energy-dashboard-live.html">Energy Dashboard (Live Data)</a>...</p>
  <p><a href="./index-original.html">Original Fawry Dashboard</a></p>
</body>
</html>
EOF
echo "  ✓ index.html updated to redirect to energy dashboard (live)"
echo ""

echo "=============================================="
echo "✓ Switch Complete!"
echo "=============================================="
echo ""
echo "Energy Dashboard is now active."
echo ""
echo "URL: http://localhost:8765 (or your configured port)"
echo ""
echo "To revert to original dashboard:"
echo "  ./revert-to-original.sh"
echo ""
echo "=============================================="
