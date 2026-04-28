// === SHARED COMPONENTS ===
const { useState, useEffect, useMemo, useCallback } = React;
const h = window.helpers;

// === LOGO ICON ===
function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
      <path d="M12 7v10M8 9.5l8 5M16 9.5l-8 5" />
    </svg>
  );
}

// === SIDEBAR ===
function Sidebar({ currentPage, onNavigate, mobileOpen, onCloseMobile }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'shutter', label: 'Shutter State', icon: '⊟' },
    { id: 'customers', label: 'Customers', icon: '⊙' },
    { id: 'alerts', label: 'Alerts', icon: '◬' },
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="logo">
        <div className="logo-icon"><LogoIcon /></div>
        <span className="logo-text">EcoSync</span>
      </div>

      <nav className="nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => { onNavigate(item.id); onCloseMobile && onCloseMobile(); }}
          >
            <span style={{ fontSize: '14px', opacity: 0.7 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-card">
          <div className="status-label">System Status</div>
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span className="status-text">Live · All systems normal</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// === HEADER ===
function PageHeader({ title, subtitle }) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="time-display">
        <span className="time-value">{time}</span>
        <span className="time-label">Time</span>
      </div>
    </div>
  );
}

// === LOADING ===
function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <div className="loading-text">{message}</div>
    </div>
  );
}

// === ERROR ===
function ErrorMessage({ error }) {
  if (!error) return null;
  return <div className="error-message">⚠ {String(error.message || error)}</div>;
}

