// === DASHBOARD / EMPLOYEES PAGE ===
function DashboardPage({
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
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const branchOptions = useMemo(() => h.filterBranches(branches, region, area), [branches, region, area]);
  const filteredAreas = useMemo(() => h.uniqueAreas(branches, region), [branches, region]);

  // Auto-select branch
  useEffect(() => {
    if (!branchOptions.length) return;
    if (branchId !== null && branchOptions.find(b => b.branch_id === branchId)) return;
    const preferred = branchOptions.find(b => b.branch_id === 1290);
    setBranchId(preferred ? 1290 : branchOptions[0].branch_id);
  }, [branchOptions]);

  // Weekly mode adjusts end date
  useEffect(() => {
    if (viewMode === 'Weekly') {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 6);
      setEndDate(h.toISO(d));
    }
  }, [viewMode, startDate]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const dates = h.buildDateRange(startDate, endDate);
      const [allRecords, empList] = await Promise.all([Promise.all(dates.map(d => api.getAttendance(branchId, {
        date: d
      }).catch(() => []))), api.listEmployees(branchId).catch(() => [])]);
      setRecords(allRecords.flat());
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [branchId, startDate, endDate]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data
  const filteredRecords = useMemo(() => {
    if (employeeFilter === 'All') return records;
    return records.filter(r => String(r.employee_id) === employeeFilter);
  }, [records, employeeFilter]);
  const uniqueEmployeeIds = useMemo(() => {
    return [...new Set(records.map(r => r.employee_id))].sort((a, b) => a - b);
  }, [records]);
  const isSingleDay = startDate === endDate;
  const selectedEmpId = employeeFilter !== 'All' ? Number(employeeFilter) : null;
  const recordsExcluding0 = useMemo(() => filteredRecords.filter(r => r.employee_id !== 0), [filteredRecords]);
  const avgWorkingHours = useMemo(() => {
    const src = selectedEmpId ? filteredRecords : recordsExcluding0;
    if (!src.length) return 0;
    return src.reduce((s, r) => s + (r.working_hours || 0), 0) / src.length;
  }, [filteredRecords, recordsExcluding0, selectedEmpId]);
  const avgArrivalSec = useMemo(() => {
    const secs = filteredRecords.map(r => h.toSecondsFromMidnight(r.first_time_seen)).filter(s => s !== null);
    return secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null;
  }, [filteredRecords]);
  const avgLeavingSec = useMemo(() => {
    const secs = filteredRecords.map(r => h.toSecondsFromMidnight(r.last_time_seen)).filter(s => s !== null);
    return secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null;
  }, [filteredRecords]);
  const activeEmployees = useMemo(() => new Set(recordsExcluding0.map(r => r.employee_id)).size, [recordsExcluding0]);

  // Charts
  const employeesPerDate = useMemo(() => {
    const map = new Map();
    recordsExcluding0.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, new Set());
      map.get(r.date).add(r.employee_id);
    });
    return [...map.entries()].map(([date, ids]) => ({
      date,
      count: ids.size
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [recordsExcluding0]);
  const avgHoursPerDate = useMemo(() => {
    const map = new Map();
    const src = selectedEmpId ? filteredRecords : recordsExcluding0;
    src.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date).push(r.working_hours || 0);
    });
    return [...map.entries()].map(([date, hours]) => ({
      date,
      avgHours: +(hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2)
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords, recordsExcluding0, selectedEmpId]);
  const weeklyByEmployee = useMemo(() => {
    if (viewMode !== 'Weekly' || selectedEmpId) return [];
    const map = new Map();
    recordsExcluding0.forEach(r => {
      map.set(r.employee_id, (map.get(r.employee_id) || 0) + (r.working_hours || 0));
    });
    return [...map.entries()].map(([empId, hours]) => ({
      employeeId: 'Emp ' + empId,
      weeklyHours: +hours.toFixed(2)
    })).sort((a, b) => b.weeklyHours - a.weeklyHours);
  }, [recordsExcluding0, viewMode, selectedEmpId]);
  const weeklyDailyBreakdown = useMemo(() => {
    if (viewMode !== 'Weekly' || !selectedEmpId) return [];
    const map = new Map();
    filteredRecords.forEach(r => {
      map.set(r.date, (map.get(r.date) || 0) + (r.working_hours || 0));
    });
    return [...map.entries()].map(([date, hours]) => {
      const d = new Date(date);
      return {
        day: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: '2-digit',
          day: '2-digit'
        }),
        hours: +hours.toFixed(2)
      };
    }).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredRecords, viewMode, selectedEmpId]);
  const totalWeeklyHours = useMemo(() => {
    if (viewMode !== 'Weekly' || !selectedEmpId) return 0;
    return filteredRecords.reduce((s, r) => s + (r.working_hours || 0), 0);
  }, [filteredRecords, viewMode, selectedEmpId]);
  const selectedEmpName = useMemo(() => {
    if (!selectedEmpId) return null;
    const emp = employees.find(e => e.employee_id === selectedEmpId);
    return emp?.name ?? 'Employee ' + selectedEmpId;
  }, [selectedEmpId, employees]);
  const downloadAttendance = () => {
    h.downloadCSV('attendance_report_' + startDate + '_to_' + endDate + '.csv', filteredRecords.map(r => ({
      'Employee ID': r.employee_id,
      Date: r.date,
      'Arrival Time': r.first_time_seen ?? '',
      'Leaving Time': r.last_time_seen ?? '',
      'Working Hours': r.working_hours
    })));
  };
  const showEmployeesPerDate = viewMode === 'Daily' && !selectedEmpId && !isSingleDay && employeesPerDate.length > 0;
  const showAvgHoursLine = viewMode === 'Daily' && !isSingleDay && avgHoursPerDate.length > 0;
  const showWeeklyByEmp = viewMode === 'Weekly' && !selectedEmpId && weeklyByEmployee.length > 0;
  const showWeeklyDaily = viewMode === 'Weekly' && selectedEmpId && weeklyDailyBreakdown.length > 0;
  return React.createElement("div", null, React.createElement(PageHeader, {
    title: "Dashboard",
    subtitle: "Employee attendance & operational insights"
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
  }, ['Daily', 'Weekly'].map(m => React.createElement("button", {
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
      if (viewMode === 'Daily') setEndDate(e.target.value);
    }
  })), React.createElement(FilterField, {
    label: "End Date"
  }, React.createElement("input", {
    type: "date",
    value: endDate,
    onChange: e => setEndDate(e.target.value),
    disabled: viewMode === 'Weekly',
    min: startDate
  })), React.createElement(FilterField, {
    label: "Employee"
  }, React.createElement("select", {
    value: employeeFilter,
    onChange: e => setEmployeeFilter(e.target.value)
  }, React.createElement("option", {
    value: "All"
  }, "All"), uniqueEmployeeIds.map(id => React.createElement("option", {
    key: id,
    value: String(id)
  }, id))))), React.createElement(ErrorMessage, {
    error: error
  }), loading && React.createElement(LoadingSpinner, {
    message: "Fetching attendance data..."
  }), !loading && !error && branchId && React.createElement(React.Fragment, null, selectedEmpName && React.createElement("div", {
    style: {
      marginBottom: '16px',
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, " Selected: ", React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, selectedEmpName), " (ID: ", selectedEmpId, ") "), React.createElement("div", {
    className: "grid grid-4"
  }, !selectedEmpId && React.createElement(React.Fragment, null, React.createElement(StatCard, {
    label: "Active Employees",
    value: activeEmployees,
    unit: "employees online"
  }), React.createElement(StatCard, {
    label: "Average Working Hours",
    value: h.formatWorkingHours(avgWorkingHours),
    unit: "per day"
  })), selectedEmpId && isSingleDay && viewMode === 'Daily' && React.createElement(React.Fragment, null, React.createElement(StatCard, {
    label: "Arrival Time",
    value: avgArrivalSec != null ? h.formatTimeAmPm(avgArrivalSec) : 'N/A',
    unit: "check-in"
  }), React.createElement(StatCard, {
    label: "Leaving Time",
    value: avgLeavingSec != null ? h.formatTimeAmPm(avgLeavingSec) : 'N/A',
    unit: "check-out"
  }), React.createElement(StatCard, {
    label: "Working Time",
    value: h.formatWorkingHours(avgWorkingHours),
    unit: "total hours"
  })), selectedEmpId && !isSingleDay && viewMode === 'Daily' && React.createElement(StatCard, {
    label: "Avg Working Time",
    value: h.formatWorkingHours(avgWorkingHours),
    unit: "per day"
  }), selectedEmpId && viewMode === 'Weekly' && React.createElement(React.Fragment, null, React.createElement(StatCard, {
    label: "Weekly Hours",
    value: h.formatWorkingHours(totalWeeklyHours),
    unit: "total hours"
  }), React.createElement(StatCard, {
    label: "Average Daily Hours",
    value: h.formatWorkingHours(totalWeeklyHours / 7),
    unit: "per day"
  }))), isSingleDay && !selectedEmpId && viewMode === 'Daily' && employees.length > 0 && React.createElement(DataTable, {
    title: "Employees (Name & ID)",
    columns: [{
      header: 'Name',
      key: 'name',
      render: r => r.name ?? '—'
    }, {
      header: 'Employee ID',
      key: 'employee_id'
    }],
    data: employees,
    maxHeight: "280px"
  }), showEmployeesPerDate && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Number of Employees Per Date"), React.createElement("p", {
    className: "chart-subtitle"
  }, "Daily unique employee count over the date range"))), React.createElement(BarChart, {
    data: employeesPerDate,
    xKey: "date",
    yKey: "count",
    color: "#A7F3D0",
    height: 300
  })), showAvgHoursLine && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Average Working Time Over Date Interval", selectedEmpId ? ` — Emp ${selectedEmpId}` : ' (All)'), React.createElement("p", {
    className: "chart-subtitle"
  }, "Decimal hours per day"))), React.createElement(LineChart, {
    data: avgHoursPerDate,
    xKey: "date",
    yKey: "avgHours",
    color: "#A7F3D0",
    height: 300,
    formatY: v => Number(v).toFixed(1) + 'h'
  })), showWeeklyByEmp && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Weekly Working Hours by Employee"), React.createElement("p", {
    className: "chart-subtitle"
  }, "Total hours per employee over the week"))), React.createElement(BarChart, {
    data: weeklyByEmployee,
    xKey: "employeeId",
    yKey: "weeklyHours",
    color: "#A7F3D0",
    height: 350,
    formatY: v => Number(v).toFixed(1) + 'h'
  })), showWeeklyDaily && React.createElement("div", {
    className: "chart-card"
  }, React.createElement("div", {
    className: "card-header"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "chart-title"
  }, "Daily Working Hours \u2014 Emp ", selectedEmpId), React.createElement("p", {
    className: "chart-subtitle"
  }, "Hours per day for selected week"))), React.createElement(BarChart, {
    data: weeklyDailyBreakdown,
    xKey: "day",
    yKey: "hours",
    color: "#A7F3D0",
    height: 300,
    formatY: v => Number(v).toFixed(1) + 'h'
  })), React.createElement("div", {
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
    onClick: downloadAttendance,
    disabled: !filteredRecords.length
  }, " \u2B07 Download Attendance Report ")), React.createElement(DataTable, {
    title: "Employee Data",
    columns: [{
      header: 'Employee ID',
      key: 'employee_id'
    }, {
      header: 'Date',
      key: 'date'
    }, {
      header: 'Arrival Time',
      key: 'first_time_seen',
      render: r => h.extractTime(r.first_time_seen)
    }, {
      header: 'Leaving Time',
      key: 'last_time_seen',
      render: r => h.extractTime(r.last_time_seen)
    }, {
      header: 'Working Hours',
      key: 'working_hours',
      render: r => h.formatWorkingHours(r.working_hours)
    }],
    data: filteredRecords,
    emptyMessage: "No attendance records for the selected filters"
  })), !branchId && !loading && React.createElement("div", {
    className: "card card-dark",
    style: {
      padding: '48px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }
  }, " Please select a branch to view dashboard data. "));
}
window.DashboardPage = DashboardPage;