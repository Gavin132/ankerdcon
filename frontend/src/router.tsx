import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { HubPage } from "./pages/HubPage";
import { TransportPage } from "./pages/TransportPage";
import { FoodPage } from "./pages/FoodPage";
import { FinancePage } from "./pages/FinancePage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <AppShell>
            <HubPage />
          </AppShell>
        ),
        path: "/",
      },
      {
        element: (
          <AppShell>
            <TransportPage />
          </AppShell>
        ),
        path: "/transport",
      },
      {
        element: (
          <AppShell>
            <FoodPage />
          </AppShell>
        ),
        path: "/food",
      },
      {
        element: (
          <AppShell>
            <FinancePage />
          </AppShell>
        ),
        path: "/finance",
      },
      {
        element: (
          <AppShell>
            <MorePage />
          </AppShell>
        ),
        path: "/more",
      },
      {
        element: <ProfilePage />,
        path: "/profile/:name",
      },
    ],
  },
]);
