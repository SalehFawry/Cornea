// Auto-generated bundle - DO NOT EDIT.
// Source files: energy-app/{api,components,page-*,app}.js
// Run energy-app/tools/build_jsx.js to regenerate.


// ===== api =====
// === API CLIENT ===
// Same-origin API calls using native fetch
window.api = function () {
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
    const opts = {
      method,
      headers: {
        'Accept': 'application/json'
      }
    };
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
  function get(endpoint, params) {
    return request('GET', endpoint, params, null);
  }
  return {
    // Branches
    listBranches: () => get('/api/v1/branches'),
    // Employees
    listEmployees: branchId => get(`/api/v1/branches/${branchId}/employees`),
    employeeWeeklyHours: (branchId, params) => get(`/api/v1/branches/${branchId}/employees/weekly-hours`, params),
    employeeDailyBreakdown: (branchId, params) => get(`/api/v1/branches/${branchId}/employees/daily-breakdown`, params),
    // Attendance
    getAttendance: (branchId, params) => get(`/api/v1/branches/${branchId}/attendance`, {
      limit: 1000,
      ...params
    }),
    getAttendanceSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/attendance/summary`, params),
    // Customers
    getCustomers: (branchId, params) => get(`/api/v1/branches/${branchId}/customers`, {
      limit: 1000,
      ...params
    }),
    getCustomersSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/customers/summary`, params),
    getCustomersHourly: (branchId, params) => get(`/api/v1/branches/${branchId}/customers/hourly`, params),
    getCustomersDaily: (branchId, params) => get(`/api/v1/branches/${branchId}/customers/daily`, params),
    getOccupancy: branchId => get(`/api/v1/branches/${branchId}/customers/occupancy`),
    // Shutter
    getShutterStatus: branchId => get(`/api/v1/branches/${branchId}/shutter/status`),
    getShutterEvents: (branchId, params) => get(`/api/v1/branches/${branchId}/shutter/events`, {
      limit: 1000,
      ...params
    }),
    getShutterSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/shutter/summary`, params),
    // Alerts
    getAlerts: (branchId, params) => get(`/api/v1/branches/${branchId}/alerts`, {
      limit: 1000,
      ...params
    }),
    getAlertsSummary: (branchId, params) => get(`/api/v1/branches/${branchId}/alerts/summary`, params)
  };
}();

// === HELPERS ===
window.helpers = function () {
  function toISO(date) {
    if (!date) return '';
    if (typeof date === 'string') return date.includes('T') ? date.split('T')[0] : date;
    return date.toISOString().split('T')[0];
  }
  function todayISO() {
    return toISO(new Date());
  }
  function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toISO(d);
  }
  function formatTime(timestamp) {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '—';
    }
  }
  function formatDateTime(timestamp) {
    if (!timestamp) return '—';
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '—';
    }
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
    return Number(n).toLocaleString('en-US', {
      maximumFractionDigits: decimals
    });
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
    if (minutes >= 60) return hours + 1 + ' hour' + (hours + 1 !== 1 ? 's' : '');
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
    const m = Math.floor(totalSeconds % 3600 / 60);
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
    const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => {
      let v = r[c];
      if (v === null || v === undefined) return '';
      v = String(v);
      if (v.includes(',') || v.includes('"') || v.includes('\n')) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }).join(','))).join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  function uniqueRegions(branches) {
    const set = new Set();
    branches.forEach(b => {
      if (b.region) set.add(b.region);
    });
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
    toISO,
    todayISO,
    daysAgoISO,
    formatTime,
    formatDateTime,
    formatDuration,
    formatHours,
    formatNumber,
    formatPercent,
    formatWorkingHours,
    formatMinutes,
    formatTimeAmPm,
    toSecondsFromMidnight,
    timeToMinutes,
    minutesToTimeStr,
    formatAlertType,
    classifyShutterEvent,
    buildDateRange,
    extractTime,
    downloadCSV,
    uniqueRegions,
    uniqueAreas,
    filterBranches
  };
}();

// ===== components =====
// === SHARED COMPONENTS ===
const {
  useState,
  useEffect,
  useMemo,
  useCallback
} = React;
const h = window.helpers;

// === LOGO ICON ===
function LogoIcon() {
  return React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("path", {
    d: "M12 2L4 7v10l8 5 8-5V7l-8-5z"
  }), React.createElement("path", {
    d: "M12 7v10M8 9.5l8 5M16 9.5l-8 5"
  }));
}

// === SIDEBAR ===
function Sidebar({
  currentPage,
  onNavigate,
  mobileOpen,
  onCloseMobile
}) {
  const items = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: '⊞'
  }, {
    id: 'shutter',
    label: 'Shutter State',
    icon: '⊟'
  }, {
    id: 'customers',
    label: 'Customers',
    icon: '⊙'
  }, {
    id: 'alerts',
    label: 'Alerts',
    icon: '◬'
  }];
  return React.createElement("aside", {
    className: `sidebar ${mobileOpen ? 'open' : ''}`
  }, React.createElement("div", {
    className: "logo"
  }, React.createElement("div", {
    className: "logo-icon"
  }, React.createElement(LogoIcon, null)), React.createElement("span", {
    className: "logo-text"
  }, "EcoSync")), React.createElement("nav", {
    className: "nav"
  }, items.map(item => React.createElement("button", {
    key: item.id,
    className: `nav-item ${currentPage === item.id ? 'active' : ''}`,
    onClick: () => {
      onNavigate(item.id);
      onCloseMobile && onCloseMobile();
    }
  }, React.createElement("span", {
    style: {
      fontSize: '14px',
      opacity: 0.7
    }
  }, item.icon), React.createElement("span", null, item.label)))), React.createElement("div", {
    className: "sidebar-footer"
  }, React.createElement("div", {
    className: "status-card"
  }, React.createElement("div", {
    className: "status-label"
  }, "System Status"), React.createElement("div", {
    className: "status-indicator"
  }, React.createElement("div", {
    className: "status-dot"
  }), React.createElement("span", {
    className: "status-text"
  }, "Live \xB7 All systems normal")))));
}

// === HEADER ===
function PageHeader({
  title,
  subtitle
}) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }));
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return React.createElement("div", {
    className: "header"
  }, React.createElement("div", null, React.createElement("h1", {
    className: "page-title"
  }, title), subtitle && React.createElement("p", {
    className: "page-subtitle"
  }, subtitle)), React.createElement("div", {
    className: "time-display"
  }, React.createElement("span", {
    className: "time-value"
  }, time), React.createElement("span", {
    className: "time-label"
  }, "Time")));
}

// === LOADING ===
function LoadingSpinner({
  message = 'Loading...'
}) {
  return React.createElement("div", {
    className: "loading-spinner"
  }, React.createElement("div", {
    className: "spinner"
  }), React.createElement("div", {
    className: "loading-text"
  }, message));
}

// === ERROR ===
function ErrorMessage({
  error
}) {
  if (!error) return null;
  return React.createElement("div", {
    className: "error-message"
  }, "\u26A0 ", String(error.message || error));
}

// === STAT CARD ===
function StatCard({
  label,
  value,
  unit,
  subtitle,
  variant = 'dark',
  trend,
  icon
}) {
  const isLight = variant === 'light';
  return React.createElement("div", {
    className: `card ${isLight ? 'card-light' : 'card-dark'}`
  }, label && React.createElement("div", {
    className: "stat-label",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }
  }, icon && React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, icon), React.createElement("span", null, label), trend && React.createElement("span", {
    className: `category-trend ${trend === 'up' ? 'up' : 'down'}`
  }, trend === 'up' ? '↑' : '↓')), React.createElement("div", {
    className: "stat-display"
  }, React.createElement("div", {
    className: "stat-value"
  }, value), unit && React.createElement("div", {
    className: "stat-unit"
  }, unit), subtitle && React.createElement("div", {
    style: {
      fontSize: '11px',
      marginTop: '8px',
      color: isLight ? 'var(--text-inverse-muted)' : 'var(--text-secondary)'
    }
  }, subtitle)));
}

// === DATA TABLE ===
function DataTable({
  columns,
  data,
  title,
  action,
  maxHeight = '420px',
  emptyMessage = 'No records'
}) {
  return React.createElement("div", {
    className: "card card-dark table-card",
    style: {
      marginBottom: '24px'
    }
  }, title && React.createElement("div", {
    className: "table-header"
  }, React.createElement("h3", {
    className: "card-title"
  }, title), action), React.createElement("div", {
    className: "table-wrapper",
    style: {
      maxHeight
    }
  }, !data || data.length === 0 ? React.createElement("div", {
    className: "empty-state"
  }, emptyMessage) : React.createElement("table", {
    className: "data-table"
  }, React.createElement("thead", null, React.createElement("tr", null, columns.map((c, i) => React.createElement("th", {
    key: i
  }, c.header)))), React.createElement("tbody", null, data.map((row, ri) => React.createElement("tr", {
    key: ri
  }, columns.map((col, ci) => React.createElement("td", {
    key: ci
  }, col.render ? col.render(row, ri) : row[col.key] ?? '—'))))))));
}

// === FILTERS PANEL ===
function FiltersPanel({
  children,
  title = 'Filters',
  action
}) {
  return React.createElement("div", {
    className: "filters-card"
  }, React.createElement("div", {
    className: "filters-header"
  }, React.createElement("h3", {
    className: "filters-title"
  }, title), action), React.createElement("div", {
    className: "filters-grid"
  }, children));
}
function FilterField({
  label,
  children
}) {
  return React.createElement("div", {
    className: "filter-group"
  }, React.createElement("label", {
    className: "filter-label"
  }, label), children);
}

// === BAR CHART (SVG) ===
function BarChart({
  data,
  xKey,
  yKey,
  color = '#A7F3D0',
  height = 280,
  formatY
}) {
  if (!data || data.length === 0) return React.createElement("div", {
    className: "empty-state"
  }, "No data");
  const padding = {
    top: 20,
    right: 20,
    bottom: 60,
    left: 50
  };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const niceMax = Math.ceil(maxVal * 1.1);
  const barWidth = Math.max(8, chartWidth / data.length * 0.6);
  const barGap = chartWidth / data.length;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({
    length: tickCount + 1
  }, (_, i) => niceMax * i / tickCount);
  return React.createElement("div", {
    style: {
      width: '100%',
      overflowX: 'auto'
    }
  }, React.createElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    style: {
      width: '100%',
      minWidth: '500px',
      height: 'auto'
    },
    preserveAspectRatio: "xMidYMid meet"
  }, ticks.map((t, i) => {
    const y = padding.top + chartHeight - t / niceMax * chartHeight;
    return React.createElement("g", {
      key: i
    }, React.createElement("line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#272925",
      strokeOpacity: "0.5",
      strokeDasharray: "2 4"
    }), React.createElement("text", {
      x: padding.left - 8,
      y: y + 4,
      fill: "#9CA3AF",
      fontSize: "10",
      textAnchor: "end"
    }, formatY ? formatY(t) : Math.round(t)));
  }), data.map((d, i) => {
    const val = Number(d[yKey]) || 0;
    const barH = val / niceMax * chartHeight;
    const x = padding.left + i * barGap + (barGap - barWidth) / 2;
    const y = padding.top + chartHeight - barH;
    return React.createElement("g", {
      key: i
    }, React.createElement("rect", {
      x: x,
      y: y,
      width: barWidth,
      height: barH,
      fill: color,
      rx: "3"
    }), React.createElement("text", {
      x: x + barWidth / 2,
      y: padding.top + chartHeight + 16,
      fill: "#9CA3AF",
      fontSize: "10",
      textAnchor: "middle"
    }, String(d[xKey] ?? '').slice(0, 10)), val > 0 && React.createElement("text", {
      x: x + barWidth / 2,
      y: y - 4,
      fill: "#FFFFFF",
      fontSize: "10",
      textAnchor: "middle"
    }, formatY ? formatY(val) : Math.round(val)));
  }), React.createElement("line", {
    x1: padding.left,
    y1: padding.top + chartHeight,
    x2: width - padding.right,
    y2: padding.top + chartHeight,
    stroke: "#272925",
    strokeWidth: "1"
  })));
}

// === LINE CHART (SVG) ===
function LineChart({
  data,
  xKey,
  yKey,
  color = '#A7F3D0',
  height = 280,
  formatY
}) {
  if (!data || data.length === 0) return React.createElement("div", {
    className: "empty-state"
  }, "No data");
  const padding = {
    top: 20,
    right: 20,
    bottom: 60,
    left: 50
  };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const niceMax = Math.ceil(maxVal * 1.1);
  const tickCount = 5;
  const ticks = Array.from({
    length: tickCount + 1
  }, (_, i) => niceMax * i / tickCount);
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
  const points = data.map((d, i) => {
    const val = Number(d[yKey]) || 0;
    const x = padding.left + (data.length > 1 ? i * xStep : chartWidth / 2);
    const y = padding.top + chartHeight - val / niceMax * chartHeight;
    return {
      x,
      y,
      val,
      label: d[xKey]
    };
  });
  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x},${padding.top + chartHeight} L${points[0].x},${padding.top + chartHeight} Z`;
  return React.createElement("div", {
    style: {
      width: '100%',
      overflowX: 'auto'
    }
  }, React.createElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    style: {
      width: '100%',
      minWidth: '500px',
      height: 'auto'
    },
    preserveAspectRatio: "xMidYMid meet"
  }, React.createElement("defs", null, React.createElement("linearGradient", {
    id: "line-gradient",
    x1: "0",
    x2: "0",
    y1: "0",
    y2: "1"
  }, React.createElement("stop", {
    offset: "0%",
    stopColor: color,
    stopOpacity: "0.3"
  }), React.createElement("stop", {
    offset: "100%",
    stopColor: color,
    stopOpacity: "0"
  }))), ticks.map((t, i) => {
    const y = padding.top + chartHeight - t / niceMax * chartHeight;
    return React.createElement("g", {
      key: i
    }, React.createElement("line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#272925",
      strokeOpacity: "0.5",
      strokeDasharray: "2 4"
    }), React.createElement("text", {
      x: padding.left - 8,
      y: y + 4,
      fill: "#9CA3AF",
      fontSize: "10",
      textAnchor: "end"
    }, formatY ? formatY(t) : Math.round(t)));
  }), React.createElement("path", {
    d: areaD,
    fill: "url(#line-gradient)"
  }), React.createElement("path", {
    d: pathD,
    fill: "none",
    stroke: color,
    strokeWidth: "2"
  }), points.map((p, i) => React.createElement("g", {
    key: i
  }, React.createElement("circle", {
    cx: p.x,
    cy: p.y,
    r: "3",
    fill: color
  }), React.createElement("text", {
    x: p.x,
    y: padding.top + chartHeight + 16,
    fill: "#9CA3AF",
    fontSize: "10",
    textAnchor: "middle"
  }, String(p.label ?? '').slice(0, 10)))), React.createElement("line", {
    x1: padding.left,
    y1: padding.top + chartHeight,
    x2: width - padding.right,
    y2: padding.top + chartHeight,
    stroke: "#272925",
    strokeWidth: "1"
  })));
}

