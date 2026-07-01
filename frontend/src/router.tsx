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
import { MealDetailPage } from "./pages/MealDetailPage";
import { RideDetailPage } from "./pages/RideDetailPage";
import { EventCosplaysPage } from "./pages/EventCosplaysPage";
import { MembersPage } from "./pages/MembersPage";
import { ActiesPage } from "./pages/ActiesPage";
import { HotelRoomsPage } from "./pages/HotelRoomsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminRidesPage } from "./pages/admin/AdminRidesPage";
import { AdminMealsPage } from "./pages/admin/AdminMealsPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminBadgesPage } from "./pages/admin/AdminBadgesPage";
import { AdminEventGroupsPage } from "./pages/admin/AdminEventGroupsPage";

export const router = createBrowserRouter([
  {
    path: routes.login,
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: routes.onboarding,
        element: <OnboardingPage />,
      },
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
      {
        path: routes.meal.pattern,
        element: <MealDetailPage />,
      },
      {
        path: routes.ride.pattern,
        element: <RideDetailPage />,
      },
      {
        path: routes.eventCosplays.pattern,
        element: <EventCosplaysPage />,
      },
      {
        path: routes.members,
        element: <MembersPage />,
      },
      {
        path: routes.acties,
        element: <ActiesPage />,
      },
      {
        path: routes.eventHotel.pattern,
        element: <HotelRoomsPage />,
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
              { path: routes.admin.events,      element: <AdminEventsPage /> },
              { path: routes.admin.eventGroups, element: <AdminEventGroupsPage /> },
              { path: routes.admin.badges,      element: <AdminBadgesPage /> },
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
