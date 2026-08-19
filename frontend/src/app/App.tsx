import { lazy, Suspense } from "react";
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import { LanguageProvider } from "./language-context";
import { palette } from "./content";

const HomePage = lazy(() =>
  import("./pages/home-page").then((module) => ({ default: module.HomePage })),
);
const WorkersPage = lazy(() =>
  import("./pages/workers-page").then((module) => ({
    default: module.WorkersPage,
  })),
);
const StockPage = lazy(() =>
  import("./pages/stock-page").then((module) => ({
    default: module.StockPage,
  })),
);
const SalesPage = lazy(() =>
  import("./pages/sales-page").then((module) => ({
    default: module.SalesPage,
  })),
);
const NewSalePage = lazy(() =>
  import("./pages/new-sale-page").then((module) => ({
    default: module.NewSalePage,
  })),
);
const ClientsPage = lazy(() =>
  import("./pages/clients-page").then((module) => ({
    default: module.ClientsPage,
  })),
);
const SalaryPage = lazy(() =>
  import("./pages/salary-page").then((module) => ({
    default: module.SalaryPage,
  })),
);
const ExpensesPage = lazy(() =>
  import("./pages/expenses-page").then((module) => ({
    default: module.ExpensesPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import("./pages/analytics-page").then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const SpecialSettingsPage = lazy(() =>
  import("./pages/special-settings-page").then((module) => ({
    default: module.SpecialSettingsPage,
  })),
);
const CustomerProfilePage = lazy(() =>
  import("./pages/customer-profile-page").then((module) => ({
    default: module.CustomerProfilePage,
  })),
);
const WorkerProfilePage = lazy(() =>
  import("./pages/worker-profile-page").then((module) => ({
    default: module.WorkerProfilePage,
  })),
);

function RootLayout() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div
            className="flex size-full items-center justify-center"
            style={{
              backgroundColor: palette.bg,
              color: palette.primary,
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            جاري تحميل الصفحة...
          </div>
        }
      >
        <Outlet />
      </Suspense>
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
      { path: "clients", element: <ClientsPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "sales/new", element: <NewSalePage /> },
      { path: "customer-profile", element: <Navigate to="/clients" replace /> },
      {
        path: "customer-profile/:customerId",
        element: <CustomerProfilePage />,
      },
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
