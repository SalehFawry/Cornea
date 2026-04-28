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