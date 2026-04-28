// === MAIN APP ===
function App() {
  const { useState, useEffect, useMemo } = React;
  const h = window.helpers;
  const api = window.api;

  // Hash-based routing
  const getPageFromHash = () => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (['dashboard', 'shutter', 'customers', 'alerts'].includes(hash)) return hash;
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getPageFromHash());
  const [mobileOpen, setMobileOpen] = useState(false);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);

  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    api.listBranches()
      .then(data => setBranches(Array.isArray(data) ? data : []))
      .catch(e => setBootError(e))
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(() => h.uniqueRegions(branches), [branches]);
  const areas = useMemo(() => h.uniqueAreas(branches), [branches]);

  const navigate = (page) => {
    window.location.hash = '#/' + page;
    setCurrentPage(page);
    setMobileOpen(false);
  };

  const renderPage = () => {
    if (loading) return <LoadingSpinner message="Loading branches..." />;
    if (bootError) return (
      <div className="card card-dark" style={{ padding: '32px' }}>
        <ErrorMessage error={bootError} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '12px' }}>
          Could not connect to backend API. Make sure the dashboard is being served from the same origin as the API,
          or check that you can reach <code>/api/v1/branches</code>.
        </p>
      </div>
    );
    if (!branches.length) return (
      <div className="card card-dark" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No branches available.
      </div>
    );

    const props = { branches, regions, areas };
    switch (currentPage) {
      case 'dashboard': return <DashboardPage {...props} />;
      case 'shutter': return <ShutterPage {...props} />;
      case 'customers': return <CustomersPage {...props} />;
      case 'alerts': return <AlertsPage {...props} />;
      default: return <DashboardPage {...props} />;
    }
  };

  return (
    <div className="app">
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? '×' : '☰'}</button>
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main className="main">
        {renderPage()}
      </main>
    </div>
  );
}

window.addEventListener('DOMContentLoaded', () => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
});
