import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import PageHeader from "../components/PageHeader";
import FilterSection from "../components/FilterSection";
import MetricCard from "../components/MetricCard";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBranches } from "../hooks/useBranches";
import { getCustomers } from "../api/customers";
import { getAttendance } from "../api/attendance";
import type { CustomerRecord } from "../types";
import { todayISO, formatMinutes, downloadCsv } from "../utils/helpers";

export default function CustomersPage() {
  const { branches, regions, areas, filteredBranches } = useBranches();

  const [region, setRegion] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<number | null>(1290);
  const [viewMode, setViewMode] = useState<"Daily" | "Hourly">("Daily");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());

  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [activeEmployees, setActiveEmployees] = useState(0);
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
      const dateList: string[] = [];
      const d = new Date(startDate);
      const end = new Date(endDate);
      while (d <= end) {
        dateList.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }

      const [allCustomers, allAttendance] = await Promise.all([
        Promise.all(dateList.map((date) => getCustomers(branchId, { date }))),
        Promise.all(dateList.map((date) => getAttendance(branchId, { date }))),
      ]);

      let flat = allCustomers.flat();

      // Exclude trivial records (service=0 & waiting<=1min, or vice versa)
      const threshold = 0.0166 * 60; // ~1 minute
      flat = flat.filter((r) => {
        const st = r.service_time ?? 0;
        const wt = r.waiting_time ?? 0;
        if ((st === 0 && wt <= threshold) || (wt === 0 && st <= threshold)) return false;
        return true;
      });

      // Exclude duration > 3 hours
      flat = flat.filter((r) => {
        if (!r.visit_start_time || !r.service_end_time) return true;
        const start = new Date(r.visit_start_time).getTime();
        const end = new Date(r.service_end_time).getTime();
        if (isNaN(start) || isNaN(end)) return true;
        return (end - start) / 3600000 <= 3;
      });

      setRecords(flat);

      const attFlat = allAttendance.flat();
      const empIds = new Set(attFlat.filter((a) => a.employee_id !== 0).map((a) => a.employee_id));
      setActiveEmployees(empIds.size);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load customer data");
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs
  const totalCustomers = useMemo(
    () => new Set((Array.isArray(records) ? records : []).map((r) => r.customer_id)).size,
    [records],
  );

  const avgWaiting = useMemo(() => {
    const valid = records.filter((r) => r.waiting_time >= 1);
    return valid.length ? valid.reduce((s, r) => s + r.waiting_time, 0) / valid.length : 0;
  }, [records]);

  const avgService = useMemo(() => {
    const valid = records.filter((r) => r.service_time >= 1);
    return valid.length ? valid.reduce((s, r) => s + r.service_time, 0) / valid.length : 0;
  }, [records]);

  const maxService = useMemo(
    () => Math.max(0, ...(Array.isArray(records) ? records : []).map((r) => r.service_time || 0)),
    [records],
  );

  const { waitingOnly, served, conversionRate } = useMemo(() => {
    const waitingOnly = records.filter((r) => r.waiting_time > 0 && (!r.service_time || r.service_time === 0)).length;
    const served = records.filter((r) => r.service_time > 0).length;
    const total = waitingOnly + served;
    return { waitingOnly, served, conversionRate: total > 0 ? (served / total) * 100 : 0 };
  }, [records]);

  // Chart: customers per day
  const customersPerDay = useMemo(() => {
    const map = new Map<string, Set<number>>();
    records.forEach((r) => {
      const date = r.date;
      if (!map.has(date)) map.set(date, new Set());
      map.get(date)!.add(r.customer_id);
    });
    return [...map.entries()]
      .map(([date, ids]) => ({ date, count: ids.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records]);

  // Chart: customers per hour
  const customersPerHour = useMemo(() => {
    const counts = new Array(24).fill(0);
    records.forEach((r) => {
      if (!r.visit_start_time) return;
      const d = new Date(r.visit_start_time);
      if (!isNaN(d.getTime())) counts[d.getHours()]++;
    });
    return counts.map((count, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`, count }));
  }, [records]);

  // Summary by branch per date
  const summaryByBranch = useMemo(() => {
    const map = new Map<string, Map<number, Set<number>>>();
    records.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, new Map());
      const dateMap = map.get(r.date)!;
      if (!dateMap.has(r.branch_id)) dateMap.set(r.branch_id, new Set());
      dateMap.get(r.branch_id)!.add(r.customer_id);
    });
    const rows: Record<string, unknown>[] = [];
    map.forEach((branches, date) => {
      const row: Record<string, unknown> = { Date: date };
      branches.forEach((ids, bid) => {
        row[`Branch ${bid}`] = ids.size;
      });
      rows.push(row);
    });
    return rows.sort((a, b) => String(a.Date).localeCompare(String(b.Date)));
  }, [records]);

  const tableColumns = [
    { key: "customer_id", label: "Customer ID" },
    { key: "date", label: "Date" },
    { key: "visit_start_time", label: "Visit Start", render: (v: unknown) => (v as string)?.split("T")[1]?.slice(0, 8) ?? "—" },
    { key: "service_end_time", label: "Service End", render: (v: unknown) => (v as string)?.split("T")[1]?.slice(0, 8) ?? "—" },
    { key: "waiting_time", label: "Waiting (min)", render: (v: unknown) => typeof v === "number" ? v.toFixed(1) : "—" },
    { key: "service_time", label: "Service (min)", render: (v: unknown) => typeof v === "number" ? v.toFixed(1) : "—" },
  ];

  return (
    <div>
      <PageHeader />

      <FilterSection>
        {regions.length > 0 && (
          <div>
            <label htmlFor="cust-filter-region" className="block text-xs font-medium text-energy-text-secondary mb-1">Region</label>
            <select id="cust-filter-region" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={region ?? ""} onChange={(e) => { setRegion(e.target.value || null); setArea(null); }}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {regions.sort().map((r) => <option key={r} value={r} className="bg-energy-bg-card-dark">{r}</option>)}
            </select>
          </div>
        )}
        {areas.length > 0 && (
          <div>
            <label htmlFor="cust-filter-area" className="block text-xs font-medium text-energy-text-secondary mb-1">Area</label>
            <select id="cust-filter-area" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={area ?? ""} onChange={(e) => setArea(e.target.value || null)}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {areas.sort().map((a) => <option key={a} value={a} className="bg-energy-bg-card-dark">{a}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="cust-filter-branch" className="block text-xs font-medium text-energy-text-secondary mb-1">Branch</label>
          <select id="cust-filter-branch" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || null)}>
            <option value="" className="bg-energy-bg-card-dark">Select branch</option>
            {branchOptions.map((b) => <option key={b.branch_id} value={b.branch_id} className="bg-energy-bg-card-dark">{b.branch_name} ({b.branch_id})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-energy-text-secondary mb-1">View Mode</label>
          <div className="flex gap-2">
            {(["Daily", "Hourly"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${viewMode === m ? "bg-energy-accent-mint text-energy-text-inverse" : "bg-energy-bg-card-dark text-energy-text-secondary border border-energy-border-subtle/30 hover:text-energy-text-primary"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="cust-filter-start-date" className="block text-xs font-medium text-energy-text-secondary mb-1">Start Date</label>
          <input id="cust-filter-start-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setEndDate(e.target.value); }} />
        </div>
        <div>
          <label htmlFor="cust-filter-end-date" className="block text-xs font-medium text-energy-text-secondary mb-1">End Date</label>
          <input id="cust-filter-end-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={endDate}
            onChange={(e) => setEndDate(e.target.value)} min={startDate} />
        </div>
      </FilterSection>

      {error && <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-xl p-3 mb-4 text-sm">{error}</div>}
      {loading && <LoadingSpinner message="Fetching customer data..." />}

      {!loading && !error && branchId && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <MetricCard label="Current Occupancy" value={totalCustomers} unit="customers" />
            <MetricCard label="Active Counters" value={activeEmployees} unit="online" />
            <MetricCard label="Avg Wait Time" value={formatMinutes(avgWaiting)} unit="minutes" />
            <MetricCard label="Avg Service Time" value={formatMinutes(avgService)} unit="minutes" />
            <MetricCard label="Max Service Time" value={formatMinutes(maxService)} unit="minutes" />
            <MetricCard
              label="Conversion Rate"
              value={`${conversionRate.toFixed(1)}%`}
              subtitle={`Waiting: ${waitingOnly} | Served: ${served}`}
            />
          </div>

          {/* Charts */}
          {viewMode === "Hourly" && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-4">Customers Per Hour</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={customersPerHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#9CA3AF" }} stroke="#272925" />
                  <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                  />
                  <Bar dataKey="count" name="Customers" fill="#A7F3D0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewMode === "Daily" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 card-dark">
                <h3 className="text-card-title text-energy-text-primary mb-4">Customers Across Days</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={customersPerDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} stroke="#272925" />
                    <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                      labelStyle={{ color: "#FFFFFF" }}
                      itemStyle={{ color: "#A7F3D0" }}
                    />
                    <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                    <Bar dataKey="count" name="Customers" fill="#D1FAE5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {summaryByBranch.length > 0 && (
                <div className="card-dark">
                  <h3 className="text-card-title text-energy-text-primary mb-4">Summary by Branch</h3>
                  <div className="overflow-auto max-h-[350px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-energy-bg-card-dark">
                        <tr>
                          {Object.keys(summaryByBranch[0]).map((k) => (
                            <th key={k} className="px-2 py-2 text-left font-medium text-energy-text-secondary border-b border-energy-border-subtle/30">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {summaryByBranch.map((row, i) => (
                          <tr key={i} className="border-b border-energy-border-subtle/20 hover:bg-energy-border-subtle/10">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-2 py-2 text-energy-text-primary">{v as React.ReactNode}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports */}
          <div className="card-dark mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-card-title text-energy-text-primary">Generate Reports</h3>
            <button
              className="px-4 py-2 bg-energy-accent-mint text-energy-text-inverse rounded-xl text-sm font-medium hover:bg-energy-accent-mint-light transition"
              onClick={() => downloadCsv(
                records.map((r) => ({
                  "Customer ID": r.customer_id,
                  "Branch ID": r.branch_id,
                  Date: r.date,
                  "Visit Start": r.visit_start_time ?? "",
                  "Service End": r.service_end_time ?? "",
                  "Waiting Time (min)": r.waiting_time,
                  "Service Time (min)": r.service_time,
                })),
                `customers_report_${startDate}_to_${endDate}.csv`,
              )}
              disabled={!records.length}
            >
              Download Customer Report
            </button>
          </div>

          {/* Data table */}
          <div className="mb-6">
            <DataTable
              title="Customer Data"
              columns={tableColumns}
              data={records as unknown as Record<string, unknown>[]}
            />
          </div>

          {!records.length && (
            <div className="card-dark p-8 text-center text-energy-text-secondary">
              No data available for the selected filters.
            </div>
          )}
        </>
      )}

      {!branchId && !loading && (
        <div className="card-dark p-12 text-center text-energy-text-secondary">
          Please select a branch to view customer data.
        </div>
      )}
    </div>
  );
}