// === STACKED BAR CHART ===
function StackedBarChart({
  data,
  xKey,
  series,
  height = 280
}) {
  if (!data || data.length === 0) return React.createElement("div", {
    className: "empty-state"
  }, "No data");
  const padding = {
    top: 20,
    right: 20,
    bottom: 60,
    left: 50
  };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const totals = data.map(d => series.reduce((s, sr) => s + (Number(d[sr.key]) || 0), 0));
  const maxVal = Math.max(...totals, 1);
  const niceMax = Math.ceil(maxVal * 1.1);
  const barWidth = Math.max(8, chartWidth / data.length * 0.6);
  const barGap = chartWidth / data.length;
  const tickCount = 5;
  const ticks = Array.from({
    length: tickCount + 1
  }, (_, i) => niceMax * i / tickCount);
  return React.createElement("div", null, React.createElement("div", {
    style: {
      width: '100%',
      overflowX: 'auto'
    }
  }, React.createElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    style: {
      width: '100%',
      minWidth: '500px',
      height: 'auto'
    },
    preserveAspectRatio: "xMidYMid meet"
  }, ticks.map((t, i) => {
    const y = padding.top + chartHeight - t / niceMax * chartHeight;
    return React.createElement("g", {
      key: i
    }, React.createElement("line", {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: "#272925",
      strokeOpacity: "0.5",
      strokeDasharray: "2 4"
    }), React.createElement("text", {
      x: padding.left - 8,
      y: y + 4,
      fill: "#9CA3AF",
      fontSize: "10",
      textAnchor: "end"
    }, Math.round(t)));
  }), data.map((d, i) => {
    const x = padding.left + i * barGap + (barGap - barWidth) / 2;
    let yOffset = 0;
    return React.createElement("g", {
      key: i
    }, series.map((sr, si) => {
      const val = Number(d[sr.key]) || 0;
      const barH = val / niceMax * chartHeight;
      const y = padding.top + chartHeight - barH - yOffset;
      yOffset += barH;
      return React.createElement("rect", {
        key: si,
        x: x,
        y: y,
        width: barWidth,
        height: barH,
        fill: sr.color
      });
    }), React.createElement("text", {
      x: x + barWidth / 2,
      y: padding.top + chartHeight + 16,
      fill: "#9CA3AF",
      fontSize: "10",
      textAnchor: "middle"
    }, String(d[xKey] ?? '').slice(0, 10)));
  }), React.createElement("line", {
    x1: padding.left,
    y1: padding.top + chartHeight,
    x2: width - padding.right,
    y2: padding.top + chartHeight,
    stroke: "#272925",
    strokeWidth: "1"
  }))), React.createElement("div", {
    className: "legend"
  }, series.map((sr, i) => React.createElement("div", {
    key: i,
    className: "legend-item"
  }, React.createElement("span", {
    className: "legend-color",
    style: {
      background: sr.color
    }
  }), React.createElement("span", null, sr.label)))));
}

