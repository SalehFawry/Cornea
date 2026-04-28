import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import PageHeader from "../components/PageHeader";
import FilterSection from "../components/FilterSection";
import MetricCard from "../components/MetricCard";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBranches } from "../hooks/useBranches";
import { getAlerts } from "../api/alerts";
import type { Alert, AlertCountByType } from "../types";
import { todayISO, formatAlertType, downloadCsv, getChartColor } from "../utils/helpers";

export default function AlertsPage() {
  const { branches, regions, areas, filteredBranches } = useBranches();

  const [region, setRegion] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<number | null>(1290);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [alerts, setAlerts] = useState<Alert[]>([]);
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
      const data = await getAlerts(branchId, { date: selectedDate });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [branchId, selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregate alert counts by type
  const alertCounts: AlertCountByType[] = useMemo(() => {
    const map = new Map<string, number>();
    (Array.isArray(alerts) ? alerts : []).forEach((a) => {
      const type = a.alert_type;
      map.set(type, (map.get(type) || 0) + 1);
    });
    return [...map.entries()]
      .map(([alert_type, count]) => ({ alert_type, count }))
      .sort((a, b) => b.count - a.count);
  }, [alerts]);

  // Chart data with formatted labels
  const chartData = useMemo(
    () => (Array.isArray(alertCounts) ? alertCounts : []).map((a) => ({ ...a, label: formatAlertType(a.alert_type) })),
    [alertCounts],
  );

  const tableColumns = [
    { key: "label", label: "Alert Type" },
    { key: "count", label: "Count" },
  ];

  const branchName = branchOptions.find((b) => b.branch_id === branchId)?.branch_name;

  return (
    <div>
      <PageHeader />

      <FilterSection>
        {regions.length > 0 && (
          <div>
            <label htmlFor="alert-filter-region" className="block text-xs font-medium text-energy-text-secondary mb-1">Region</label>
            <select id="alert-filter-region" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={region ?? ""} onChange={(e) => { setRegion(e.target.value || null); setArea(null); }}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {regions.sort().map((r) => <option key={r} value={r} className="bg-energy-bg-card-dark">{r}</option>)}
            </select>
          </div>
        )}
        {areas.length > 0 && (
          <div>
            <label htmlFor="alert-filter-area" className="block text-xs font-medium text-energy-text-secondary mb-1">Area</label>
            <select id="alert-filter-area" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={area ?? ""} onChange={(e) => setArea(e.target.value || null)}>
              <option value="" className="bg-energy-bg-card-dark">All</option>
              {areas.sort().map((a) => <option key={a} value={a} className="bg-energy-bg-card-dark">{a}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="alert-filter-branch" className="block text-xs font-medium text-energy-text-secondary mb-1">Branch</label>
          <select id="alert-filter-branch" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || null)}>
            <option value="" className="bg-energy-bg-card-dark">Select branch</option>
            {branchOptions.map((b) => <option key={b.branch_id} value={b.branch_id} className="bg-energy-bg-card-dark">{b.branch_name} ({b.branch_id})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="alert-filter-date" className="block text-xs font-medium text-energy-text-secondary mb-1">Date</label>
          <input id="alert-filter-date" type="date" className="w-full bg-energy-bg-base border border-energy-border-subtle/30 rounded-xl px-3 py-2 text-sm text-energy-text-primary focus:outline-none focus:border-energy-accent-mint" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </FilterSection>

      {error && <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-xl p-3 mb-4 text-sm">{error}</div>}
      {loading && <LoadingSpinner message="Fetching alert data..." />}

      {!loading && !error && branchId && (
        <>
          {/* KPI Cards — one per alert type */}
          {alertCounts.length > 0 && (
            <>
              <h3 className="text-card-title text-energy-text-primary mb-4">Alert Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {alertCounts.map((a) => (
                  <MetricCard key={a.alert_type} label={formatAlertType(a.alert_type)} value={a.count} unit="alerts" />
                ))}
              </div>
            </>
          )}

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="card-dark mb-6">
              <h3 className="text-card-title text-energy-text-primary mb-4">Alert Counts by Type</h3>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272925" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={0} angle={-15} textAnchor="end" height={60} stroke="#272925" />
                  <YAxis tick={{ fill: "#9CA3AF" }} stroke="#272925" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#181A19", border: "1px solid #272925", borderRadius: "12px" }}
                    labelStyle={{ color: "#FFFFFF" }}
                    itemStyle={{ color: "#A7F3D0" }}
                  />
                  <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={getChartColor(i).replace("#0066CC", "#A7F3D0").replace("#FFD700", "#D1FAE5")} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Reports */}
          <div className="card-dark mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-card-title text-energy-text-primary">Generate Reports</h3>
            <button
              className="px-4 py-2 bg-energy-accent-mint text-energy-text-inverse rounded-xl text-sm font-medium hover:bg-energy-accent-mint-light transition"
              onClick={() => downloadCsv(
                alertCounts.map((a) => ({
                  Date: selectedDate,
                  "Branch ID": branchId,
                  "Branch Name": branchName ?? `Branch ${branchId}`,
                  "Alert Type": formatAlertType(a.alert_type),
                  Count: a.count,
                })),
                `alerts_report_${selectedDate}_Branch_${branchId}.csv`,
              )}
              disabled={!alertCounts.length}
            >
              Download Alerts Report
            </button>
          </div>

          {/* Data table */}
          <div className="mb-6">
            <DataTable
              title="Alert Details"
              columns={tableColumns}
              data={chartData as unknown as Record<string, unknown>[]}
            />
          </div>

          {!alertCounts.length && (
            <div className="card-dark p-8 text-center text-energy-text-secondary">
              No alerts found for the selected date and branch.
            </div>
          )}
        </>
      )}

      {!branchId && !loading && (
        <div className="card-dark p-12 text-center text-energy-text-secondary">
          Please select a branch to view alerts.
        </div>
      )}
    </div>
  );
}
