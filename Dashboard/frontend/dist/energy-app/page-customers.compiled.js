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