// === TIMELINE BAR CHART (Horizontal stacked timeline for shutter events) ===
function TimelineBar({
  events,
  startTime,
  endTime,
  stateColors,
  height = 60
}) {
  if (!events || events.length === 0) return React.createElement("div", {
    className: "empty-state"
  }, "No events");
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const total = end - start || 1;
  return React.createElement("div", {
    style: {
      position: 'relative',
      height: `${height}px`,
      background: '#272925',
      borderRadius: '8px',
      overflow: 'hidden'
    }
  }, events.map((ev, i) => {
    const evStart = Math.max(start, new Date(ev.start_time || ev.timestamp).getTime());
    const evEnd = Math.min(end, new Date(ev.end_time || ev.timestamp).getTime() + (ev.end_time ? 0 : 60000));
    const left = (evStart - start) / total * 100;
    const width = (evEnd - evStart) / total * 100;
    const color = stateColors[ev.state] || stateColors[ev.event_type] || '#A7F3D0';
    return React.createElement("div", {
      key: i,
      style: {
        position: 'absolute',
        left: `${left}%`,
        width: `${Math.max(0.5, width)}%`,
        top: 0,
        bottom: 0,
        background: color,
        opacity: 0.85
      },
      title: `${ev.state || ev.event_type} @ ${h.formatDateTime(ev.start_time || ev.timestamp)}`
    });
  }));
}

// Expose
window.LogoIcon = LogoIcon;
window.Sidebar = Sidebar;
window.PageHeader = PageHeader;
window.LoadingSpinner = LoadingSpinner;
window.ErrorMessage = ErrorMessage;
window.StatCard = StatCard;
window.DataTable = DataTable;
window.FiltersPanel = FiltersPanel;
window.FilterField = FilterField;
window.BarChart = BarChart;
window.LineChart = LineChart;
window.StackedBarChart = StackedBarChart;
window.TimelineBar = TimelineBar;

