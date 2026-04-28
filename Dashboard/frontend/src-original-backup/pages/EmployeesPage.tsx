import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import PageHeader from "../components/PageHeader";
import FilterSection from "../components/FilterSection";
import MetricCard from "../components/MetricCard";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBranches } from "../hooks/useBranches";
import { getAttendance } from "../api/attendance";
import { listEmployees } from "../api/branches";
import type { AttendanceRecord, Employee } from "../types";
import {
  formatWorkingHours, formatTimeAmPm, toSecondsFromMidnight,
  getChartColor, downloadCsv, todayISO,
} from "../utils/helpers";

// Sparkline component for mini bar charts
function SparklineBar({ data, height = 60 }: { data: number[]; height?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-16 justify-center">
      {data.map((value, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-energy-text-primary/60 hover:bg-energy-text-primary transition-all"
          style={{ height: `${(value / max) * height}%` }}
        />
      ))}
    </div>
  );
}

// Weekly mini bar chart component
function WeeklyBarChart({ data, highlightedIndex = 2 }: { data: { day: string; value: number; trend: "up" | "down" }[]; highlightedIndex?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex justify-between items-end gap-2">
      {data.map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1">
          <div className="flex items-center gap-0.5 text-xs">
            <span className={item.trend === "up" ? "text-energy-text-primary" : "text-energy-text-secondary"}>
              {item.trend === "up" ? "↑" : "↓"}
            </span>
            <span className="text-data-label text-energy-text-secondary uppercase">{item.day}</span>
          </div>
          <div
            className={`w-2 rounded-full transition-all ${i === highlightedIndex ? "bg-energy-text-primary" : "bg-energy-border-subtle"}`}
            style={{ height: `${(item.value / max) * 40 + 8}px` }}
          />
          <span className="text-xs text-energy-text-secondary font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Toggle switch component
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
        checked ? "bg-energy-border-subtle" : "bg-energy-state-off-track"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white transform transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// Timeline nodes component
function TimelineNodes({ nodes }: { nodes: { time: string; active: boolean }[] }) {
  return (
    <div className="flex items-center gap-0">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
              node.active
                ? "bg-energy-text-inverse border-energy-text-inverse"
                : "bg-transparent border-energy-text-inverse"
            }`}
          />
          {i < nodes.length - 1 && (
            <div className="w-8 border-t-2 border-dotted border-energy-border-subtle" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function EmployeesPage() {
  const { branches, regions, areas, filteredBranches } = useBranches();

  const [region, setRegion] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<number | null>(1290);
  const [viewMode, setViewMode] = useState<"Daily" | "Weekly">("Daily");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [employeeFilter, setEmployeeFilter] = useState<string>("All");
  const [greenConnectionsEnabled, setGreenConnectionsEnabled] = useState(true);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchOptions = useMemo(() => filteredBranches(region, area), [branches, region, area]);

  // Auto-select preferred branch when options change
  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find((b) => b.branch_id === branchId)) return;
    const preferred = branchOptions.find((b) => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);

  // When switching to weekly, set end = start + 6
  useEffect(() => {
    if (viewMode === "Weekly") {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 6);
      setEndDate(d.toISOString().slice(0, 10));
    }
  }, [viewMode, startDate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const dateList: string[] = [];
      const d = new Date(startDate);
      const end = new Date(endDate);
      while (d <= end) {
        dateList.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
      const allRecords = await Promise.all(
        dateList.map((date) => getAttendance(branchId, { date })),
      );
      setRecords(allRecords.flat());

      const empList = await listEmployees(branchId);
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived data
  const filteredRecords = useMemo(() => {
    if (employeeFilter === "All") return records;
    return records.filter((r) => String(r.employee_id) === employeeFilter);
  }, [records, employeeFilter]);

  const uniqueEmployeeIds = useMemo(
    () => [...new Set((Array.isArray(records) ? records : []).map((r) => r.employee_id))].sort((a, b) => a - b),
    [records],
  );

  const isSingleDay = startDate === endDate;
  const selectedEmpId = employeeFilter !== "All" ? Number(employeeFilter) : null;

  // KPI calculations
  const recordsExcluding0 = useMemo(
    () => filteredRecords.filter((r) => r.employee_id !== 0),
    [filteredRecords],
  );

  const avgWorkingHours = useMemo(() => {
    const src = selectedEmpId ? filteredRecords : recordsExcluding0;
    if (!src.length) return 0;
    return src.reduce((s, r) => s + (r.working_hours || 0), 0) / src.length;
  }, [filteredRecords, recordsExcluding0, selectedEmpId]);

  const avgArrivalSec = useMemo(() => {
    const secs = filteredRecords.map((r) => toSecondsFromMidnight(r.first_time_seen)).filter((s): s is number => s !== null);
    return secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null;
  }, [filteredRecords]);

  const avgLeavingSec = useMemo(() => {
    const secs = filteredRecords.map((r) => toSecondsFromMidnight(r.last_time_seen)).filter((s): s is number => s !== null);
    return secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null;
  }, [filteredRecords]);

  const activeEmployees = useMemo(
    () => new Set(recordsExcluding0.map((r) => r.employee_id)).size,
    [recordsExcluding0],
  );

  // Chart data: employees per date
  const employeesPerDate = useMemo(() => {
    const map = new Map<string, Set<number>>();
    recordsExcluding0.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, new Set());
      map.get(r.date)!.add(r.employee_id);
    });
    return [...map.entries()]
      .map(([date, ids]) => ({ date, count: ids.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [recordsExcluding0]);

  // Chart data: avg working hours per date
  const avgHoursPerDate = useMemo(() => {
    const map = new Map<string, number[]>();
    const src = selectedEmpId ? filteredRecords : recordsExcluding0;
    src.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r.working_hours || 0);
    });
    return [...map.entries()]
      .map(([date, hours]) => ({
        date,
        avgHours: +(hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords, recordsExcluding0, selectedEmpId]);

  // Weekly data per employee
  const weeklyByEmployee = useMemo(() => {
    if (viewMode !== "Weekly" || selectedEmpId) return [];
    const map = new Map<number, number>();
    recordsExcluding0.forEach((r) => {
      map.set(r.employee_id, (map.get(r.employee_id) || 0) + (r.working_hours || 0));
    });
    return [...map.entries()]
      .map(([empId, hours]) => ({ employeeId: empId, weeklyHours: +hours.toFixed(2) }))
      .sort((a, b) => b.weeklyHours - a.weeklyHours);
  }, [recordsExcluding0, viewMode, selectedEmpId]);

  // Weekly daily breakdown for specific employee
  const weeklyDailyBreakdown = useMemo(() => {
    if (viewMode !== "Weekly" || !selectedEmpId) return [];
    const map = new Map<string, number>();
    filteredRecords.forEach((r) => {
      map.set(r.date, (map.get(r.date) || 0) + (r.working_hours || 0));
    });
    return [...map.entries()]
      .map(([date, hours]) => {
        const d = new Date(date);
        return { day: d.toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit" }), hours: +hours.toFixed(2) };
      })
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredRecords, viewMode, selectedEmpId]);

  const totalWeeklyHours = useMemo(
    () => (viewMode === "Weekly" && selectedEmpId)
      ? filteredRecords.reduce((s, r) => s + (r.working_hours || 0), 0)
      : 0,
    [filteredRecords, viewMode, selectedEmpId],
  );

  // Find employee name
  const selectedEmpName = useMemo(() => {
    if (!selectedEmpId) return null;
    const emp = employees.find((e) => e.employee_id === selectedEmpId);
    return emp?.name ?? `Employee ${selectedEmpId}`;
  }, [selectedEmpId, employees]);

  // Mock data for energy dashboard visualization
  const consumptionData = [
    { label: "Lighting", trend: "up" as const, sparkline: [45, 52, 48, 61, 55, 67, 71], range: "52–71", unit: "kWh per month" },
    { label: "Refrigerator", trend: "down" as const, sparkline: [35, 32, 31, 29, 33, 30, 37], range: "29–37", unit: "kWh per month" },
    { label: "Air Conditioner", trend: "down" as const, sparkline: [65, 58, 52, 49, 55, 72, 85], range: "49–85", unit: "kWh per month" },
  ];

  const weeklyReportData = [
    { day: "Mon", value: 276, trend: "up" as const },
    { day: "Tue", value: 282, trend: "up" as const },
    { day: "Wed", value: 297, trend: "up" as const },
    { day: "Thu", value: 269, trend: "down" as const },
    { day: "Fri", value: 274, trend: "down" as const },
    { day: "Sat", value: 175, trend: "down" as const },
    { day: "Sun", value: 138, trend: "down" as const },
  ];

  const timelineNodes = [
    { time: "11AM", active: false },
    { time: "11AM", active: true },
    { time: "12PM", active: true },
    { time: "1PM", active: true },
    { time: "2PM", active: true },
  ];

  return (
    <div>
      <PageHeader />

      {/* Filters */}
      <FilterSection>
        {regions.length > 0 && (
          <div>
            <label htmlFor="emp-filter-region" className="block text-xs font-medium text-energy-text-secondary mb-1">Region</label>
            <select id="emp-filter-region" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={region ?? ""} onChange={(e) => { setRegion(e.target.value || null); setArea(null); }}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {regions.sort().map((r) => <option key={r} value={r} className="bg-energy-bg-card-dark">{r}</option>)}
            </select>
          </div>
        )}
        {areas.length > 0 && (
          <div>
            <label htmlFor="emp-filter-area" className="block text-xs font-medium text-energy-text-secondary mb-1">Area</label>
            <select id="emp-filter-area" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={area ?? ""} onChange={(e) => setArea(e.target.value || null)}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {areas.sort().map((a) => <option key={a} value={a} className="bg-energy-bg-card-dark">{a}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="emp-filter-branch" className="block text-xs font-medium text-energy-text-secondary mb-1">Branch</label>
          <select id="emp-filter-branch" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || null)}>
            <option value="" className="bg-energy-bg-card-dark">Select branch</option>
            {branchOptions.map((b) => <option key={b.branch_id} value={b.branch_id} className="bg-energy-bg-card-dark">{b.branch_name} ({b.branch_id})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-energy-text-secondary mb-1">View Mode</label>
          <div className="flex gap-2">
            {(["Daily", "Weekly"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${viewMode === m ? "bg-energy-bg-card-light text-energy-text-inverse" : "bg-energy-bg-card-dark text-energy-text-secondary border border-energy-border-subtle/30 hover:text-energy-text-primary"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="emp-filter-start-date" className="block text-xs font-medium text-energy-text-secondary mb-1">Start Date</label>
          <input id="emp-filter-start-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={startDate}
            onChange={(e) => { setStartDate(e.target.value); if (viewMode === "Daily") setEndDate(e.target.value); }} />
        </div>
        <div>
          <label htmlFor="emp-filter-end-date" className="block text-xs font-medium text-energy-text-secondary mb-1">End Date</label>
          <input id="emp-filter-end-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint disabled:opacity-50" value={endDate}
            onChange={(e) => setEndDate(e.target.value)} disabled={viewMode === "Weekly"} min={startDate} />
        </div>
        <div>
          <label htmlFor="emp-filter-employee" className="block text-xs font-medium text-energy-text-secondary mb-1">Employee</label>
          <select id="emp-filter-employee" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
            <option value="All" className="bg-energy-bg-card-dark">All</option>
            {uniqueEmployeeIds.map((id) => <option key={id} value={String(id)} className="bg-energy-bg-card-dark">{id}</option>)}
          </select>
        </div>
      </FilterSection>

      {error && <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-xl p-3 mb-4 text-sm">{error}</div>}
      {loading && <LoadingSpinner message="Fetching energy data..." />}

      {!loading && !error && branchId && (
        <>
          {selectedEmpName && (
            <p className="text-sm font-medium text-energy-text-secondary mb-3">
              Selected: <span className="text-energy-text-primary">{selectedEmpName}</span> (ID: {selectedEmpId})
            </p>
          )}

          {/* Top Row Grid - 1.5fr 1fr 0.8fr */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.5fr 1fr 0.8fr" }}>
            {/* Total Energy Consumption (Dark Card) */}
            <div className="card-dark">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-card-title text-energy-text-primary">Total energy consumption</h3>
                <button className="pill-button">Change module</button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {consumptionData.map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-3">
                      <span className="text-body-label text-energy-text-secondary">{item.label}</span>
                      <span className={`text-xs ${item.trend === "up" ? "text-energy-accent-mint" : "text-energy-text-secondary"}`}>
                        {item.trend === "up" ? "↑" : "↓"}
                      </span>
                    </div>
                    <SparklineBar data={item.sparkline} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-energy-border-subtle/30">
                {consumptionData.map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="text-big-stat text-energy-text-primary">{item.range}</div>
                    <div className="text-stat-unit text-energy-text-secondary">{item.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Green Connections (Dark Card) */}
            <div className="card-dark flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-card-title text-energy-text-primary">Green connections</h3>
                <button className="text-energy-text-secondary hover:text-energy-text-primary transition">⋮</button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-body-label text-energy-text-secondary">Office</span>
                <div className="flex items-center gap-3">
                  <span className="text-data-label text-energy-accent-mint">Connected</span>
                  <ToggleSwitch checked={greenConnectionsEnabled} onChange={setGreenConnectionsEnabled} />
                </div>
              </div>
              {/* Isometric Office Illustration Placeholder */}
              <div className="flex-1 flex items-center justify-center py-6 isometric-glow">
                <svg viewBox="0 0 200 150" className="w-full h-auto max-h-32 opacity-60">
                  <path d="M20 80 L100 40 L180 80 L100 120 Z" fill="none" stroke="#A7F3D0" strokeWidth="1" opacity="0.4" />
                  <path d="M20 80 L20 110 L100 150 L100 120" fill="none" stroke="#A7F3D0" strokeWidth="1" opacity="0.3" />
                  <path d="M100 120 L100 150 L180 110 L180 80" fill="none" stroke="#A7F3D0" strokeWidth="1" opacity="0.3" />
                  <rect x="60" y="70" width="30" height="25" fill="none" stroke="#A7F3D0" strokeWidth="1" opacity="0.5" />
                  <rect x="110" y="60" width="25" height="20" fill="none" stroke="#A7F3D0" strokeWidth="1" opacity="0.4" />
                  <circle cx="130" cy="85" r="8" fill="none" stroke="#A7F3D0" strokeWidth="1" opacity="0.4" />
                </svg>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-label text-energy-text-secondary">Available energy</span>
                  <span className="text-body-label text-energy-text-primary">83%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: "83%" }} />
                </div>
              </div>
            </div>

            {/* Recommendations (Dark Card) */}
            <div className="card-dark">
              <div className="mb-4">
                <h3 className="text-card-title text-energy-text-primary">Recommended</h3>
                <p className="text-body-label text-energy-text-secondary">Personalized tips for you</p>
              </div>
              <div className="space-y-3">
                <div className="bg-energy-bg-base rounded-xl p-4 border border-energy-border-subtle/20">
                  <p className="text-sm text-energy-text-primary mb-2">Sunny day ahead — consider maximizing solar gain</p>
                  <span className="inline-block text-xs text-energy-accent-mint bg-energy-accent-mint/10 px-2 py-1 rounded-lg">Today recommendation</span>
                </div>
                <div className="bg-energy-bg-base rounded-xl p-4 border border-energy-border-subtle/20">
                  <p className="text-sm text-energy-text-primary mb-2">Run appliances at off-peak hours to reduce grid load</p>
                  <button className="text-xs text-energy-accent-mint hover:underline">Analysis →</button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row Grid - 0.8fr 1.2fr 1fr */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "0.8fr 1.2fr 1fr" }}>
            {/* Tracking (Light Card) */}
            <div className="card-light">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-card-title text-energy-text-inverse">Tracking</h3>
                <button className="text-energy-text-inverse-muted hover:text-energy-text-inverse transition">⋮</button>
              </div>
              <p className="text-body-label text-energy-text-inverse-muted mb-6">Solar energy tomorrow</p>
              <div className="stat-display">
                <span className="text-big-stat text-energy-text-inverse">5.7</span>
                <span className="text-stat-unit text-energy-text-inverse-muted mt-1">kWh</span>
              </div>
            </div>

            {/* Detailed Report (Dark Card) */}
            <div className="card-dark">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-card-title text-energy-text-primary">Detailed report</h3>
                <button className="pill-button">Week ↓</button>
              </div>
              <p className="text-body-label text-energy-text-secondary mb-6">Graphs of energy consumption</p>
              <WeeklyBarChart data={weeklyReportData} highlightedIndex={2} />
            </div>

            {/* Green Energy Usage (Light Card) */}
            <div className="card-light">
              <div className="mb-2">
                <h3 className="text-card-title text-energy-text-inverse">Green energy usage</h3>
                <p className="text-body-label text-energy-text-inverse-muted">Peak hours overview</p>
              </div>
              <div className="stat-display mb-6">
                <span className="text-big-stat text-energy-text-inverse">47%</span>
                <span className="text-stat-unit text-energy-text-inverse-muted mt-1">11AM — 3PM</span>
              </div>
              <TimelineNodes nodes={timelineNodes} />
            </div>
          </div>

          {/* KPI Cards - Employee Data Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {!selectedEmpId && viewMode === "Daily" && (
              <>
                <MetricCard label="Active Employees" value={activeEmployees} unit="counters online" />
                <MetricCard label="Average Working Hours" value={formatWorkingHours(avgWorkingHours)} unit="hours per day" />
              </>
            )}
            {selectedEmpId && isSingleDay && viewMode === "Daily" && (
              <>
                <MetricCard label="Arrival Time" value={avgArrivalSec != null ? formatTimeAmPm(avgArrivalSec) : "N/A"} unit="check-in" />
                <MetricCard label="Leaving Time" value={avgLeavingSec != null ? formatTimeAmPm(avgLeavingSec) : "N/A"} unit="check-out" />
                <MetricCard label="Working Time" value={formatWorkingHours(avgWorkingHours)} unit="total hours" />
              </>
            )}
            {selectedEmpId && !isSingleDay && viewMode === "Daily" && (
              <MetricCard label="Avg Working Time" value={formatWorkingHours(avgWorkingHours)} unit="hours per day" />
            )}
            {selectedEmpId && viewMode === "Weekly" && (
              <>
                <MetricCard label="Weekly Hours" value={formatWorkingHours(totalWeeklyHours)} unit="total hours" />
                <MetricCard label="Average Daily Hours" value={formatWorkingHours(totalWeeklyHours / 7)} unit="hours per day" />
              </>
            )}
          </div>

          {/* Employee list (single day, all employees) */}
          {isSingleDay && !selectedEmpId && viewMode === "Daily" && employees.length > 0 && (
            <div className="mb-6">
              <DataTable
                title="Employees (Name & ID)"
                columns={[
                  { key: "name", label: "Name" },
                  { key: "employee_id", label: "Employee ID" },
                ]}
                data={employees as unknown as Record<string, unknown>[]}
                maxHeight="240px"
              />
            </div>
          )}

          {/* Charts */}
          {/* Employees per date bar chart (daily, all, date range) */}
          {viewMode === "Daily" && !selectedEmpId && !isSingleDay && employeesPerDate.length > 0 && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-4">Number of Employees Per Date</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={employeesPerDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9CA3AF" }} stroke="#272925" />
                  <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                  />
                  <Bar dataKey="count" name="Employees" fill="#A7F3D0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Avg working hours line chart (daily, all or specific emp, date range) */}
          {viewMode === "Daily" && !isSingleDay && avgHoursPerDate.length > 0 && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-4">
                Average Working Time Over Date Interval{selectedEmpId ? ` — Emp ${selectedEmpId}` : " (All)"}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={avgHoursPerDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9CA3AF" }} stroke="#272925" />
                  <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                    formatter={(val: number) => formatWorkingHours(val)}
                  />
                  <Line type="monotone" dataKey="avgHours" name="Avg Hours" stroke="#A7F3D0" strokeWidth={3} dot={{ r: 5, fill: "#A7F3D0" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly: hours by employee */}
          {viewMode === "Weekly" && !selectedEmpId && weeklyByEmployee.length > 0 && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-4">Weekly Working Hours by Employee</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={weeklyByEmployee}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis dataKey="employeeId" tick={{ fontSize: 12, fill: "#9CA3AF" }} stroke="#272925" />
                  <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                    formatter={(val: number) => formatWorkingHours(val)}
                  />
                  <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                  <Bar dataKey="weeklyHours" name="Weekly Hours" fill="#A7F3D0" radius={[4, 4, 0, 0]}>
                    {weeklyByEmployee.map((_, i) => <Cell key={i} fill={getChartColor(i).replace("#0066CC", "#A7F3D0").replace("#FFD700", "#D1FAE5")} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly: daily breakdown for specific employee */}
          {viewMode === "Weekly" && selectedEmpId && weeklyDailyBreakdown.length > 0 && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-4">Daily Working Hours — Emp {selectedEmpId}</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={weeklyDailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} stroke="#272925" />
                  <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                    formatter={(val: number) => formatWorkingHours(val)}
                  />
                  <Bar dataKey="hours" name="Hours" fill="#A7F3D0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Report download */}
          <div className="card-dark mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-card-title text-energy-text-primary">Generate Reports</h3>
            <button
              className="px-4 py-2 bg-energy-accent-mint text-energy-text-inverse rounded-xl text-sm font-medium hover:bg-energy-accent-mint-light transition"
              onClick={() => downloadCsv(
                filteredRecords.map((r) => ({
                  "Employee ID": r.employee_id,
                  Date: r.date,
                  "Arrival Time": r.first_time_seen ?? "",
                  "Leaving Time": r.last_time_seen ?? "",
                  "Working Hours": r.working_hours,
                })),
                `attendance_report_${startDate}_to_${endDate}.csv`,
              )}
              disabled={!filteredRecords.length}
            >
              Download Attendance Report
            </button>
          </div>

          {/* Data table */}
          <div className="mb-6">
            <DataTable
              title="Employee Data"
              columns={[
                { key: "employee_id", label: "Employee ID" },
                { key: "date", label: "Date" },
                { key: "first_time_seen", label: "Arrival Time", render: (v: unknown) => (v as string)?.split("T")[1]?.slice(0, 8) ?? "—" },
                { key: "last_time_seen", label: "Leaving Time", render: (v: unknown) => (v as string)?.split("T")[1]?.slice(0, 8) ?? "—" },
                { key: "working_hours", label: "Working Hours", render: (v: unknown) => formatWorkingHours(v as number) },
              ]}
              data={filteredRecords as unknown as Record<string, unknown>[]}
            />
          </div>

          {!filteredRecords.length && (
            <div className="card-dark p-8 text-center text-energy-text-secondary">
              No data available for the selected filters.
            </div>
          )}
        </>
      )}

      {!branchId && !loading && (
        <div className="card-dark p-12 text-center text-energy-text-secondary">
          Please select a branch to view employee data.
        </div>
      )}
    </div>
  );
}
