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