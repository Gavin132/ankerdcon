import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminTopbar } from "./components/AdminTopbar";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#080c14]">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col bg-[#0d1117] border-r border-white/[0.06] transition-all duration-300 ease-in-out ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        <AdminSidebar collapsed={collapsed} />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-[#0d1117] border-r border-white/[0.06] transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar collapsed={false} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <AdminTopbar
          onToggleDesktop={() => setCollapsed((v) => !v)}
          onToggleMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
