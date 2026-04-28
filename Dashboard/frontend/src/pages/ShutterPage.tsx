import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import PageHeader from "../components/PageHeader";
import FilterSection from "../components/FilterSection";
import MetricCard from "../components/MetricCard";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBranches } from "../hooks/useBranches";
import { getShutterEvents, getShutterStatus } from "../api/shutter";
import type { ShutterEvent, ShutterStatus } from "../types";
import { todayISO, downloadCsv, timeToMinutes, minutesToTimeStr } from "../utils/helpers";

const STATE_COLORS: Record<string, string> = {
  Opened: "#A7F3D0",
  "Partially Closed": "#D1FAE5",
  Closed: "#4B5563",
};

function classifyEvent(eventType: string): string {
  const lower = eventType.toLowerCase();
  if (lower.includes("open")) return "Opened";
  if (lower.includes("partial")) return "Partially Closed";
  if (lower.includes("close")) return "Closed";
  return eventType;
}

export default function ShutterPage() {
  const { branches, regions, areas, filteredBranches } = useBranches();

  const [region, setRegion] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<number | null>(1290);
  const [viewMode, setViewMode] = useState<"single" | "interval">("single");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [shutterStateFilter, setShutterStateFilter] = useState<string>("All");

  const [events, setEvents] = useState<ShutterEvent[]>([]);
  const [status, setStatus] = useState<ShutterStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchOptions = useMemo(() => filteredBranches(region, area), [branches, region, area]);

  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find((b) => b.branch_id === branchId)) return;
    const preferred = branchOptions.find((b) => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      if (viewMode === "single") {
        const [evts, st] = await Promise.all([
          getShutterEvents(branchId, { date: selectedDate }),
          getShutterStatus(branchId),
        ]);
        setEvents(Array.isArray(evts) ? evts : []);
        setStatus(st);
      } else {
        const dateList: string[] = [];
        const d = new Date(startDate);
        const end = new Date(endDate);
        while (d <= end) {
          dateList.push(d.toISOString().slice(0, 10));
          d.setDate(d.getDate() + 1);
        }
        const allEvents = await Promise.all(
          dateList.map((date) => getShutterEvents(branchId, { date })),
        );
        setEvents(allEvents.flat());
        setStatus(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load shutter data");
    } finally {
      setLoading(false);
    }
  }, [branchId, viewMode, selectedDate, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter events by shutter state
  const filteredEvents = useMemo(() => {
    if (shutterStateFilter === "All") return events;
    return events.filter((e) => {
      const cls = classifyEvent(e.event_type);
      if (shutterStateFilter === "open") return cls === "Opened";
      if (shutterStateFilter === "closed") return cls === "Closed";
      return true;
    });
  }, [events, shutterStateFilter]);

  // KPIs for single date
  const latestState = status?.latest_event_type ? classifyEvent(status.latest_event_type) : "N/A";
  const firstOpenTime = useMemo(() => {
    const openEvents = events.filter((e) => classifyEvent(e.event_type) === "Opened");
    if (!openEvents.length) return "N/A";
    const times = openEvents.map((e) => e.timestamp).sort();
    const ts = times[0];
    return ts?.split("T")[1]?.slice(0, 8) ?? ts?.slice(0, 8) ?? "N/A";
  }, [events]);

  const lastCloseTime = useMemo(() => {
    const closeEvents = events.filter((e) => classifyEvent(e.event_type) === "Closed");
    if (!closeEvents.length) return "N/A";
    const times = closeEvents.map((e) => e.timestamp).sort();
    const ts = times[times.length - 1];
    return ts?.split("T")[1]?.slice(0, 8) ?? ts?.slice(0, 8) ?? "N/A";
  }, [events]);

  // Timeline segments for single-date view
  const timelineSegments = useMemo(() => {
    if (viewMode !== "single" || !events.length) return [];

    const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const segments: { state: string; startMin: number; endMin: number; startTime: string; endTime: string }[] = [];

    const DAY_START = 360; // 6:00 AM
    const DAY_END = 1680; // 4:00 AM next day (24h + 4h = 28h * 60)

    const toBusinessMin = (ts: string) => {
      const timePart = ts.includes("T") ? ts.split("T")[1]?.slice(0, 8) : ts.slice(0, 8);
      const m = timeToMinutes(timePart || "00:00:00");
      if (m < 240) return 1080 + m; // after midnight → end of business day
      return m - DAY_START;
    };

    let currentState: string | null = null;
    let currentStart = 0;

    for (const evt of sorted) {
      const newState = classifyEvent(evt.event_type);
      const eventMin = Math.max(0, Math.min(1320, toBusinessMin(evt.timestamp)));
      const timePart = evt.timestamp.includes("T") ? evt.timestamp.split("T")[1]?.slice(0, 5) : evt.timestamp.slice(0, 5);

      if (currentState !== null) {
        segments.push({
          state: currentState,
          startMin: currentStart,
          endMin: eventMin,
          startTime: minutesToTimeStr(currentStart + DAY_START),
          endTime: timePart || "",
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
        startTime: minutesToTimeStr(currentStart + DAY_START),
        endTime: "04:00",
      });
    }

    return segments;
  }, [events, viewMode]);

  // Build chart data from segments
  const timelineChartData = useMemo(() => {
    if (!timelineSegments.length) return [];
    return timelineSegments.map((seg, i) => ({
      name: `${seg.startTime}`,
      state: seg.state,
      start: seg.startMin,
      duration: seg.endMin - seg.startMin,
      tooltip: `${seg.state}: ${seg.startTime} → ${seg.endTime}`,
      index: i,
    }));
  }, [timelineSegments]);

  // Interval KPIs
  const uniqueDates = useMemo(() => new Set((Array.isArray(events) ? events : []).map((e) => e.date || e.timestamp.slice(0, 10))).size, [events]);

  const tableColumns = [
    { key: "event_type", label: "Event", render: (v: unknown) => classifyEvent(v as string) },
    { key: "timestamp", label: "Timestamp" },
    { key: "date", label: "Date" },
  ];

  return (
    <div>
      <PageHeader />

      <FilterSection>
        {regions.length > 0 && (
          <div>
            <label htmlFor="shutter-filter-region" className="block text-xs font-medium text-energy-text-secondary mb-1">Region</label>
            <select id="shutter-filter-region" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={region ?? ""} onChange={(e) => { setRegion(e.target.value || null); setArea(null); }}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {regions.sort().map((r) => <option key={r} value={r} className="bg-energy-bg-card-dark">{r}</option>)}
            </select>
          </div>
        )}
        {areas.length > 0 && (
          <div>
            <label htmlFor="shutter-filter-area" className="block text-xs font-medium text-energy-text-secondary mb-1">Area</label>
            <select id="shutter-filter-area" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={area ?? ""} onChange={(e) => setArea(e.target.value || null)}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {areas.sort().map((a) => <option key={a} value={a} className="bg-energy-bg-card-dark">{a}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="shutter-filter-branch" className="block text-xs font-medium text-energy-text-secondary mb-1">Branch</label>
          <select id="shutter-filter-branch" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || null)}>
            <option value="" className="bg-energy-bg-card-dark">Select branch</option>
            {branchOptions.map((b) => <option key={b.branch_id} value={b.branch_id} className="bg-energy-bg-card-dark">{b.branch_name} ({b.branch_id})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-energy-text-secondary mb-1">View Mode</label>
          <div className="flex gap-2">
            <button onClick={() => setViewMode("single")} className={`flex-1 px-2 py-2 rounded-xl text-xs font-medium transition ${viewMode === "single" ? "bg-energy-accent-mint text-energy-text-inverse" : "bg-energy-bg-card-dark text-energy-text-secondary border border-energy-border-subtle/30 hover:text-energy-text-primary"}`}>Single Date</button>
            <button onClick={() => setViewMode("interval")} className={`flex-1 px-2 py-2 rounded-xl text-xs font-medium transition ${viewMode === "interval" ? "bg-energy-accent-mint text-energy-text-inverse" : "bg-energy-bg-card-dark text-energy-text-secondary border border-energy-border-subtle/30 hover:text-energy-text-primary"}`}>Interval</button>
          </div>
        </div>
        {viewMode === "single" ? (
          <>
            <div>
              <label htmlFor="shutter-filter-date" className="block text-xs font-medium text-energy-text-secondary mb-1">Date</label>
              <input id="shutter-filter-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="shutter-filter-shutter-state" className="block text-xs font-medium text-energy-text-secondary mb-1">Shutter State</label>
              <select id="shutter-filter-shutter-state" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={shutterStateFilter} onChange={(e) => setShutterStateFilter(e.target.value)}>
                <option value="All" className="bg-energy-bg-card-dark">All</option>
                <option value="open" className="bg-energy-bg-card-dark">Open</option>
                <option value="closed" className="bg-energy-bg-card-dark">Closed</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="shutter-filter-start-date" className="block text-xs font-medium text-energy-text-secondary mb-1">Start Date</label>
              <input id="shutter-filter-start-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="shutter-filter-end-date" className="block text-xs font-medium text-energy-text-secondary mb-1">End Date</label>
              <input id="shutter-filter-end-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </div>
          </>
        )}
      </FilterSection>

      {error && <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-xl p-3 mb-4 text-sm">{error}</div>}
      {loading && <LoadingSpinner message="Fetching shutter data..." />}

      {!loading && !error && branchId && (
        <>
          {/* KPI Cards */}
          {viewMode === "single" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <MetricCard label="Current State" value={latestState} />
              <MetricCard label="Opening Time" value={firstOpenTime} />
              <MetricCard label="Closing Time" value={lastCloseTime} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <MetricCard label="Days Tracked" value={uniqueDates} unit="days" />
              <MetricCard label="Total Events" value={events.length} unit="events" />
            </div>
          )}

          {/* Timeline chart (single date) */}
          {viewMode === "single" && shutterStateFilter !== "closed" && timelineChartData.length > 0 && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-2">Shutter State Timeline — {selectedDate}</h3>
              <p className="text-body-label text-energy-text-secondary mb-4">Day: 6:00 AM to 4:00 AM — colored segments show periods of each state</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={timelineChartData} layout="vertical" barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis type="number" domain={[0, 1320]}
                    tickFormatter={(v: number) => minutesToTimeStr(v + 360)}
                    ticks={[0, 360, 720, 1080, 1320]}
                    tick={{ fill: "#9CA3AF" }}
                    stroke="#272925" />
                  <YAxis type="category" dataKey={() => "Branch"} width={60} tick={{ fill: "#9CA3AF" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                    formatter={(value: unknown, _name: unknown, props: unknown) => {
                      const p = (props as { payload?: typeof timelineChartData[0] }).payload;
                      return [p?.tooltip ?? String(value), ""];
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                  <Bar dataKey="duration" stackId="a" name="State">
                    {timelineChartData.map((d) => (
                      <Cell key={d.index} fill={STATE_COLORS[d.state] || "#666"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-4 justify-center">
                {Object.entries(STATE_COLORS).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-energy-text-secondary">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports */}
          <div className="card-dark mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-card-title text-energy-text-primary">Generate Reports</h3>
            <button
              className="px-4 py-2 bg-energy-accent-mint text-energy-text-inverse rounded-xl text-sm font-medium hover:bg-energy-accent-mint-light transition"
              onClick={() => downloadCsv(
                filteredEvents.map((e) => ({
                  "Event": classifyEvent(e.event_type),
                  "Timestamp": e.timestamp,
                  "Date": e.date || e.timestamp.slice(0, 10),
                })),
                viewMode === "single"
                  ? `shutter_events_${selectedDate}.csv`
                  : `shutter_events_${startDate}_to_${endDate}.csv`,
              )}
              disabled={!filteredEvents.length}
            >
              Download Shutter Events Report
            </button>
          </div>

          {/* Data table */}
          <div className="mb-6">
            <DataTable
              title="Event Details"
              columns={tableColumns}
              data={filteredEvents as unknown as Record<string, unknown>[]}
            />
          </div>

          {!filteredEvents.length && (
            <div className="card-dark p-8 text-center text-energy-text-secondary">
              No shutter events for the selected filters.
            </div>
          )}
        </>
      )}

      {!branchId && !loading && (
        <div className="card-dark p-12 text-center text-energy-text-secondary">
          Please select a branch to view shutter data.
        </div>
      )}
    </div>
  );
}
