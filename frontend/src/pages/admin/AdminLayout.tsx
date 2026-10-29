import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./components/AdminSidebar";
import { AdminTopbar } from "./components/AdminTopbar";
import { AdminPage } from "./components/AdminPage";

// Keeps the sidebar/topbar mounted while an admin page's chunk loads,
// instead of the navigation bubbling to the app's top-level Suspense and
// tearing down this whole layout — same fix as AppShell for the main tabs.
// It draws the shape of a page (a title and three rows), not a spinner.
function AdminTabFallback() {
  return (
    <AdminPage>
      <div className="space-y-2" aria-busy="true" aria-label="Laden…">
        <div className="h-3 w-20 animate-pulse rounded bg-sunken" />
        <div className="h-10 w-56 animate-pulse rounded-lg bg-sunken" />
      </div>
      <div className="card-surface space-y-3 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-sunken" />
        ))}
      </div>
    </AdminPage>
  );
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
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
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r-1.5 border-line bg-surface transition-transform duration-300 ease-in-out lg:hidden ${
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
