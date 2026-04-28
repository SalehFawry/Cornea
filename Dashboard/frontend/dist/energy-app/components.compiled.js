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