// === STAT CARD ===
function StatCard({ label, value, unit, subtitle, variant = 'dark', trend, icon }) {
  const isLight = variant === 'light';
  return (
    <div className={`card ${isLight ? 'card-light' : 'card-dark'}`}>
      {label && (
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
          <span>{label}</span>
          {trend && <span className={`category-trend ${trend === 'up' ? 'up' : 'down'}`}>{trend === 'up' ? '↑' : '↓'}</span>}
        </div>
      )}
      <div className="stat-display">
        <div className="stat-value">{value}</div>
        {unit && <div className="stat-unit">{unit}</div>}
        {subtitle && <div style={{ fontSize: '11px', marginTop: '8px', color: isLight ? 'var(--text-inverse-muted)' : 'var(--text-secondary)' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// === DATA TABLE ===
function DataTable({ columns, data, title, action, maxHeight = '420px', emptyMessage = 'No records' }) {
  return (
    <div className="card card-dark table-card" style={{ marginBottom: '24px' }}>
      {title && (
        <div className="table-header">
          <h3 className="card-title">{title}</h3>
          {action}
        </div>
      )}
      <div className="table-wrapper" style={{ maxHeight }}>
        {(!data || data.length === 0) ? (
          <div className="empty-state">{emptyMessage}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>{columns.map((c, i) => <th key={i}>{c.header}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((row, ri) => (
                <tr key={ri}>
                  {columns.map((col, ci) => (
                    <td key={ci}>{col.render ? col.render(row, ri) : (row[col.key] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// === FILTERS PANEL ===
function FiltersPanel({ children, title = 'Filters', action }) {
  return (
    <div className="filters-card">
      <div className="filters-header">
        <h3 className="filters-title">{title}</h3>
        {action}
      </div>
      <div className="filters-grid">{children}</div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div className="filter-group">
      <label className="filter-label">{label}</label>
      {children}
    </div>
  );
}

// === BAR CHART (SVG) ===
function BarChart({ data, xKey, yKey, color = '#A7F3D0', height = 280, formatY }) {
  if (!data || data.length === 0) return <div className="empty-state">No data</div>;

  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const niceMax = Math.ceil(maxVal * 1.1);

  const barWidth = Math.max(8, (chartWidth / data.length) * 0.6);
  const barGap = chartWidth / data.length;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax * i) / tickCount);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '500px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {ticks.map((t, i) => {
          const y = padding.top + chartHeight - (t / niceMax) * chartHeight;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#272925" strokeOpacity="0.5" strokeDasharray="2 4" />
              <text x={padding.left - 8} y={y + 4} fill="#9CA3AF" fontSize="10" textAnchor="end">
                {formatY ? formatY(t) : Math.round(t)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = Number(d[yKey]) || 0;
          const barH = (val / niceMax) * chartHeight;
          const x = padding.left + i * barGap + (barGap - barWidth) / 2;
          const y = padding.top + chartHeight - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} fill={color} rx="3" />
              <text x={x + barWidth / 2} y={padding.top + chartHeight + 16} fill="#9CA3AF" fontSize="10" textAnchor="middle">
                {String(d[xKey] ?? '').slice(0, 10)}
              </text>
              {val > 0 && (
                <text x={x + barWidth / 2} y={y - 4} fill="#FFFFFF" fontSize="10" textAnchor="middle">
                  {formatY ? formatY(val) : Math.round(val)}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="#272925" strokeWidth="1" />
      </svg>
    </div>
  );
}

// === LINE CHART (SVG) ===
function LineChart({ data, xKey, yKey, color = '#A7F3D0', height = 280, formatY }) {
  if (!data || data.length === 0) return <div className="empty-state">No data</div>;

  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const niceMax = Math.ceil(maxVal * 1.1);

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax * i) / tickCount);

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
  const points = data.map((d, i) => {
    const val = Number(d[yKey]) || 0;
    const x = padding.left + (data.length > 1 ? i * xStep : chartWidth / 2);
    const y = padding.top + chartHeight - (val / niceMax) * chartHeight;
    return { x, y, val, label: d[xKey] };
  });

  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x},${padding.top + chartHeight} L${points[0].x},${padding.top + chartHeight} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '500px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="line-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => {
          const y = padding.top + chartHeight - (t / niceMax) * chartHeight;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#272925" strokeOpacity="0.5" strokeDasharray="2 4" />
              <text x={padding.left - 8} y={y + 4} fill="#9CA3AF" fontSize="10" textAnchor="end">
                {formatY ? formatY(t) : Math.round(t)}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill="url(#line-gradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={color} />
            <text x={p.x} y={padding.top + chartHeight + 16} fill="#9CA3AF" fontSize="10" textAnchor="middle">
              {String(p.label ?? '').slice(0, 10)}
            </text>
          </g>
        ))}

        <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="#272925" strokeWidth="1" />
      </svg>
    </div>
  );
}

// === STACKED BAR CHART ===
function StackedBarChart({ data, xKey, series, height = 280 }) {
  if (!data || data.length === 0) return <div className="empty-state">No data</div>;

  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const totals = data.map(d => series.reduce((s, sr) => s + (Number(d[sr.key]) || 0), 0));
  const maxVal = Math.max(...totals, 1);
  const niceMax = Math.ceil(maxVal * 1.1);

  const barWidth = Math.max(8, (chartWidth / data.length) * 0.6);
  const barGap = chartWidth / data.length;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax * i) / tickCount);

  return (
    <div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '500px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
          {ticks.map((t, i) => {
            const y = padding.top + chartHeight - (t / niceMax) * chartHeight;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#272925" strokeOpacity="0.5" strokeDasharray="2 4" />
                <text x={padding.left - 8} y={y + 4} fill="#9CA3AF" fontSize="10" textAnchor="end">{Math.round(t)}</text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const x = padding.left + i * barGap + (barGap - barWidth) / 2;
            let yOffset = 0;
            return (
              <g key={i}>
                {series.map((sr, si) => {
                  const val = Number(d[sr.key]) || 0;
                  const barH = (val / niceMax) * chartHeight;
                  const y = padding.top + chartHeight - barH - yOffset;
                  yOffset += barH;
                  return <rect key={si} x={x} y={y} width={barWidth} height={barH} fill={sr.color} />;
                })}
                <text x={x + barWidth / 2} y={padding.top + chartHeight + 16} fill="#9CA3AF" fontSize="10" textAnchor="middle">
                  {String(d[xKey] ?? '').slice(0, 10)}
                </text>
              </g>
            );
          })}

          <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke="#272925" strokeWidth="1" />
        </svg>
      </div>

      <div className="legend">
        {series.map((sr, i) => (
          <div key={i} className="legend-item">
            <span className="legend-color" style={{ background: sr.color }}></span>
            <span>{sr.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === TIMELINE BAR CHART (Horizontal stacked timeline for shutter events) ===
function TimelineBar({ events, startTime, endTime, stateColors, height = 60 }) {
  if (!events || events.length === 0) return <div className="empty-state">No events</div>;

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const total = end - start || 1;

  return (
    <div style={{ position: 'relative', height: `${height}px`, background: '#272925', borderRadius: '8px', overflow: 'hidden' }}>
      {events.map((ev, i) => {
        const evStart = Math.max(start, new Date(ev.start_time || ev.timestamp).getTime());
        const evEnd = Math.min(end, new Date(ev.end_time || ev.timestamp).getTime() + (ev.end_time ? 0 : 60000));
        const left = ((evStart - start) / total) * 100;
        const width = ((evEnd - evStart) / total) * 100;
        const color = stateColors[ev.state] || stateColors[ev.event_type] || '#A7F3D0';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              width: `${Math.max(0.5, width)}%`,
              top: 0,
              bottom: 0,
              background: color,
              opacity: 0.85,
            }}
            title={`${ev.state || ev.event_type} @ ${h.formatDateTime(ev.start_time || ev.timestamp)}`}
          />
        );
      })}
    </div>
  );
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
