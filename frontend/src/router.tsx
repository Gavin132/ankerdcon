import { createBrowserRouter } from "react-router-dom";
import { routes } from "./config/routes";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { HubPage } from "./pages/HubPage";
import { TransportPage } from "./pages/TransportPage";
import { FoodPage } from "./pages/FoodPage";
import { FinancePage } from "./pages/FinancePage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";

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
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
