# Dashboard Switching Guide

## Overview
You now have THREE dashboards available:
1. **Energy Dashboard LIVE** (active) - Real data from your database, all original pages re-skinned
2. **Energy Dashboard DEMO** - Mock data for visual testing
3. **Original Fawry Dashboard** (production) - Untouched, ready to be put back in seconds

## Current Status
- **Energy Dashboard (LIVE)** is currently active at: http://localhost:8765
- Connects to your real API and displays live data for all four pages
  (Dashboard / Shutter State / Customers / Alerts)
- **Original Dashboard** is fully backed up and can be restored anytime

## File Locations

### In `/home/sashady/Cornea/Dashboard/frontend/dist/`:
- `energy-dashboard-live.html` - **LIVE** energy dashboard entry point (loads `energy-app/bundle.js`)
- `energy-app/` - The pre-compiled live React app:
  - `styles.css` - Theme + components CSS
  - `api.js` / `components.js` / `page-*.js` / `app.js` - Source (JSX)
  - `*.compiled.js` and `bundle.js` - Generated artifacts (`React.createElement` calls)
  - `tools/build_jsx.cjs` - Build script (regenerates `bundle.js`)
- `energy-dashboard.html` - Demo energy dashboard (mock data)
- `index.html` - Currently redirects to the live energy dashboard
- `index-original.html` - Backup of original index
- `dist-original-backup/` - Complete backup of original production dist folder
- `src-original-backup/` - Complete backup of original source files
- `serve_local.py` - Local Python server (also proxies `/api/*` to the backend)

## Rebuilding after editing the energy app

If you change any source file in `energy-app/`, regenerate the bundle:

```bash
cd /home/sashady/Cornea/Dashboard/frontend/dist
node energy-app/tools/build_jsx.cjs
```

This rewrites `energy-app/bundle.js` (loaded by `energy-dashboard-live.html`).

## Live Data Dashboard

The **energy-dashboard-live.html** connects directly to your database via the API:

### Data Sources:
- **Workforce Analytics** - Real employee attendance data (active employees, working hours)
- **Shutter Status** - Live shutter events and current state (open/close events)
- **Customer Flow** - Actual customer visit metrics (total customers, wait times, service times)
- **System Alerts** - Real alerts from your monitoring system

### API Endpoints Used:
- `GET /api/v1/branches` - List all branches
- `GET /api/v1/branches/{id}/employees` - Employee list for selected branch
- `GET /api/v1/branches/{id}/attendance?date=YYYY-MM-DD` - Attendance records
- `GET /api/v1/branches/{id}/customers?date=YYYY-MM-DD` - Customer visits
- `GET /api/v1/branches/{id}/shutter/events?date=YYYY-MM-DD` - Shutter events
- `GET /api/v1/branches/{id}/shutter/status` - Current shutter status
- `GET /api/v1/branches/{id}/alerts?date=YYYY-MM-DD` - System alerts

### Features:
- **Branch Selector** - Choose which branch to monitor
- **Date Picker** - View data for any specific date
- **Refresh Button** - Reload all data on demand
- **Real-time Sparklines** - Visual representation of working hours
- **Data Tables** - Shows recent attendance and shutter events

## How to Switch Between Dashboards

### Option 1: Use the Scripts (Recommended)

**Revert to Original Production Dashboard:**
```bash
cd /home/sashady/Cornea/Dashboard/frontend/dist
./revert-to-original.sh
```

**Switch Back to Energy Dashboard:**
```bash
cd /home/sashady/Cornea/Dashboard/frontend/dist
./switch-to-energy.sh
```

### Option 2: Manual Switching

**To Energy Dashboard:**
```bash
cp index-original.html index.html  # First restore original
cp index.html energy-redirect.html  # Save redirect
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=./energy-dashboard.html">
</head>
<body>
  <p>Redirecting to <a href="./energy-dashboard.html">Energy Dashboard</a>...</p>
</body>
</html>
EOF
```

**To Original Dashboard:**
```bash
cp index-original.html index.html
```

## Energy Dashboard Features

The new energy dashboard includes all the design elements from your specification:

### Layout & Design
- Dark theme with near-black background (#0F1110)
- Dark cards (#181A19) with subtle borders
- Light accent cards (#D8E2DC) for contrast
- Mint accent color (#A7F3D0) for highlights
- Inter font family
- 24px card border radius

### Components Implemented
1. **Navigation Sidebar** - "Dashboard", "My apartments", "Reporting", "Settings" (no logo)
2. **Page Header** - "Overview" title with live time display
3. **Total Energy Consumption Card** - 3 categories with sparkline mini charts
4. **Green Connections Card** - Office status, toggle switch, isometric illustration
5. **Recommendations Card** - Personalized tips with tags
6. **Tracking Card** (light) - Solar energy stats
7. **Detailed Report Card** - Weekly mini bar chart with trend arrows
8. **Green Energy Usage Card** (light) - Timeline nodes

### Interactive Elements
- Toggle switches
- Hover effects on sparklines
- Mobile-responsive sidebar
- Live clock

## Production Deployment Notes

When you're ready to deploy to production:

1. **For Energy Dashboard:**
   - Copy `energy-dashboard.html` to your production server
   - Update `index.html` to redirect to it
   - Or serve `energy-dashboard.html` directly as the root

2. **To Revert Production:**
   - Restore files from `dist-original-backup/` to your production server
   - Or run `./revert-to-original.sh` on the production server (if backups exist there)

## Server Control

**Current server running on port 8765**

Stop server:
```bash
ps aux | grep serve_local.py | grep -v grep | awk '{print $2}' | xargs kill -9
```

Start server:
```bash
cd /home/sashady/Cornea/Dashboard/frontend/dist
python3 serve_local.py
```

## Support

If you need to recover the original dashboard and the backups are lost:
- Source code backups exist in `src-original-backup/`
- The original built files are in `dist-original-backup/`
- The original index is saved as `index-original.html`
