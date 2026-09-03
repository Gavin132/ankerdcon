import { lazy, type ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";
import { routes } from "./config/routes";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";

// Every other page is fetched on demand instead of bundled into the initial
// download — most of these (especially the whole admin portal) are visited
// by a fraction of sessions, so shipping them upfront to everyone was pure
// dead weight on first load. LoginPage stays eager since it's the one page
// a logged-out visitor needs before there's any other network activity to
// hide a chunk fetch behind.
function lazyPage<T extends ComponentType<any>>(
  factory: () => Promise<Record<string, T>>,
  name: string,
) {
  return lazy(() => factory().then((m) => ({ default: m[name] })));
}

const HubPage = lazyPage(() => import("./pages/HubPage"), "HubPage");
const TransportPage = lazyPage(() => import("./pages/TransportPage"), "TransportPage");
const FoodPage = lazyPage(() => import("./pages/FoodPage"), "FoodPage");
const FinancePage = lazyPage(() => import("./pages/FinancePage"), "FinancePage");
const MorePage = lazyPage(() => import("./pages/MorePage"), "MorePage");
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"), "ProfilePage");
const EventDetailPage = lazyPage(() => import("./pages/EventDetailPage"), "EventDetailPage");
const MealDetailPage = lazyPage(() => import("./pages/MealDetailPage"), "MealDetailPage");
const RideDetailPage = lazyPage(() => import("./pages/RideDetailPage"), "RideDetailPage");
const EventCosplaysPage = lazyPage(() => import("./pages/EventCosplaysPage"), "EventCosplaysPage");
const MembersPage = lazyPage(() => import("./pages/MembersPage"), "MembersPage");
const ActiesPage = lazyPage(() => import("./pages/ActiesPage"), "ActiesPage");
const NotificationSettingsPage = lazyPage(() => import("./pages/NotificationSettingsPage"), "NotificationSettingsPage");
const ChangelogPage = lazyPage(() => import("./pages/ChangelogPage"), "ChangelogPage");
const HotelRoomsPage = lazyPage(() => import("./pages/HotelRoomsPage"), "HotelRoomsPage");
const OnboardingPage = lazyPage(() => import("./pages/OnboardingPage"), "OnboardingPage");
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"), "NotFoundPage");

const AdminLayout = lazyPage(() => import("./pages/admin/AdminLayout"), "AdminLayout");
const AdminOnboardingPreviewPage = lazyPage(() => import("./pages/admin/AdminOnboardingPreviewPage"), "AdminOnboardingPreviewPage");
const AdminDashboardPage = lazyPage(() => import("./pages/admin/AdminDashboardPage"), "AdminDashboardPage");
const AdminUsersPage = lazyPage(() => import("./pages/admin/AdminUsersPage"), "AdminUsersPage");
const AdminRidesPage = lazyPage(() => import("./pages/admin/AdminRidesPage"), "AdminRidesPage");
const AdminMealsPage = lazyPage(() => import("./pages/admin/AdminMealsPage"), "AdminMealsPage");
const AdminEventsPage = lazyPage(() => import("./pages/admin/AdminEventsPage"), "AdminEventsPage");
const AdminBadgesPage = lazyPage(() => import("./pages/admin/AdminBadgesPage"), "AdminBadgesPage");
const AdminEventGroupsPage = lazyPage(() => import("./pages/admin/AdminEventGroupsPage"), "AdminEventGroupsPage");
const AdminBetalingenPage = lazyPage(() => import("./pages/admin/AdminBetalingenPage"), "AdminBetalingenPage");
const AdminAnnouncementsPage = lazyPage(() => import("./pages/admin/AdminAnnouncementsPage"), "AdminAnnouncementsPage");
const AdminChangelogPage = lazyPage(() => import("./pages/admin/AdminChangelogPage"), "AdminChangelogPage");
const AdminImpersonatePage = lazyPage(() => import("./pages/admin/AdminImpersonatePage"), "AdminImpersonatePage");
const AdminTimeTravelPage = lazyPage(() => import("./pages/admin/AdminTimeTravelPage"), "AdminTimeTravelPage");

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
        path: routes.notifications,
        element: <NotificationSettingsPage />,
      },
      {
        path: routes.changelog,
        element: <ChangelogPage />,
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
            // Rendered outside AdminLayout so it's a true full-screen replica of
            // the real onboarding flow, without the admin sidebar/topbar chrome.
            path: routes.admin.previewOnboarding,
            element: <AdminOnboardingPreviewPage />,
          },
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
              { path: routes.admin.betalingen,  element: <AdminBetalingenPage /> },
              { path: routes.admin.announcements, element: <AdminAnnouncementsPage /> },
              { path: routes.admin.changelog, element: <AdminChangelogPage /> },
              { path: routes.admin.impersonate, element: <AdminImpersonatePage /> },
              { path: routes.admin.timeTravel, element: <AdminTimeTravelPage /> },
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