// ===== page-dashboard =====
// === DASHBOARD / EMPLOYEES PAGE ===
function DashboardPage({
  branches,
  regions,
  areas
}) {
  const {
    useState,
    useEffect,
    useMemo,
    useCallback
  } = React;
  const h = window.helpers;
  const api = window.api;
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const [branchId, setBranchId] = useState(null);
  const [viewMode, setViewMode] = useState('Daily');
  const [startDate, setStartDate] = useState(h.todayISO());
  const [endDate, setEndDate] = useState(h.todayISO());
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const branchOptions = useMemo(() => h.filterBranches(branches, region, area), [branches, region, area]);
  const filteredAreas = useMemo(() => h.uniqueAreas(branches, region), [branches, region]);

  // Auto-select branch
  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find(b => b.branch_id === branchId)) return;
    const preferred = branchOptions.find(b => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);

  // Weekly mode adjusts end date
  useEffect(() => {
    if (viewMode === 'Weekly') {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 6);
      setEndDate(h.toISO(d));
    }
  }, [viewMode, startDate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const dates = h.buildDateRange(startDate, endDate);
      const [allRecords, empList] = await Promise.all([Promise.all(dates.map(d => api.getAttendance(branchId, {
        date: d
      }).catch(() => []))), api.listEmployees(branchId).catch(() => [])]);
      setRecords(allRecords.flat());
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data
  const filteredRecords = useMemo(() => {
    if (employeeFilter === 'All') return records;
    return records.filter(r => String(r.employee_id) === employeeFilter);
  }, [records, employeeFilter]);
  const uniqueEmployeeIds = useMemo(() => {
    return [...new Set(records.map(r => r.employee_id))].sort((a, b) => a - b);
  }, [records]);
  const isSingleDay = startDate === endDate;
  const selectedEmpId = employeeFilter !== 'All' ? Number(employeeFilter) : null;
  const recordsExcluding0 = useMemo(() => filteredRecords.filter(r => r.employee_id !== 0), [filteredRecords]);
  const avgWorkingHours = useMemo(() => {
    const src = selectedEmpId ? filteredRecords : recordsExcluding0;
    if (!src.length) return 0;
    return src.reduce((s, r) => s + (r.working_hours || 0), 0) / src.length;
  }, [filteredRecords, recordsExcluding0, selectedEmpId]);
  const avgArrivalSec = useMemo(() => {
    const secs = filteredRecords.map(r => h.toSecondsFromMidnight(r.first_time_seen)).filter(s => s !== null);
    return secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null;
  }, [filteredRecords]);
  const avgLeavingSec = useMemo(() => {
    const secs = filteredRecords.map(r => h.toSecondsFromMidnight(r.last_time_seen)).filter(s => s !== null);
    return secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null;
  }, [filteredRecords]);
  const activeEmployees = useMemo(() => new Set(recordsExcluding0.map(r => r.employee_id)).size, [recordsExcluding0]);

  // Charts
  const employeesPerDate = useMemo(() => {
    const map = new Map();
    recordsExcluding0.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, new Set());
      map.get(r.date).add(r.employee_id);
    });
    return [...map.entries()].map(([date, ids]) => ({
      date,
      count: ids.size
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [recordsExcluding0]);
  const avgHoursPerDate = useMemo(() => {
    const map = new Map();
    const src = selectedEmpId ? filteredRecords : recordsExcluding0;
    src.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date).push(r.working_hours || 0);
    });
    return [...map.entries()].map(([date, hours]) => ({
      date,
      avgHours: +(hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2)
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords, recordsExcluding0, selectedEmpId]);
  const weeklyByEmployee = useMemo(() => {
    if (viewMode !== 'Weekly' || selectedEmpId) return [];
    const map = new Map();
    recordsExcluding0.forEach(r => {
      map.set(r.employee_id, (map.get(r.employee_id) || 0) + (r.working_hours || 0));
    });
    return [...map.entries()].map(([empId, hours]) => ({
      employeeId: 'Emp ' + empId,
      weeklyHours: +hours.toFixed(2)
    })).sort((a, b) => b.weeklyHours - a.weeklyHours);
  }, [recordsExcluding0, viewMode, selectedEmpId]);
  const weeklyDailyBreakdown = useMemo(() => {
    if (viewMode !== 'Weekly' || !selectedEmpId) return [];
    const map = new Map();
    filteredRecords.forEach(r => {
      map.set(r.date, (map.get(r.date) || 0) + (r.working_hours || 0));
    });
    return [...map.entries()].map(([date, hours]) => {
      const d = new Date(date);
      return {
        day: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: '2-digit',
          day: '2-digit'
        }),
        hours: +hours.toFixed(2)
      };
    }).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredRecords, viewMode, selectedEmpId]);
  const totalWeeklyHours = useMemo(() => {
    if (viewMode !== 'Weekly' || !selectedEmpId) return 0;
    return filteredRecords.reduce((s, r) => s + (r.working_hours || 0), 0);
  }, [filteredRecords, viewMode, selectedEmpId]);
  const selectedEmpName = useMemo(() => {
    if (!selectedEmpId) return null;
    const emp = employees.find(e => e.employee_id === selectedEmpId);
    return emp?.name ?? 'Employee ' + selectedEmpId;
  }, [selectedEmpId, employees]);
  const downloadAttendance = () => {
    h.downloadCSV('attendance_report_' + startDate + '_to_' + endDate + '.csv', filteredRecords.map(r => ({
      'Employee ID': r.employee_id,
      Date: r.date,
      'Arrival Time': r.first_time_seen ?? '',
      'Leaving Time': r.last_time_seen ?? '',
      'Working Hours': r.working_hours
    })));
  };
  const showEmployeesPerDate = viewMode === 'Daily' && !selectedEmpId && !isSingleDay && employeesPerDate.length > 0;
  const showAvgHoursLine = viewMode === 'Daily' && !isSingleDay && avgHoursPerDate.length > 0;
  const showWeeklyByEmp = viewMode === 'Weekly' && !selectedEmpId && weeklyByEmployee.length > 0;
  const showWeeklyDaily = viewMode === 'Weekly' && selectedEmpId && weeklyDailyBreakdown.length > 0;
  return React.createElement("div", null, React.createElement(PageHeader, {
    title: "Dashboard",
    subtitle: "Employee attendance & operational insights"
  }), React.createElement(FiltersPanel, null, regions.length > 0 && React.createElement(FilterField, {
    label: "Region"
  }, React.createElement("select", {
    value: region,
    onChange: e => {
      setRegion(e.target.value);
      setArea('');
    }
  }, React.createElement("option", {
    value: ""
  }, "All"), regions.map(r => React.createElement("option", {
    key: r,
    value: r
  }, r)))), filteredAreas.length > 0 && React.createElement(FilterField, {
    label: "Area"
  }, React.createElement("select", {
    value: area,
    onChange: e => setArea(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "All"), filteredAreas.map(a => React.createElement("option", {
    key: a,
    value: a
  }, a)))), React.createElement(FilterField, {
    label: "Branch"
  }, React.createElement("select", {
    value: branchId ?? '',
    onChange: e => setBranchId(Number(e.target.value) || null)
  }, React.createElement("option", {
    value: ""
  }, "Select branch"), branchOptions.map(b => React.createElement("option", {
    key: b.branch_id,
    value: b.branch_id
  }, b.branch_name, " (", b.branch_id, ")")))), React.createElement(FilterField, {
    label: "View Mode"
  }, React.createElement("div", {
    className: "toggle-buttons"
  }, ['Daily', 'Weekly'].map(m => React.createElement("button", {
    key: m,
    className: `toggle-btn ${viewMode === m ? 'active' : ''}`,
    onClick: () => setViewMode(m)
  }, m)))), React.createElement(FilterField, {
    label: "Start Date"
  }, React.createElement("input", {
    type: "date",
    value: startDate,
    onChange: e => {
      setStartDate(e.target.value);
      if (viewMode === 'Daily') setEndDate(e.target.value);
    }
  })), React.createElement(FilterField, {
    label: "End Date"
  }, React.createElement("input", {
    type: "date",
    value: endDate,
    onChange: e => setEndDate(e.target.value),
    disabled: viewMode === 'Weekly',
    min: startDate
  })), React.createElement(FilterField, {
    label: "Employee"
  }, React.createElement("select", {
    value: employeeFilter,
    onChange: e => setEmployeeFilter(e.target.value)
  }, React.createElement("option", {
    value: "All"
  }, "All"), uniqueEmployeeIds.map(id => React.createElement("option", {
    key: id,
    value: String(id)
  }, id))))), React.createElement(ErrorMessage, {
    error: error
  }), loading && React.createElement(LoadingSpinner, {
    message: "Fetching attendance data..."
  }), !loading && !error && branchId && React.createElement(React.Fragment, null, selectedEmpName && React.createElement("div", {
    style: {
      marginBottom: '16px',
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, " Selected: ", React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, selectedEmpName), " (ID: ", selectedEmpId, ") "), React.createElement("div", {
    className: "grid grid-4"
  }, !selectedEmpId && React.createElement(React.Fragment, null, React.createElement(StatCard, {
    label: "Active Employees",
    value: activeEmployees,
    unit: "employees online"
  }), React.createElement(StatCard, {
    label: "Average Working Hours",
    value: h.formatWorkingHours(avgWorkingHours),
    unit: "per day"
  })), selectedEmpId && isSingleDay && viewMode === 'Daily' && React.createElement(React.Fragment, null, React.createElement(StatCard, {
    label: "Arrival Time",
    value: avgArrivalSec != null ? h.formatTimeAmPm(avgArrivalSec) : 'N/A',
    unit: "check-in"
  }), React.createElement(StatCard, {
    label: "Leaving Time",
    value: avgLeavingSec != null ? h.formatTimeAmPm(avgLeavingSec) : 'N/A',
    unit: "check-out"
  }), React.createElement(StatCard, {
    label: "Working Time",
    value: h.formatWorkingHours(avgWorkingHours),
    unit: "total hours"
  })), selectedEmpId && !isSingleDay && viewMode === 'Daily' && React.createElement(StatCard, {
    label: "Avg Working Time",
    value: h.formatWorkingHours(avgWorkingHours),
    unit: "per day"
  }), selectedEmpId && viewMode === 'Weekly' && React.createElement(React.Fragment, null, React.createElement(StatCard, {
    label: "Weekly Hours",
    value: h.formatWorkingHours(totalWeeklyHours),
    unit: "total hours"
  }), React.createElement(StatCard, {
    label: "Average Daily Hours",
    value: h.formatWorkingHours(totalWeeklyHours / 7),
    unit: "per day"
  }))), isSingleDay && !selectedEmpId && viewMode === 'Daily' && employees.length > 0 && React.createElement(DataTable, {
    title: "Employees (Name & ID)",
    columns: [{
      header: 'Name',
      key: 'name',
      render: r => r.name ?? '—'
    }, {
      header: 'Employee ID',
      key: 'employee_id'
    }],
    data: employees,
    maxHeight: "280px"
  }), showEmployeesPerDate && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Number of Employees Per Date"), React.createElement("p", {
    className: "chart-subtitle"
  }, "Daily unique employee count over the date range"))), React.createElement(BarChart, {
    data: employeesPerDate,
    xKey: "date",
    yKey: "count",
    color: "#A7F3D0",
    height: 300
  })), showAvgHoursLine && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Average Working Time Over Date Interval", selectedEmpId ? ` — Emp ${selectedEmpId}` : ' (All)'), React.createElement("p", {
    className: "chart-subtitle"
  }, "Decimal hours per day"))), React.createElement(LineChart, {
    data: avgHoursPerDate,
    xKey: "date",
    yKey: "avgHours",
    color: "#A7F3D0",
    height: 300,
    formatY: v => Number(v).toFixed(1) + 'h'
  })), showWeeklyByEmp && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Weekly Working Hours by Employee"), React.createElement("p", {
    className: "chart-subtitle"
  }, "Total hours per employee over the week"))), React.createElement(BarChart, {
    data: weeklyByEmployee,
    xKey: "employeeId",
    yKey: "weeklyHours",
    color: "#A7F3D0",
    height: 350,
    formatY: v => Number(v).toFixed(1) + 'h'
  })), showWeeklyDaily && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Daily Working Hours \u2014 Emp ", selectedEmpId), React.createElement("p", {
    className: "chart-subtitle"
  }, "Hours per day for selected week"))), React.createElement(BarChart, {
    data: weeklyDailyBreakdown,
    xKey: "day",
    yKey: "hours",
    color: "#A7F3D0",
    height: 300,
    formatY: v => Number(v).toFixed(1) + 'h'
  })), React.createElement("div", {
    className: "card card-dark",
    style: {
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }
  }, React.createElement("h3", {
    className: "card-title"
  }, "Generate Reports"), React.createElement("button", {
    className: "primary-btn",
    onClick: downloadAttendance,
    disabled: !filteredRecords.length
  }, " \u2B07 Download Attendance Report ")), React.createElement(DataTable, {
    title: "Employee Data",
    columns: [{
      header: 'Employee ID',
      key: 'employee_id'
    }, {
      header: 'Date',
      key: 'date'
    }, {
      header: 'Arrival Time',
      key: 'first_time_seen',
      render: r => h.extractTime(r.first_time_seen)
    }, {
      header: 'Leaving Time',
      key: 'last_time_seen',
      render: r => h.extractTime(r.last_time_seen)
    }, {
      header: 'Working Hours',
      key: 'working_hours',
      render: r => h.formatWorkingHours(r.working_hours)
    }],
    data: filteredRecords,
    emptyMessage: "No attendance records for the selected filters"
  })), !branchId && !loading && React.createElement("div", {
    className: "card card-dark",
    style: {
      padding: '48px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }
  }, " Please select a branch to view dashboard data. "));
}
window.DashboardPage = DashboardPage;

