import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminTopbar } from "./components/AdminTopbar";

// Keeps the sidebar/topbar mounted while an admin page's chunk loads,
// instead of the navigation bubbling to the app's top-level Suspense and
// tearing down this whole layout — same fix as AppShell for the main tabs.
function AdminTabFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-text border-t-transparent" />
    </div>
  );
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r-1.5 border-line bg-surface transition-[width] duration-300 ease-in-out lg:flex ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <AdminSidebar collapsed={collapsed} />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r-1.5 border-line bg-surface shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar collapsed={false} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar
          onToggleDesktop={() => setCollapsed((v) => !v)}
          onToggleMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<AdminTabFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
