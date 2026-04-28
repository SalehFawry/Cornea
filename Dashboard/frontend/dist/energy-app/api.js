// === API CLIENT ===
// Same-origin API calls using native fetch
window.api = (function() {
  const BASE = '';
  const API_KEY = localStorage.getItem('apiKey') || '';

  async function request(method, endpoint, params = null, body = null) {
    let url = BASE + endpoint;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, v);
      });
      const s = qs.toString();
      if (s) url += '?' + s;
    }
    const opts = { method, headers: { 'Accept': 'application/json' } };
    if (API_KEY) opts.headers['X-API-KEY'] = API_KEY;
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  function get(endpoint, params) { return request('GET', endpoint, params, null); }

  return {
    // Branches
    listBranches: () => get('/api/v1/branches'),

    // Employees
    listEmployees: (branchId) => get(`/api/v1/branches/${branchId}/employees`),
    employeeWeeklyHours: (branchId, params) => get(`/api/v1/branches/${branchId}/employees/weekly-hours`, params),
    employeeDailyBreakdown: (branchId, params) => get(`/api/v1/branches/${branchId}/employees/daily-breakdown`, params),

    // Attendance
    getAttendance: (branchId, params) => get(`/api/v1/branches/${branchId}/attendance`, { limit: 1000, ...params }),
    getAttendanceSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/attendance/summary`, params),

    // Customers
    getCustomers: (branchId, params) => get(`/api/v1/branches/${branchId}/customers`, { limit: 1000, ...params }),
    getCustomersSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/customers/summary`, params),
    getCustomersHourly: (branchId, params) => get(`/api/v1/branches/${branchId}/customers/hourly`, params),
    getCustomersDaily: (branchId, params) => get(`/api/v1/branches/${branchId}/customers/daily`, params),
    getOccupancy: (branchId) => get(`/api/v1/branches/${branchId}/customers/occupancy`),

    // Shutter
    getShutterStatus: (branchId) => get(`/api/v1/branches/${branchId}/shutter/status`),
    getShutterEvents: (branchId, params) => get(`/api/v1/branches/${branchId}/shutter/events`, { limit: 1000, ...params }),
    getShutterSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/shutter/summary`, params),

    // Alerts
    getAlerts: (branchId, params) => get(`/api/v1/branches/${branchId}/alerts`, { limit: 1000, ...params }),
    getAlertsSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/alerts/summary`, params),
  };
})();

// === HELPERS ===
window.helpers = (function() {
  function toISO(date) {
    if (!date) return '';
    if (typeof date === 'string') return date.includes('T') ? date.split('T')[0] : date;
    return date.toISOString().split('T')[0];
  }

  function todayISO() { return toISO(new Date()); }

  function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toISO(d);
  }

  function formatTime(timestamp) {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return '—';
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds)) return '—';
    if (seconds < 60) return Math.round(seconds) + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m < 60) return m + 'm ' + (s ? s + 's' : '').trim();
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h + 'h ' + mm + 'm';
  }

  function formatHours(hours) {
    if (hours == null || isNaN(hours)) return '—';
    return Number(hours).toFixed(1) + 'h';
  }

  function formatNumber(n, decimals = 0) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals });
  }

  function formatPercent(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(1) + '%';
  }

  // Format decimal hours as "Xh Ym" or "Y mins"
  function formatWorkingHours(hoursDecimal) {
    if (hoursDecimal == null || isNaN(hoursDecimal) || hoursDecimal <= 0) return '0 mins';
    const hours = Math.floor(hoursDecimal);
    let minutes = Math.round((hoursDecimal - hours) * 60);
    if (minutes >= 60) return (hours + 1) + ' hour' + (hours + 1 !== 1 ? 's' : '');
    if (hours === 0) return minutes + ' mins';
    if (minutes === 0) return hours + ' hour' + (hours !== 1 ? 's' : '');
    return hours + 'h ' + minutes + 'm';
  }

  function formatMinutes(mins) {
    if (mins == null || isNaN(mins) || mins <= 0) return 'N/A';
    const m = Math.floor(mins);
    const s = Math.round((mins - m) * 60);
    if (s > 0) return m + 'm ' + s + 's';
    return m + ' minutes';
  }

  function formatTimeAmPm(totalSeconds) {
    if (totalSeconds == null || isNaN(totalSeconds)) return 'N/A';
    let h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const amPm = h >= 12 ? 'PM' : 'AM';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;
    return displayH + ':' + String(m).padStart(2, '0') + ' ' + amPm;
  }

  function toSecondsFromMidnight(dt) {
    if (!dt) return null;
    const d = new Date(dt);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }

  function timeToMinutes(ts) {
    if (!ts) return 0;
    const parts = ts.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  function minutesToTimeStr(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function formatAlertType(alertType) {
    return String(alertType || '').replace(/([A-Z])/g, ' $1').trim();
  }

  function classifyShutterEvent(eventType) {
    const lower = String(eventType || '').toLowerCase();
    if (lower.includes('open')) return 'Opened';
    if (lower.includes('partial')) return 'Partially Closed';
    if (lower.includes('close')) return 'Closed';
    return eventType;
  }

  function buildDateRange(startDate, endDate) {
    const dates = [];
    const d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  function extractTime(timestamp) {
    if (!timestamp) return '—';
    const s = String(timestamp);
    if (s.includes('T')) {
      const part = s.split('T')[1];
      if (part) return part.slice(0, 8);
    }
    if (s.length >= 19) return s.slice(11, 19);
    return '—';
  }

  function downloadCSV(filename, rows) {
    if (!rows || rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(',')].concat(
      rows.map(r => cols.map(c => {
        let v = r[c];
        if (v === null || v === undefined) return '';
        v = String(v);
        if (v.includes(',') || v.includes('"') || v.includes('\n')) v = '"' + v.replace(/"/g, '""') + '"';
        return v;
      }).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function uniqueRegions(branches) {
    const set = new Set();
    branches.forEach(b => { if (b.region) set.add(b.region); });
    return Array.from(set).sort();
  }

  function uniqueAreas(branches, region = '') {
    const set = new Set();
    branches.forEach(b => {
      if (region && b.region !== region) return;
      if (b.area) set.add(b.area);
    });
    return Array.from(set).sort();
  }

  function filterBranches(branches, region = '', area = '') {
    return branches.filter(b => (!region || b.region === region) && (!area || b.area === area));
  }

  return {
    toISO, todayISO, daysAgoISO,
    formatTime, formatDateTime, formatDuration, formatHours, formatNumber, formatPercent,
    formatWorkingHours, formatMinutes, formatTimeAmPm, toSecondsFromMidnight,
    timeToMinutes, minutesToTimeStr, formatAlertType, classifyShutterEvent,
    buildDateRange, extractTime,
    downloadCSV, uniqueRegions, uniqueAreas, filterBranches
  };
})();