// ===== page-shutter =====
// === SHUTTER STATE PAGE ===
function ShutterPage({
  branches,
  regions,
  areas
}) {
  const {
    useState,
    useEffect,
    useMemo,
    useCallback
  } = React;
  const h = window.helpers;
  const api = window.api;
  const STATE_COLORS = {
    'Opened': '#A7F3D0',
    'Partially Closed': '#D1FAE5',
    'Closed': '#4B5563'
  };
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const [branchId, setBranchId] = useState(null);
  const [viewMode, setViewMode] = useState('single');
  const [selectedDate, setSelectedDate] = useState(h.todayISO());
  const [startDate, setStartDate] = useState(h.todayISO());
  const [endDate, setEndDate] = useState(h.todayISO());
  const [shutterStateFilter, setShutterStateFilter] = useState('All');
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const branchOptions = useMemo(() => h.filterBranches(branches, region, area), [branches, region, area]);
  const filteredAreas = useMemo(() => h.uniqueAreas(branches, region), [branches, region]);
  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find(b => b.branch_id === branchId)) return;
    const preferred = branchOptions.find(b => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'single') {
        const [evts, st] = await Promise.all([api.getShutterEvents(branchId, {
          date: selectedDate
        }).catch(() => []), api.getShutterStatus(branchId).catch(() => null)]);
        setEvents(Array.isArray(evts) ? evts : []);
        setStatus(st);
      } else {
        const dates = h.buildDateRange(startDate, endDate);
        const allEvents = await Promise.all(dates.map(d => api.getShutterEvents(branchId, {
          date: d
        }).catch(() => [])));
        setEvents(allEvents.flat());
        setStatus(null);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [branchId, viewMode, selectedDate, startDate, endDate]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const filteredEvents = useMemo(() => {
    if (shutterStateFilter === 'All') return events;
    return events.filter(e => {
      const cls = h.classifyShutterEvent(e.event_type);
      if (shutterStateFilter === 'open') return cls === 'Opened';
      if (shutterStateFilter === 'closed') return cls === 'Closed';
      return true;
    });
  }, [events, shutterStateFilter]);
  const latestState = status?.latest_event_type ? h.classifyShutterEvent(status.latest_event_type) : 'N/A';
  const firstOpenTime = useMemo(() => {
    const opens = events.filter(e => h.classifyShutterEvent(e.event_type) === 'Opened');
    if (!opens.length) return 'N/A';
    const times = opens.map(e => e.timestamp).sort();
    return h.extractTime(times[0]);
  }, [events]);
  const lastCloseTime = useMemo(() => {
    const closes = events.filter(e => h.classifyShutterEvent(e.event_type) === 'Closed');
    if (!closes.length) return 'N/A';
    const times = closes.map(e => e.timestamp).sort();
    return h.extractTime(times[times.length - 1]);
  }, [events]);

  // Timeline segments for single-date view
  const timelineSegments = useMemo(() => {
    if (viewMode !== 'single' || !events.length) return [];
    const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const segments = [];
    const DAY_START = 360;
    const toBusinessMin = ts => {
      const timePart = ts.includes('T') ? ts.split('T')[1]?.slice(0, 8) : ts.slice(0, 8);
      const m = h.timeToMinutes(timePart || '00:00:00');
      if (m < 240) return 1080 + m;
      return m - DAY_START;
    };
    let currentState = null;
    let currentStart = 0;
    for (const evt of sorted) {
      const newState = h.classifyShutterEvent(evt.event_type);
      const eventMin = Math.max(0, Math.min(1320, toBusinessMin(evt.timestamp)));
      const timePart = evt.timestamp.includes('T') ? evt.timestamp.split('T')[1]?.slice(0, 5) : evt.timestamp.slice(0, 5);
      if (currentState !== null) {
        segments.push({
          state: currentState,
          startMin: currentStart,
          endMin: eventMin,
          startTime: h.minutesToTimeStr(currentStart + DAY_START),
          endTime: timePart || ''
        });
      }
      currentState = newState;
      currentStart = eventMin;
    }
    if (currentState !== null) {
      segments.push({
        state: currentState,
        startMin: currentStart,
        endMin: 1320,
        startTime: h.minutesToTimeStr(currentStart + DAY_START),
        endTime: '04:00'
      });
    }
    return segments;
  }, [events, viewMode]);
  const uniqueDates = useMemo(() => new Set(events.map(e => e.date || e.timestamp.slice(0, 10))).size, [events]);
  const downloadEvents = () => {
    h.downloadCSV(viewMode === 'single' ? `shutter_events_${selectedDate}.csv` : `shutter_events_${startDate}_to_${endDate}.csv`, filteredEvents.map(e => ({
      Event: h.classifyShutterEvent(e.event_type),
      Timestamp: e.timestamp,
      Date: e.date || e.timestamp.slice(0, 10)
    })));
  };

  // Timeline rendering as horizontal bar
  const renderTimeline = () => {
    if (!timelineSegments.length) return null;
    const totalMin = 1320;
    return React.createElement("div", {
      className: "chart-card"
    }, React.createElement("h3", {
      className: "chart-title"
    }, "Shutter State Timeline \u2014 ", selectedDate), React.createElement("p", {
      className: "chart-subtitle"
    }, "Day: 6:00 AM to 4:00 AM next day"), React.createElement("div", {
      style: {
        position: 'relative',
        height: '24px',
        marginBottom: '8px',
        fontSize: '10px',
        color: 'var(--text-secondary)'
      }
    }, [0, 360, 720, 1080, 1320].map(m => React.createElement("span", {
      key: m,
      style: {
        position: 'absolute',
        left: `${m / totalMin * 100}%`,
        transform: 'translateX(-50%)'
      }
    }, h.minutesToTimeStr(m + 360)))), React.createElement("div", {
      style: {
        position: 'relative',
        height: '60px',
        background: '#272925',
        borderRadius: '8px',
        overflow: 'hidden'
      }
    }, timelineSegments.map((seg, i) => {
      const left = seg.startMin / totalMin * 100;
      const width = (seg.endMin - seg.startMin) / totalMin * 100;
      return React.createElement("div", {
        key: i,
        style: {
          position: 'absolute',
          left: `${left}%`,
          width: `${Math.max(0.3, width)}%`,
          top: 0,
          bottom: 0,
          background: STATE_COLORS[seg.state] || '#666',
          opacity: 0.85
        },
        title: `${seg.state}: ${seg.startTime} → ${seg.endTime}`
      });
    })), React.createElement("div", {
      className: "legend"
    }, Object.entries(STATE_COLORS).map(([label, color]) => React.createElement("div", {
      key: label,
      className: "legend-item"
    }, React.createElement("span", {
      className: "legend-color",
      style: {
        background: color
      }
    }), React.createElement("span", null, label)))));
  };
  return React.createElement("div", null, React.createElement(PageHeader, {
    title: "Shutter State",
    subtitle: "Open/close events and timeline"
  }), React.createElement(FiltersPanel, null, regions.length > 0 && React.createElement(FilterField, {
    label: "Region"
  }, React.createElement("select", {
    value: region,
    onChange: e => {
      setRegion(e.target.value);
      setArea('');
    }
  }, React.createElement("option", {
    value: ""
  }, "All"), regions.map(r => React.createElement("option", {
    key: r,
    value: r
  }, r)))), filteredAreas.length > 0 && React.createElement(FilterField, {
    label: "Area"
  }, React.createElement("select", {
    value: area,
    onChange: e => setArea(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "All"), filteredAreas.map(a => React.createElement("option", {
    key: a,
    value: a
  }, a)))), React.createElement(FilterField, {
    label: "Branch"
  }, React.createElement("select", {
    value: branchId ?? '',
    onChange: e => setBranchId(Number(e.target.value) || null)
  }, React.createElement("option", {
    value: ""
  }, "Select branch"), branchOptions.map(b => React.createElement("option", {
    key: b.branch_id,
    value: b.branch_id
  }, b.branch_name, " (", b.branch_id, ")")))), React.createElement(FilterField, {
    label: "View Mode"
  }, React.createElement("div", {
    className: "toggle-buttons"
  }, React.createElement("button", {
    className: `toggle-btn ${viewMode === 'single' ? 'active' : ''}`,
    onClick: () => setViewMode('single')
  }, "Single Date"), React.createElement("button", {
    className: `toggle-btn ${viewMode === 'interval' ? 'active' : ''}`,
    onClick: () => setViewMode('interval')
  }, "Interval"))), viewMode === 'single' ? React.createElement(React.Fragment, null, React.createElement(FilterField, {
    label: "Date"
  }, React.createElement("input", {
    type: "date",
    value: selectedDate,
    onChange: e => setSelectedDate(e.target.value)
  })), React.createElement(FilterField, {
    label: "Shutter State"
  }, React.createElement("select", {
    value: shutterStateFilter,
    onChange: e => setShutterStateFilter(e.target.value)
  }, React.createElement("option", {
    value: "All"
  }, "All"), React.createElement("option", {
    value: "open"
  }, "Open"), React.createElement("option", {
    value: "closed"
  }, "Closed")))) : React.createElement(React.Fragment, null, React.createElement(FilterField, {
    label: "Start Date"
  }, React.createElement("input", {
    type: "date",
    value: startDate,
    onChange: e => setStartDate(e.target.value)
  })), React.createElement(FilterField, {
    label: "End Date"
  }, React.createElement("input", {
    type: "date",
    value: endDate,
    onChange: e => setEndDate(e.target.value),
    min: startDate
  })))), React.createElement(ErrorMessage, {
    error: error
  }), loading && React.createElement(LoadingSpinner, {
    message: "Fetching shutter data..."
  }), !loading && !error && branchId && React.createElement(React.Fragment, null, viewMode === 'single' ? React.createElement("div", {
    className: "grid grid-3"
  }, React.createElement(StatCard, {
    label: "Current State",
    value: latestState,
    icon: "◉"
  }), React.createElement(StatCard, {
    label: "Opening Time",
    value: firstOpenTime,
    icon: "↑"
  }), React.createElement(StatCard, {
    label: "Closing Time",
    value: lastCloseTime,
    icon: "↓"
  })) : React.createElement("div", {
    className: "grid grid-2"
  }, React.createElement(StatCard, {
    label: "Days Tracked",
    value: uniqueDates,
    unit: "days"
  }), React.createElement(StatCard, {
    label: "Total Events",
    value: events.length,
    unit: "events"
  })), viewMode === 'single' && shutterStateFilter !== 'closed' && renderTimeline(), React.createElement("div", {
    className: "card card-dark",
    style: {
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }
  }, React.createElement("h3", {
    className: "card-title"
  }, "Generate Reports"), React.createElement("button", {
    className: "primary-btn",
    onClick: downloadEvents,
    disabled: !filteredEvents.length
  }, " \u2B07 Download Shutter Events Report ")), React.createElement(DataTable, {
    title: "Event Details",
    columns: [{
      header: 'Event',
      key: 'event_type',
      render: r => h.classifyShutterEvent(r.event_type)
    }, {
      header: 'Timestamp',
      key: 'timestamp',
      render: r => h.formatDateTime(r.timestamp)
    }, {
      header: 'Date',
      key: 'date',
      render: r => r.date || r.timestamp?.slice(0, 10)
    }],
    data: filteredEvents,
    emptyMessage: "No shutter events for the selected filters"
  })), !branchId && !loading && React.createElement("div", {
    className: "card card-dark",
    style: {
      padding: '48px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }
  }, " Please select a branch to view shutter data. "));
}
window.ShutterPage = ShutterPage;

// ===== page-customers =====
// === CUSTOMERS PAGE ===
function CustomersPage({
  branches,
  regions,
  areas
}) {
  const {
    useState,
    useEffect,
    useMemo,
    useCallback
  } = React;
  const h = window.helpers;
  const api = window.api;
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const [branchId, setBranchId] = useState(null);
  const [viewMode, setViewMode] = useState('Daily');
  const [startDate, setStartDate] = useState(h.todayISO());
  const [endDate, setEndDate] = useState(h.todayISO());
  const [records, setRecords] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const branchOptions = useMemo(() => h.filterBranches(branches, region, area), [branches, region, area]);
  const filteredAreas = useMemo(() => h.uniqueAreas(branches, region), [branches, region]);
  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find(b => b.branch_id === branchId)) return;
    const preferred = branchOptions.find(b => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const dates = h.buildDateRange(startDate, endDate);
      const [allCustomers, allAttendance] = await Promise.all([Promise.all(dates.map(d => api.getCustomers(branchId, {
        date: d
      }).catch(() => []))), Promise.all(dates.map(d => api.getAttendance(branchId, {
        date: d
      }).catch(() => [])))]);
      let flat = allCustomers.flat();

      // Exclude trivial records
      const threshold = 0.0166 * 60;
      flat = flat.filter(r => {
        const st = r.service_time ?? 0;
        const wt = r.waiting_time ?? 0;
        if (st === 0 && wt <= threshold || wt === 0 && st <= threshold) return false;
        return true;
      });

      // Exclude > 3 hours
      flat = flat.filter(r => {
        if (!r.visit_start_time || !r.service_end_time) return true;
        const start = new Date(r.visit_start_time).getTime();
        const end = new Date(r.service_end_time).getTime();
        if (isNaN(start) || isNaN(end)) return true;
        return (end - start) / 3600000 <= 3;
      });
      setRecords(flat);
      const attFlat = allAttendance.flat();
      const empIds = new Set(attFlat.filter(a => a.employee_id !== 0).map(a => a.employee_id));
      setActiveEmployees(empIds.size);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const totalCustomers = useMemo(() => new Set(records.map(r => r.customer_id)).size, [records]);
  const avgWaiting = useMemo(() => {
    const valid = records.filter(r => r.waiting_time >= 1);
    return valid.length ? valid.reduce((s, r) => s + r.waiting_time, 0) / valid.length : 0;
  }, [records]);
  const avgService = useMemo(() => {
    const valid = records.filter(r => r.service_time >= 1);
    return valid.length ? valid.reduce((s, r) => s + r.service_time, 0) / valid.length : 0;
  }, [records]);
  const maxService = useMemo(() => Math.max(0, ...records.map(r => r.service_time || 0)), [records]);
  const conversionData = useMemo(() => {
    const waitingOnly = records.filter(r => r.waiting_time > 0 && (!r.service_time || r.service_time === 0)).length;
    const served = records.filter(r => r.service_time > 0).length;
    const total = waitingOnly + served;
    return {
      waitingOnly,
      served,
      conversionRate: total > 0 ? served / total * 100 : 0
    };
  }, [records]);
  const customersPerDay = useMemo(() => {
    const map = new Map();
    records.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, new Set());
      map.get(r.date).add(r.customer_id);
    });
    return [...map.entries()].map(([date, ids]) => ({
      date,
      count: ids.size
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);
  const customersPerHour = useMemo(() => {
    const counts = new Array(24).fill(0);
    records.forEach(r => {
      if (!r.visit_start_time) return;
      const d = new Date(r.visit_start_time);
      if (!isNaN(d.getTime())) counts[d.getHours()]++;
    });
    return counts.map((count, hour) => ({
      hour: String(hour).padStart(2, '0') + ':00',
      count
    }));
  }, [records]);
  const summaryByBranch = useMemo(() => {
    const map = new Map();
    records.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, new Map());
      const dateMap = map.get(r.date);
      if (!dateMap.has(r.branch_id)) dateMap.set(r.branch_id, new Set());
      dateMap.get(r.branch_id).add(r.customer_id);
    });
    const rows = [];
    map.forEach((bm, date) => {
      const row = {
        Date: date
      };
      bm.forEach((ids, bid) => {
        row[`Branch ${bid}`] = ids.size;
      });
      rows.push(row);
    });
    return rows.sort((a, b) => String(a.Date).localeCompare(String(b.Date)));
  }, [records]);
  const downloadReport = () => {
    h.downloadCSV(`customers_report_${startDate}_to_${endDate}.csv`, records.map(r => ({
      'Customer ID': r.customer_id,
      'Branch ID': r.branch_id,
      Date: r.date,
      'Visit Start': r.visit_start_time ?? '',
      'Service End': r.service_end_time ?? '',
      'Waiting Time (min)': r.waiting_time,
      'Service Time (min)': r.service_time
    })));
  };
  return React.createElement("div", null, React.createElement(PageHeader, {
    title: "Customers",
    subtitle: "Visit, waiting & service analytics"
  }), React.createElement(FiltersPanel, null, regions.length > 0 && React.createElement(FilterField, {
    label: "Region"
  }, React.createElement("select", {
    value: region,
    onChange: e => {
      setRegion(e.target.value);
      setArea('');
    }
  }, React.createElement("option", {
    value: ""
  }, "All"), regions.map(r => React.createElement("option", {
    key: r,
    value: r
  }, r)))), filteredAreas.length > 0 && React.createElement(FilterField, {
    label: "Area"
  }, React.createElement("select", {
    value: area,
    onChange: e => setArea(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "All"), filteredAreas.map(a => React.createElement("option", {
    key: a,
    value: a
  }, a)))), React.createElement(FilterField, {
    label: "Branch"
  }, React.createElement("select", {
    value: branchId ?? '',
    onChange: e => setBranchId(Number(e.target.value) || null)
  }, React.createElement("option", {
    value: ""
  }, "Select branch"), branchOptions.map(b => React.createElement("option", {
    key: b.branch_id,
    value: b.branch_id
  }, b.branch_name, " (", b.branch_id, ")")))), React.createElement(FilterField, {
    label: "View Mode"
  }, React.createElement("div", {
    className: "toggle-buttons"
  }, ['Daily', 'Hourly'].map(m => React.createElement("button", {
    key: m,
    className: `toggle-btn ${viewMode === m ? 'active' : ''}`,
    onClick: () => setViewMode(m)
  }, m)))), React.createElement(FilterField, {
    label: "Start Date"
  }, React.createElement("input", {
    type: "date",
    value: startDate,
    onChange: e => {
      setStartDate(e.target.value);
      setEndDate(e.target.value);
    }
  })), React.createElement(FilterField, {
    label: "End Date"
  }, React.createElement("input", {
    type: "date",
    value: endDate,
    onChange: e => setEndDate(e.target.value),
    min: startDate
  }))), React.createElement(ErrorMessage, {
    error: error
  }), loading && React.createElement(LoadingSpinner, {
    message: "Fetching customer data..."
  }), !loading && !error && branchId && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "grid grid-6"
  }, React.createElement(StatCard, {
    label: "Current Occupancy",
    value: totalCustomers,
    unit: "customers"
  }), React.createElement(StatCard, {
    label: "Active Counters",
    value: activeEmployees,
    unit: "online"
  }), React.createElement(StatCard, {
    label: "Avg Wait Time",
    value: h.formatMinutes(avgWaiting),
    unit: "minutes"
  }), React.createElement(StatCard, {
    label: "Avg Service Time",
    value: h.formatMinutes(avgService),
    unit: "minutes"
  }), React.createElement(StatCard, {
    label: "Max Service Time",
    value: h.formatMinutes(maxService),
    unit: "minutes"
  }), React.createElement(StatCard, {
    label: "Conversion Rate",
    value: conversionData.conversionRate.toFixed(1) + '%',
    subtitle: `Waiting: ${conversionData.waitingOnly} | Served: ${conversionData.served}`
  })), viewMode === 'Hourly' && customersPerHour.length > 0 && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("h3", {
    className: "chart-title"
  }, "Customers Per Hour"), React.createElement("p", {
    className: "chart-subtitle"
  }, "Hourly distribution of customer visits"), React.createElement(BarChart, {
    data: customersPerHour,
    xKey: "hour",
    yKey: "count",
    color: "#A7F3D0",
    height: 320
  })), viewMode === 'Daily' && customersPerDay.length > 0 && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("h3", {
    className: "chart-title"
  }, "Customers Across Days"), React.createElement("p", {
    className: "chart-subtitle"
  }, "Daily unique customer count"), React.createElement(BarChart, {
    data: customersPerDay,
    xKey: "date",
    yKey: "count",
    color: "#D1FAE5",
    height: 320
  })), viewMode === 'Daily' && summaryByBranch.length > 0 && React.createElement("div", {
    className: "card card-dark table-card",
    style: {
      marginBottom: '24px'
    }
  }, React.createElement("div", {
    className: "table-header"
  }, React.createElement("h3", {
    className: "card-title"
  }, "Summary by Branch")), React.createElement("div", {
    className: "table-wrapper",
    style: {
      maxHeight: '320px'
    }
  }, React.createElement("table", {
    className: "data-table"
  }, React.createElement("thead", null, React.createElement("tr", null, Object.keys(summaryByBranch[0]).map(k => React.createElement("th", {
    key: k
  }, k)))), React.createElement("tbody", null, summaryByBranch.map((row, i) => React.createElement("tr", {
    key: i
  }, Object.values(row).map((v, j) => React.createElement("td", {
    key: j
  }, v)))))))), React.createElement("div", {
    className: "card card-dark",
    style: {
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }
  }, React.createElement("h3", {
    className: "card-title"
  }, "Generate Reports"), React.createElement("button", {
    className: "primary-btn",
    onClick: downloadReport,
    disabled: !records.length
  }, " \u2B07 Download Customer Report ")), React.createElement(DataTable, {
    title: "Customer Data",
    columns: [{
      header: 'Customer ID',
      key: 'customer_id'
    }, {
      header: 'Date',
      key: 'date'
    }, {
      header: 'Visit Start',
      key: 'visit_start_time',
      render: r => h.extractTime(r.visit_start_time)
    }, {
      header: 'Service End',
      key: 'service_end_time',
      render: r => h.extractTime(r.service_end_time)
    }, {
      header: 'Waiting (min)',
      key: 'waiting_time',
      render: r => typeof r.waiting_time === 'number' ? r.waiting_time.toFixed(1) : '—'
    }, {
      header: 'Service (min)',
      key: 'service_time',
      render: r => typeof r.service_time === 'number' ? r.service_time.toFixed(1) : '—'
    }],
    data: records,
    emptyMessage: "No customer records for the selected filters"
  })), !branchId && !loading && React.createElement("div", {
    className: "card card-dark",
    style: {
      padding: '48px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }
  }, " Please select a branch to view customer data. "));
}
window.CustomersPage = CustomersPage;

