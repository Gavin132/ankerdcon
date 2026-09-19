import { lazy, type ComponentType } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import { routes } from "./config/routes";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { RouteErrorFallback } from "./components/common/RouteErrorFallback";

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
const CalendarPage = lazyPage(() => import("./pages/CalendarPage"), "CalendarPage");
const FinancePage = lazyPage(() => import("./pages/FinancePage"), "FinancePage");
const CrewPage = lazyPage(() => import("./pages/CrewPage"), "CrewPage");
const SettingsPage = lazyPage(() => import("./pages/SettingsPage"), "SettingsPage");
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"), "ProfilePage");
const MealDetailPage = lazyPage(() => import("./pages/MealDetailPage"), "MealDetailPage");
const RideDetailPage = lazyPage(() => import("./pages/RideDetailPage"), "RideDetailPage");
const NotificationSettingsPage = lazyPage(() => import("./pages/NotificationSettingsPage"), "NotificationSettingsPage");
const ChangelogPage = lazyPage(() => import("./pages/ChangelogPage"), "ChangelogPage");

const TripLayout = lazyPage(() => import("./pages/trip/TripLayout"), "TripLayout");
// Overzicht is the only real page for the Event tab — Vervoer, Cosplay and
// Kamers open as sheets on top of it (see TripOverviewTab), so every trip
// sub-route below renders the same component.
const TripOverviewTab = lazyPage(() => import("./pages/trip/TripOverviewTab"), "TripOverviewTab");
const CurrentTripRedirect = lazyPage(() => import("./pages/trip/TripRedirects"), "CurrentTripRedirect");
const TripLegacySubpageRedirect = lazyPage(() => import("./pages/trip/TripRedirects"), "TripLegacySubpageRedirect");
const EventDayRedirect = lazyPage(() => import("./pages/trip/TripRedirects"), "EventDayRedirect");
const EventRoomsRedirect = lazyPage(() => import("./pages/trip/TripRedirects"), "EventRoomsRedirect");
const EventCosplayRedirect = lazyPage(() => import("./pages/trip/TripRedirects"), "EventCosplayRedirect");
const OnboardingPage = lazyPage(() => import("./pages/OnboardingPage"), "OnboardingPage");
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage"), "NotFoundPage");
const CrashTestPage = lazyPage(() => import("./pages/CrashTestPage"), "CrashTestPage");

const AdminLayout = lazyPage(() => import("./pages/admin/AdminLayout"), "AdminLayout");
const AdminOnboardingPreviewPage = lazyPage(() => import("./pages/admin/AdminOnboardingPreviewPage"), "AdminOnboardingPreviewPage");
const AdminDashboardPage = lazyPage(() => import("./pages/admin/AdminDashboardPage"), "AdminDashboardPage");
const AdminUsersPage = lazyPage(() => import("./pages/admin/AdminUsersPage"), "AdminUsersPage");
const AdminWhitelistPage = lazyPage(() => import("./pages/admin/AdminWhitelistPage"), "AdminWhitelistPage");
const AdminRidesPage = lazyPage(() => import("./pages/admin/AdminRidesPage"), "AdminRidesPage");
const AdminMealsPage = lazyPage(() => import("./pages/admin/AdminMealsPage"), "AdminMealsPage");
const AdminEventsPage = lazyPage(() => import("./pages/admin/AdminEventsPage"), "AdminEventsPage");
const AdminBadgesPage = lazyPage(() => import("./pages/admin/AdminBadgesPage"), "AdminBadgesPage");
const AdminEventGroupsPage = lazyPage(() => import("./pages/admin/AdminEventGroupsPage"), "AdminEventGroupsPage");
const AdminBetalingenPage = lazyPage(() => import("./pages/admin/AdminBetalingenPage"), "AdminBetalingenPage");
const AdminAnnouncementsPage = lazyPage(() => import("./pages/admin/AdminAnnouncementsPage"), "AdminAnnouncementsPage");
const AdminChangelogPage = lazyPage(() => import("./pages/admin/AdminChangelogPage"), "AdminChangelogPage");
const AdminImpersonatePage = lazyPage(() => import("./pages/admin/AdminImpersonatePage"), "AdminImpersonatePage");
const AdminScreensPage = lazyPage(() => import("./pages/admin/AdminScreensPage"), "AdminScreensPage");
const AdminTimeTravelPage = lazyPage(() => import("./pages/admin/AdminTimeTravelPage"), "AdminTimeTravelPage");

