// === SHUTTER STATE PAGE ===
function ShutterPage({ branches, regions, areas }) {
  const { useState, useEffect, useMemo, useCallback } = React;
  const h = window.helpers;
  const api = window.api;

  const STATE_COLORS = {
    'Opened': '#A7F3D0',
    'Partially Closed': '#D1FAE5',
    'Closed': '#4B5563',
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
        const [evts, st] = await Promise.all([
          api.getShutterEvents(branchId, { date: selectedDate }).catch(() => []),
          api.getShutterStatus(branchId).catch(() => null)
        ]);
        setEvents(Array.isArray(evts) ? evts : []);
        setStatus(st);
      } else {
        const dates = h.buildDateRange(startDate, endDate);
        const allEvents = await Promise.all(dates.map(d => api.getShutterEvents(branchId, { date: d }).catch(() => [])));
        setEvents(allEvents.flat());
        setStatus(null);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [branchId, viewMode, selectedDate, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

    const toBusinessMin = (ts) => {
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
          endTime: timePart || '',
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
        endTime: '04:00',
      });
    }

    return segments;
  }, [events, viewMode]);

  const uniqueDates = useMemo(() => new Set(events.map(e => e.date || e.timestamp.slice(0, 10))).size, [events]);

  const downloadEvents = () => {
    h.downloadCSV(
      viewMode === 'single' ? `shutter_events_${selectedDate}.csv` : `shutter_events_${startDate}_to_${endDate}.csv`,
      filteredEvents.map(e => ({
        Event: h.classifyShutterEvent(e.event_type),
        Timestamp: e.timestamp,
        Date: e.date || e.timestamp.slice(0, 10),
      }))
    );
  };

  // Timeline rendering as horizontal bar
  const renderTimeline = () => {
    if (!timelineSegments.length) return null;
    const totalMin = 1320;
    return (
      <div className="chart-card">
        <h3 className="chart-title">Shutter State Timeline — {selectedDate}</h3>
        <p className="chart-subtitle">Day: 6:00 AM to 4:00 AM next day</p>

        {/* Time axis */}
        <div style={{ position: 'relative', height: '24px', marginBottom: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
          {[0, 360, 720, 1080, 1320].map(m => (
            <span key={m} style={{ position: 'absolute', left: `${(m / totalMin) * 100}%`, transform: 'translateX(-50%)' }}>
              {h.minutesToTimeStr(m + 360)}
            </span>
          ))}
        </div>

        {/* Timeline bar */}
        <div style={{ position: 'relative', height: '60px', background: '#272925', borderRadius: '8px', overflow: 'hidden' }}>
          {timelineSegments.map((seg, i) => {
            const left = (seg.startMin / totalMin) * 100;
            const width = ((seg.endMin - seg.startMin) / totalMin) * 100;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${Math.max(0.3, width)}%`,
                top: 0, bottom: 0,
                background: STATE_COLORS[seg.state] || '#666',
                opacity: 0.85
              }} title={`${seg.state}: ${seg.startTime} → ${seg.endTime}`} />
            );
          })}
        </div>

        <div className="legend">
          {Object.entries(STATE_COLORS).map(([label, color]) => (
            <div key={label} className="legend-item">
              <span className="legend-color" style={{ background: color }}></span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Shutter State" subtitle="Open/close events and timeline" />

      <FiltersPanel>
        {regions.length > 0 && (
          <FilterField label="Region">
            <select value={region} onChange={e => { setRegion(e.target.value); setArea(''); }}>
              <option value="">All</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </FilterField>
        )}
        {filteredAreas.length > 0 && (
          <FilterField label="Area">
            <select value={area} onChange={e => setArea(e.target.value)}>
              <option value="">All</option>
              {filteredAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </FilterField>
        )}
        <FilterField label="Branch">
          <select value={branchId ?? ''} onChange={e => setBranchId(Number(e.target.value) || null)}>
            <option value="">Select branch</option>
            {branchOptions.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.branch_id})</option>)}
          </select>
        </FilterField>
        <FilterField label="View Mode">
          <div className="toggle-buttons">
            <button className={`toggle-btn ${viewMode === 'single' ? 'active' : ''}`} onClick={() => setViewMode('single')}>Single Date</button>
            <button className={`toggle-btn ${viewMode === 'interval' ? 'active' : ''}`} onClick={() => setViewMode('interval')}>Interval</button>
          </div>
        </FilterField>
        {viewMode === 'single' ? (
          <>
            <FilterField label="Date">
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </FilterField>
            <FilterField label="Shutter State">
              <select value={shutterStateFilter} onChange={e => setShutterStateFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </FilterField>
          </>
        ) : (
          <>
            <FilterField label="Start Date">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </FilterField>
            <FilterField label="End Date">
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
            </FilterField>
          </>
        )}
      </FiltersPanel>

      <ErrorMessage error={error} />
      {loading && <LoadingSpinner message="Fetching shutter data..." />}

      {!loading && !error && branchId && (
        <>
          {viewMode === 'single' ? (
            <div className="grid grid-3">
              <StatCard label="Current State" value={latestState} icon="◉" />
              <StatCard label="Opening Time" value={firstOpenTime} icon="↑" />
              <StatCard label="Closing Time" value={lastCloseTime} icon="↓" />
            </div>
          ) : (
            <div className="grid grid-2">
              <StatCard label="Days Tracked" value={uniqueDates} unit="days" />
              <StatCard label="Total Events" value={events.length} unit="events" />
            </div>
          )}

          {viewMode === 'single' && shutterStateFilter !== 'closed' && renderTimeline()}

          {/* Reports */}
          <div className="card card-dark" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <h3 className="card-title">Generate Reports</h3>
            <button className="primary-btn" onClick={downloadEvents} disabled={!filteredEvents.length}>
              ⬇ Download Shutter Events Report
            </button>
          </div>

          <DataTable
            title="Event Details"
            columns={[
              { header: 'Event', key: 'event_type', render: r => h.classifyShutterEvent(r.event_type) },
              { header: 'Timestamp', key: 'timestamp', render: r => h.formatDateTime(r.timestamp) },
              { header: 'Date', key: 'date', render: r => r.date || r.timestamp?.slice(0, 10) }
            ]}
            data={filteredEvents}
            emptyMessage="No shutter events for the selected filters"
          />
        </>
      )}

      {!branchId && !loading && (
        <div className="card card-dark" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Please select a branch to view shutter data.
        </div>
      )}
    </div>
  );
}

window.ShutterPage = ShutterPage;