// ===== page-alerts =====
// === ALERTS PAGE ===
function AlertsPage({
  branches,
  regions,
  areas
}) {
  const {
    useState,
    useEffect,
    useMemo,
    useCallback
  } = React;
  const h = window.helpers;
  const api = window.api;
  const ALERT_PALETTE = ['#A7F3D0', '#D1FAE5', '#FCD34D', '#F87171', '#A78BFA', '#60A5FA', '#FB7185', '#34D399'];
  const [region, setRegion] = useState('');
  const [area, setArea] = useState('');
  const [branchId, setBranchId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(h.todayISO());
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const branchOptions = useMemo(() => h.filterBranches(branches, region, area), [branches, region, area]);
  const filteredAreas = useMemo(() => h.uniqueAreas(branches, region), [branches, region]);
  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find(b => b.branch_id === branchId)) return;
    const preferred = branchOptions.find(b => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAlerts(branchId, {
        date: selectedDate
      });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [branchId, selectedDate]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const alertCounts = useMemo(() => {
    const map = new Map();
    alerts.forEach(a => map.set(a.alert_type, (map.get(a.alert_type) || 0) + 1));
    return [...map.entries()].map(([alert_type, count]) => ({
      alert_type,
      count,
      label: h.formatAlertType(alert_type)
    })).sort((a, b) => b.count - a.count);
  }, [alerts]);
  const branchName = branchOptions.find(b => b.branch_id === branchId)?.branch_name;
  const downloadReport = () => {
    h.downloadCSV(`alerts_report_${selectedDate}_Branch_${branchId}.csv`, alertCounts.map(a => ({
      Date: selectedDate,
      'Branch ID': branchId,
      'Branch Name': branchName ?? `Branch ${branchId}`,
      'Alert Type': h.formatAlertType(a.alert_type),
      Count: a.count
    })));
  };

  // Custom multi-color bar chart
  const renderColoredBarChart = () => {
    if (!alertCounts.length) return null;
    const padding = {
      top: 30,
      right: 20,
      bottom: 80,
      left: 60
    };
    const width = 800;
    const height = 380;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxVal = Math.max(...alertCounts.map(a => a.count), 1);
    const niceMax = Math.ceil(maxVal * 1.1);
    const ticks = Array.from({
      length: 6
    }, (_, i) => niceMax * i / 5);
    const barWidth = Math.max(20, chartWidth / alertCounts.length * 0.65);
    const barGap = chartWidth / alertCounts.length;
    return React.createElement("div", {
      className: "chart-card"
    }, React.createElement("h3", {
      className: "chart-title"
    }, "Alert Counts by Type"), React.createElement("p", {
      className: "chart-subtitle"
    }, "Total alerts per category for ", selectedDate), React.createElement("div", {
      style: {
        width: '100%',
        overflowX: 'auto'
      }
    }, React.createElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      style: {
        width: '100%',
        minWidth: '500px'
      },
      preserveAspectRatio: "xMidYMid meet"
    }, ticks.map((t, i) => {
      const y = padding.top + chartHeight - t / niceMax * chartHeight;
      return React.createElement("g", {
        key: i
      }, React.createElement("line", {
        x1: padding.left,
        y1: y,
        x2: width - padding.right,
        y2: y,
        stroke: "#272925",
        strokeOpacity: "0.5",
        strokeDasharray: "2 4"
      }), React.createElement("text", {
        x: padding.left - 8,
        y: y + 4,
        fill: "#9CA3AF",
        fontSize: "11",
        textAnchor: "end"
      }, Math.round(t)));
    }), alertCounts.map((d, i) => {
      const barH = d.count / niceMax * chartHeight;
      const x = padding.left + i * barGap + (barGap - barWidth) / 2;
      const y = padding.top + chartHeight - barH;
      const color = ALERT_PALETTE[i % ALERT_PALETTE.length];
      return React.createElement("g", {
        key: i
      }, React.createElement("rect", {
        x: x,
        y: y,
        width: barWidth,
        height: barH,
        fill: color,
        rx: "4"
      }), React.createElement("text", {
        x: x + barWidth / 2,
        y: y - 6,
        fill: "#FFFFFF",
        fontSize: "11",
        textAnchor: "middle",
        fontWeight: "500"
      }, d.count), React.createElement("text", {
        x: x + barWidth / 2,
        y: padding.top + chartHeight + 18,
        fill: "#9CA3AF",
        fontSize: "10",
        textAnchor: "end",
        transform: `rotate(-20, ${x + barWidth / 2}, ${padding.top + chartHeight + 18})`
      }, d.label.length > 16 ? d.label.slice(0, 14) + '…' : d.label));
    }), React.createElement("line", {
      x1: padding.left,
      y1: padding.top + chartHeight,
      x2: width - padding.right,
      y2: padding.top + chartHeight,
      stroke: "#272925",
      strokeWidth: "1"
    }))));
  };
  return React.createElement("div", null, React.createElement(PageHeader, {
    title: "Alerts",
    subtitle: "System events & notifications"
  }), React.createElement(FiltersPanel, null, regions.length > 0 && React.createElement(FilterField, {
    label: "Region"
  }, React.createElement("select", {
    value: region,
    onChange: e => {
      setRegion(e.target.value);
      setArea('');
    }
  }, React.createElement("option", {
    value: ""
  }, "All"), regions.map(r => React.createElement("option", {
    key: r,
    value: r
  }, r)))), filteredAreas.length > 0 && React.createElement(FilterField, {
    label: "Area"
  }, React.createElement("select", {
    value: area,
    onChange: e => setArea(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "All"), filteredAreas.map(a => React.createElement("option", {
    key: a,
    value: a
  }, a)))), React.createElement(FilterField, {
    label: "Branch"
  }, React.createElement("select", {
    value: branchId ?? '',
    onChange: e => setBranchId(Number(e.target.value) || null)
  }, React.createElement("option", {
    value: ""
  }, "Select branch"), branchOptions.map(b => React.createElement("option", {
    key: b.branch_id,
    value: b.branch_id
  }, b.branch_name, " (", b.branch_id, ")")))), React.createElement(FilterField, {
    label: "Date"
  }, React.createElement("input", {
    type: "date",
    value: selectedDate,
    onChange: e => setSelectedDate(e.target.value)
  }))), React.createElement(ErrorMessage, {
    error: error
  }), loading && React.createElement(LoadingSpinner, {
    message: "Fetching alert data..."
  }), !loading && !error && branchId && React.createElement(React.Fragment, null, alertCounts.length > 0 && React.createElement(React.Fragment, null, React.createElement("h3", {
    className: "card-title",
    style: {
      marginBottom: '16px'
    }
  }, "Alert Summary"), React.createElement("div", {
    className: "grid grid-4"
  }, alertCounts.map((a, i) => React.createElement(StatCard, {
    key: a.alert_type,
    label: h.formatAlertType(a.alert_type),
    value: a.count,
    unit: "alerts",
    icon: "◬"
  })))), renderColoredBarChart(), React.createElement("div", {
    className: "card card-dark",
    style: {
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }
  }, React.createElement("h3", {
    className: "card-title"
  }, "Generate Reports"), React.createElement("button", {
    className: "primary-btn",
    onClick: downloadReport,
    disabled: !alertCounts.length
  }, " \u2B07 Download Alerts Report ")), React.createElement(DataTable, {
    title: "Alert Details",
    columns: [{
      header: 'Alert Type',
      key: 'label'
    }, {
      header: 'Count',
      key: 'count'
    }],
    data: alertCounts,
    emptyMessage: "No alerts found for the selected date and branch"
  })), !branchId && !loading && React.createElement("div", {
    className: "card card-dark",
    style: {
      padding: '48px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }
  }, " Please select a branch to view alerts. "));
}
window.AlertsPage = AlertsPage;

// ===== app =====
// === MAIN APP ===
function App() {
  const {
    useState,
    useEffect,
    useMemo
  } = React;
  const h = window.helpers;
  const api = window.api;

  // Hash-based routing
  const getPageFromHash = () => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (['dashboard', 'shutter', 'customers', 'alerts'].includes(hash)) return hash;
    return 'dashboard';
  };
  const [currentPage, setCurrentPage] = useState(getPageFromHash());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    api.listBranches().then(data => setBranches(Array.isArray(data) ? data : [])).catch(e => setBootError(e)).finally(() => setLoading(false));
  }, []);
  const regions = useMemo(() => h.uniqueRegions(branches), [branches]);
  const areas = useMemo(() => h.uniqueAreas(branches), [branches]);
  const navigate = page => {
    window.location.hash = '#/' + page;
    setCurrentPage(page);
    setMobileOpen(false);
  };
  const renderPage = () => {
    if (loading) return React.createElement(LoadingSpinner, {
      message: "Loading branches..."
    });
    if (bootError) return React.createElement("div", {
      className: "card card-dark",
      style: {
        padding: '32px'
      }
    }, React.createElement(ErrorMessage, {
      error: bootError
    }), React.createElement("p", {
      style: {
        color: 'var(--text-secondary)',
        fontSize: '13px',
        marginTop: '12px'
      }
    }, " Could not connect to backend API. Make sure the dashboard is being served from the same origin as the API, or check that you can reach ", React.createElement("code", null, "/api/v1/branches"), ". "));
    if (!branches.length) return React.createElement("div", {
      className: "card card-dark",
      style: {
        padding: '48px',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }
    }, " No branches available. ");
    const props = {
      branches,
      regions,
      areas
    };
    switch (currentPage) {
      case 'dashboard':
        return React.createElement(DashboardPage, {
          ...props
        });
      case 'shutter':
        return React.createElement(ShutterPage, {
          ...props
        });
      case 'customers':
        return React.createElement(CustomersPage, {
          ...props
        });
      case 'alerts':
        return React.createElement(AlertsPage, {
          ...props
        });
      default:
        return React.createElement(DashboardPage, {
          ...props
        });
    }
  };
  return React.createElement("div", {
    className: "app"
  }, React.createElement("button", {
    className: "mobile-menu-btn",
    onClick: () => setMobileOpen(!mobileOpen)
  }, mobileOpen ? '×' : '☰'), React.createElement(Sidebar, {
    currentPage: currentPage,
    onNavigate: navigate,
    mobileOpen: mobileOpen,
    onCloseMobile: () => setMobileOpen(false)
  }), React.createElement("main", {
    className: "main"
  }, renderPage()));
}
window.addEventListener('DOMContentLoaded', () => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App, null));
});