/** Redirect for a pre-rework path, carrying the query string and navigation state along. */
function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} state={location.state} replace />;
}

export const router = createBrowserRouter([
  {
    // A pathless root wrapping every route below — `errorElement` here
    // catches a render error from ANY of them. React Router's data router
    // handles route errors itself before they'd ever reach a class
    // component wrapping RouterProvider (e.g. `<ErrorBoundary>` in App.tsx),
    // so this is the one that actually needs to exist for a crashing page
    // to show something other than the router's own bare default screen.
    errorElement: <RouteErrorFallback />,
    children: [
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
            // Shared layout for the bottom-nav tabs — one persistent AppShell
            // instance (Header, BottomNav, etc.) instead of a fresh one per tab,
            // so switching tabs doesn't tear the whole shell down while the
            // next tab's chunk loads.
            element: <AppShell />,
            children: [
              { path: routes.hub,       element: <HubPage /> },
              { path: routes.calendar,  element: <CalendarPage /> },
              { path: routes.finance,   element: <FinancePage /> },
              { path: routes.crew,      element: <CrewPage /> },

              // ── Event tab ──────────────────────────────────────────────
              { path: routes.currentTrip.pattern, element: <CurrentTripRedirect /> },
              {
                path: routes.trip.pattern,
                element: <TripLayout />,
                children: [
                  { index: true,   element: <TripOverviewTab /> },
                  // Old bookmarks/notifications from before sheets moved to `?sheet=`.
                  { path: ":tab",  element: <TripLegacySubpageRedirect /> },
                ],
              },
              { path: routes.event.pattern,         element: <EventDayRedirect /> },
              { path: routes.legacy.eventHotel,     element: <EventRoomsRedirect /> },
              { path: routes.legacy.eventCosplays,  element: <EventCosplayRedirect /> },
            ],
          },

          // ── Old paths ──────────────────────────────────────────────────
          { path: routes.legacy.transport,     element: <LegacyRedirect to={routes.currentTrip.tab("transport")} /> },
          { path: routes.legacy.food,          element: <LegacyRedirect to={routes.currentTrip.tab("food")} /> },
          { path: routes.legacy.stories,       element: <LegacyRedirect to={routes.currentTrip.tab("photos")} /> },
          { path: routes.legacy.more,          element: <LegacyRedirect to={routes.calendar} /> },
          { path: routes.legacy.members,       element: <LegacyRedirect to={routes.crew} /> },
          { path: routes.legacy.acties,        element: <LegacyRedirect to={routes.hub} /> },
          { path: routes.legacy.notifications, element: <LegacyRedirect to={routes.notifications} /> },
          { path: routes.legacy.changelog,     element: <LegacyRedirect to={routes.changelog} /> },

          {
            path: routes.settings,
            element: <SettingsPage />,
          },
          {
            path: routes.profile.pattern,
            element: <ProfilePage />,
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
            path: routes.notifications,
            element: <NotificationSettingsPage />,
          },
          {
            path: routes.changelog,
            element: <ChangelogPage />,
          },
          // ── Admin portal ──────────────────────────────────────────────
          {
            element: <AdminRoute />,
            children: [
              {
                path: routes.testError,
                element: <CrashTestPage />,
              },
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
                  { path: routes.admin.whitelist,  element: <AdminWhitelistPage /> },
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
                  { path: routes.admin.screens, element: <AdminScreensPage /> },
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
    ],
  },
]);
