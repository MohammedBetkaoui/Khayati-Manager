import { createHashRouter, RouterProvider, Outlet } from "react-router";
import { LanguageProvider } from "./language-context";
import { HomePage } from "./pages/home-page";
import { WorkersPage } from "./pages/workers-page";
import { StockPage } from "./pages/stock-page";
import { ProductionPage } from "./pages/production-page";
import { SalesPage } from "./pages/sales-page";
import { SalaryPage } from "./pages/salary-page";
import { ExpensesPage } from "./pages/expenses-page";
import { AnalyticsPage } from "./pages/analytics-page";
import { SpecialSettingsPage } from "./pages/special-settings-page";
import { CustomerProfilePage } from "./pages/customer-profile-page";
import { WorkerProfilePage } from "./pages/worker-profile-page";

function RootLayout() {
  return (
    <LanguageProvider>
      <Outlet />
    </LanguageProvider>
  );
}

const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "workers", element: <WorkersPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "production", element: <ProductionPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "customer-profile", element: <CustomerProfilePage /> },
      { path: "salary", element: <SalaryPage /> },
      { path: "worker-profile", element: <WorkerProfilePage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "special-settings", element: <SpecialSettingsPage /> },
      { path: "*", element: <HomePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
