import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/shutter", label: "My apartments" },
  { to: "/customers", label: "Reporting" },
  { to: "/alerts", label: "Settings" },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

// Logo icon component - abstract leaf/power icon
function LogoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-5 h-5 text-white"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={[
        "fixed top-0 left-0 h-screen w-64 flex flex-col z-30",
        "transition-transform duration-300 ease-in-out",
        "md:translate-x-0",
        "bg-energy-bg-base border-r border-energy-border-subtle/30",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* Brand Logo */}
      <div className="px-6 pt-8 pb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-energy-bg-card-dark flex items-center justify-center">
          <LogoIcon />
        </div>
        <span className="text-energy-text-primary font-medium text-lg">EcoSync</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <div className="space-y-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl text-nav-link font-medium transition-all ${
                  isActive
                    ? "text-energy-text-primary bg-energy-bg-card-dark"
                    : "text-energy-text-secondary hover:text-energy-text-primary hover:bg-energy-bg-card-dark/50"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer info */}
      <div className="p-4">
        <div className="bg-energy-bg-card-dark rounded-2xl p-4 border border-energy-border-subtle/30">
          <p className="text-xs font-medium text-energy-text-secondary mb-2">Energy Management</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-energy-accent-mint animate-pulse" />
            <span className="text-xs text-energy-text-primary">System Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
