import { lazy, Suspense } from "react";
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import { LanguageProvider } from "./language-context";
import { ThemeProvider } from "./theme-context";
import { palette } from "./content";
import { WindowTitleBar } from "./components/window-title-bar";

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
const ProductArchivesPage = lazy(() =>
  import("./pages/product-archives-page").then((module) => ({
    default: module.ProductArchivesPage,
  })),
);
const SuppliersPage = lazy(() =>
  import("./pages/suppliers-page").then((module) => ({
    default: module.SuppliersPage,
  })),
);
const SupplierArchivesPage = lazy(() =>
  import("./pages/supplier-archives-page").then((module) => ({
    default: module.SupplierArchivesPage,
  })),
);
const SupplierProfilePage = lazy(() =>
  import("./pages/supplier-profile-page").then((module) => ({
    default: module.SupplierProfilePage,
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
const CustomerArchivesPage = lazy(() =>
  import("./pages/customer-archives-page").then((module) => ({
    default: module.CustomerArchivesPage,
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
const SettingsPage = lazy(() =>
  import("./pages/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
);

function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div
          className="flex size-full min-h-0 flex-col"
          style={{ backgroundColor: palette.bg }}
        >
          <WindowTitleBar />
          <div className="min-h-0 flex-1">
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
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
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
      { path: "stock/archives", element: <ProductArchivesPage /> },
      { path: "suppliers", element: <SuppliersPage /> },
      { path: "suppliers/archives", element: <SupplierArchivesPage /> },
      { path: "suppliers/:supplierId", element: <SupplierProfilePage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "clients/archives", element: <CustomerArchivesPage /> },
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
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <HomePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
