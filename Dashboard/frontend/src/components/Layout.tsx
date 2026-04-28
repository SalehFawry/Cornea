import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen bg-energy-bg-base">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle navigation"
        className="fixed top-6 left-6 z-50 flex md:hidden items-center justify-center w-10 h-10 rounded-xl bg-energy-bg-card-dark text-energy-text-primary border border-energy-border-subtle/30 text-lg"
      >
        {sidebarOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <main className="flex-1 p-8 pt-20 md:pt-8 md:ml-64">
        <div className="max-w-[1440px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
