#!/bin/bash
# Revert script to restore the original production dashboard
# This script restores the original Fawry Dashboard from backup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/dist-original-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=============================================="
echo "Reverting to Original Production Dashboard"
echo "=============================================="
echo ""

# Check if backup exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found at:"
    echo "  $BACKUP_DIR"
    echo ""
    echo "Cannot revert - backup is missing!"
    exit 1
fi

# Create a backup of current state (energy dashboard)
echo "Step 1: Creating backup of current energy dashboard..."
CURRENT_BACKUP="${SCRIPT_DIR}/energy-dashboard-backup-${TIMESTAMP}"
cp -r "${SCRIPT_DIR}" "$CURRENT_BACKUP" 2>/dev/null || true
rm -rf "${CURRENT_BACKUP}/dist-original-backup" 2>/dev/null || true
echo "  ✓ Current state backed up to:"
echo "    energy-dashboard-backup-${TIMESTAMP}"
echo ""

# Restore original files
echo "Step 2: Restoring original production files..."

# Restore original index.html
if [ -f "${BACKUP_DIR}/index.html" ]; then
    cp "${BACKUP_DIR}/index.html" "${SCRIPT_DIR}/index.html"
    echo "  ✓ index.html restored"
fi

# Restore assets
if [ -d "${BACKUP_DIR}/assets" ]; then
    rm -rf "${SCRIPT_DIR}/assets"
    cp -r "${BACKUP_DIR}/assets" "${SCRIPT_DIR}/assets"
    echo "  ✓ assets/ restored"
fi

# Restore other important files
for file in favicon.svg fawry_logo.png mobile-drawer.js serve.py; do
    if [ -f "${BACKUP_DIR}/${file}" ]; then
        cp "${BACKUP_DIR}/${file}" "${SCRIPT_DIR}/${file}"
        echo "  ✓ ${file} restored"
    fi
done

echo ""
echo "=============================================="
echo "✓ Revert Complete!"
echo "=============================================="
echo ""
echo "The original Fawry Dashboard has been restored."
echo ""
echo "To switch back to Energy Dashboard:"
echo "  cp index-original.html index.html"
echo ""
echo "Energy dashboard backup:"
echo "  energy-dashboard-backup-${TIMESTAMP}/"
echo ""
echo "=============================================="
