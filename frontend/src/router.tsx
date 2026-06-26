import { createBrowserRouter } from "react-router-dom";
import { routes } from "./config/routes";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { HubPage } from "./pages/HubPage";
import { TransportPage } from "./pages/TransportPage";
import { FoodPage } from "./pages/FoodPage";
import { FinancePage } from "./pages/FinancePage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminRidesPage } from "./pages/admin/AdminRidesPage";
import { AdminMealsPage } from "./pages/admin/AdminMealsPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";

export const router = createBrowserRouter([
  {
    path: routes.login,
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routes.hub,
        element: <AppShell><HubPage /></AppShell>,
      },
      {
        path: routes.transport,
        element: <AppShell><TransportPage /></AppShell>,
      },
      {
        path: routes.food,
        element: <AppShell><FoodPage /></AppShell>,
      },
      {
        path: routes.finance,
        element: <AppShell><FinancePage /></AppShell>,
      },
      {
        path: routes.more,
        element: <AppShell><MorePage /></AppShell>,
      },
      {
        path: routes.profile.pattern,
        element: <ProfilePage />,
      },
      {
        path: routes.event.pattern,
        element: <EventDetailPage />,
      },
      // ── Admin portal ──────────────────────────────────────────────
      {
        element: <AdminRoute />,
        children: [
          {
            path: routes.admin.base,
            element: <AdminLayout />,
            children: [
              { index: true,                   element: <AdminDashboardPage /> },
              { path: routes.admin.users,      element: <AdminUsersPage /> },
              { path: routes.admin.rides,      element: <AdminRidesPage /> },
              { path: routes.admin.meals,      element: <AdminMealsPage /> },
              { path: routes.admin.events,     element: <AdminEventsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
