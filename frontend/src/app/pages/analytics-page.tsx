import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";
import { palette, analyticsText } from "./analytics-data";
import { SummaryCards, type AnalyticsSummaryMetrics } from "../components/analytics/summary-cards";
import { ActionBar } from "../components/analytics/action-bar";
import { InsightsSidebar } from "../components/analytics/insights-sidebar";
import { ReportModal } from "../components/analytics/report-modal";
import {
  DelayedOrdersTable,
  ExpensesRevChart,
  SalesProfitChart,
  TopList,
  type AnalyticsTopItem,
  type DelayedOrderItem,
} from "../components/analytics/charts-and-lists";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";

type WorkerRow = {
  fullName: string;
  role: string;
  totalPieces: number;
};

type OrderRow = {
  id: string;
  customer: string;
  product: string;
  delay: number;
  date: string;
};

type InvoiceRow = {
  total: number;
  date: string;
  product: string;
};

type ExpenseRow = {
  amount: number;
  date: string;
};

type WorkersStats = {
  totalWorkers: number;
  presentToday: number;
  absentToday: number;
  piecesThisMonth: number;
};

type InventoryStats = {
  lowStockMaterials: number;
  stockValue: number;
  monthlyMovements: number;
};

const emptyWorkersStats: WorkersStats = {
  totalWorkers: 0,
  presentToday: 0,
  absentToday: 0,
  piecesThisMonth: 0,
};

const emptyInventoryStats: InventoryStats = {
  lowStockMaterials: 0,
  stockValue: 0,
  monthlyMovements: 0,
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en", { month: "short" });
}

function buildRecentMonths(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (count - index - 1), 1);
    return {
      key: monthKey(date),
      label: monthLabel(date),
    };
  });
}

function safeString(value: unknown) {
  return getText(value).trim();
}

function mapWorkerRow(raw: unknown): WorkerRow {
  const record = asRecord(raw);
  return {
    fullName: safeString(record?.fullName) || safeString(record?.name) || "Sans nom",
    role: safeString(record?.role),
    totalPieces: getNumber(record?.totalPiecesCompleted ?? record?.totalPieces ?? record?.piecesCompleted),
  };
}

function mapOrderRow(raw: unknown): OrderRow | null {
  const record = asRecord(raw);
  const deadline = safeString(record?.deadline ?? record?.status).toLowerCase();
  const isLate = deadline.includes("late") || deadline.includes("retard");
  if (!isLate) {
    return null;
  }

  return {
    id: safeString(record?.id) || safeString(record?.number) || "-",
    customer: safeString(record?.customerName) || safeString(record?.customer) || "Client",
    product: safeString(record?.product) || safeString(record?.productName) || "Produit",
    delay: Math.max(1, getNumber(record?.delayDays ?? record?.delay)),
    date: safeString(record?.date) || safeString(record?.deliveryDate) || safeString(record?.createdAt),
  };
}

function mapInvoiceRow(raw: unknown): InvoiceRow {
  const record = asRecord(raw);
  const firstItem = getArrayFromPayload(record?.items)[0];
  const firstItemRecord = asRecord(firstItem);

  return {
    total: getNumber(record?.total),
    date: safeString(record?.date) || safeString(record?.createdAt),
    product: safeString(firstItemRecord?.description) || safeString(firstItemRecord?.name) || "Produit",
  };
}

function mapExpenseRow(raw: unknown): ExpenseRow {
  const record = asRecord(raw);
  return {
    amount: getNumber(record?.amount),
    date: safeString(record?.date) || safeString(record?.createdAt),
  };
}

export function AnalyticsPage() {
  const { lang, dir } = useLanguage();
  const t = analyticsText[lang];
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [reportOpen, setReportOpen] = useState(false);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkersStats>(emptyWorkersStats);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>(emptyInventoryStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function safeLoad<T>(path: string) {
      try {
        return await fetchJson<unknown>(path);
      } catch {
        return null;
      }
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [workersPayload, workerStatsPayload, inventoryStatsPayload, ordersPayload, salesPayload, expensesPayload] =
          await Promise.all([
            safeLoad("/workers?limit=100&sortBy=fullName&sortOrder=ASC"),
            safeLoad("/workers/stats"),
            safeLoad("/inventory/stats"),
            safeLoad("/orders"),
            safeLoad("/sales"),
            safeLoad("/expenses"),
          ]);

        if (cancelled) return;

        setWorkers(getArrayFromPayload(workersPayload).map(mapWorkerRow));

        const workerStatsRecord = asRecord(workerStatsPayload);
        setWorkerStats({
          totalWorkers: getNumber(workerStatsRecord?.totalWorkers),
          presentToday: getNumber(workerStatsRecord?.presentToday),
          absentToday: getNumber(workerStatsRecord?.absentToday),
          piecesThisMonth: getNumber(workerStatsRecord?.piecesThisMonth ?? workerStatsRecord?.totalPiecesThisMonth),
        });

        const inventoryStatsRecord = asRecord(inventoryStatsPayload);
        setInventoryStats({
          lowStockMaterials: getNumber(inventoryStatsRecord?.lowStockMaterials ?? inventoryStatsRecord?.lowStock),
          stockValue: getNumber(inventoryStatsRecord?.stockValue),
          monthlyMovements: getNumber(inventoryStatsRecord?.monthlyMovements ?? inventoryStatsRecord?.movementsCount),
        });

        setOrders(getArrayFromPayload(ordersPayload).map(mapOrderRow).filter((row): row is OrderRow => row !== null));
        setInvoices(getArrayFromPayload(salesPayload).map(mapInvoiceRow));
        setExpenses(getArrayFromPayload(expensesPayload).map(mapExpenseRow));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs = [
    { id: "overview", label: t.tabs.overview },
    { id: "salesProfits", label: t.tabs.salesProfits },
    { id: "workersProd", label: t.tabs.workersProd },
    { id: "stockMat", label: t.tabs.stockMat },
    { id: "orders", label: t.tabs.orders },
    { id: "detailed", label: t.tabs.detailed },
  ];

  const recentMonths = useMemo(() => buildRecentMonths(6), []);

  const salesByMonth = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const invoice of invoices) {
      if (!invoice.date) continue;
      totals[invoice.date.slice(0, 7)] = (totals[invoice.date.slice(0, 7)] ?? 0) + invoice.total;
    }
    return recentMonths.map((month) => totals[month.key] ?? 0);
  }, [invoices, recentMonths]);

  const expensesByMonth = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of expenses) {
      if (!expense.date) continue;
      totals[expense.date.slice(0, 7)] = (totals[expense.date.slice(0, 7)] ?? 0) + expense.amount;
    }
    return recentMonths.map((month) => totals[month.key] ?? 0);
  }, [expenses, recentMonths]);

  const profitByMonth = useMemo(() => {
    return salesByMonth.map((salesValue, index) => Math.max(0, salesValue - (expensesByMonth[index] ?? 0)));
  }, [expensesByMonth, salesByMonth]);

  const currentMonthKey = monthKey(startOfMonth(new Date()));
  const monthSales = invoices.filter((invoice) => invoice.date.startsWith(currentMonthKey)).reduce((sum, invoice) => sum + invoice.total, 0);
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(currentMonthKey)).reduce((sum, expense) => sum + expense.amount, 0);
  const delayedCount = orders.length;

  const topWorkers = useMemo<AnalyticsTopItem[]>(() => {
    return [...workers]
      .sort((a, b) => b.totalPieces - a.totalPieces)
      .slice(0, 3)
      .map((worker) => ({
        name: worker.fullName,
        val1: worker.role || (lang === "ar" ? "عامل" : "Ouvrier"),
        val2: lang === "ar" ? `${worker.totalPieces} قطعة` : `${worker.totalPieces} pcs`,
      }));
  }, [lang, workers]);

  const topProducts = useMemo<AnalyticsTopItem[]>(() => {
    const productMap = invoices.reduce<Record<string, { quantity: number; revenue: number }>>((acc, invoice) => {
      const key = invoice.product;
      if (!key) return acc;
      acc[key] = {
        quantity: (acc[key]?.quantity ?? 0) + 1,
        revenue: (acc[key]?.revenue ?? 0) + invoice.total,
      };
      return acc;
    }, {});

    return Object.entries(productMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3)
      .map(([name, data]) => ({
        name,
        val1: String(data.quantity),
        val2: `${data.revenue.toLocaleString()} ${t.currency}`,
      }));
  }, [invoices, t.currency]);

  const delayedOrders = useMemo<DelayedOrderItem[]>(() => {
    return orders.slice(0, 5).map((order) => ({
      id: order.id,
      customer: order.customer,
      product: order.product,
      delay: order.delay,
    }));
  }, [orders]);

  const metrics = useMemo<AnalyticsSummaryMetrics>(() => {
    return {
      sales: monthSales,
      profits: Math.max(0, monthSales - monthExpenses),
      expenses: monthExpenses,
      delayed: delayedCount,
      topWorker: topWorkers[0]?.name ?? "",
      topProduct: topProducts[0]?.name ?? "",
    };
  }, [delayedCount, monthExpenses, monthSales, topProducts, topWorkers]);

  const insights = useMemo(() => {
    const rows: string[] = [];
    if (workerStats.totalWorkers > 0) {
      rows.push(
        lang === "ar"
          ? `${workerStats.presentToday} من أصل ${workerStats.totalWorkers} عاملين حاضرون اليوم.`
          : `${workerStats.presentToday} travailleurs sur ${workerStats.totalWorkers} sont presents aujourd'hui.`,
      );
    }
    if (workerStats.piecesThisMonth > 0) {
      rows.push(
        lang === "ar"
          ? `تم إنجاز ${workerStats.piecesThisMonth} قطعة منذ 1 أغسطس 2026.`
          : `${workerStats.piecesThisMonth} pieces ont ete realisees depuis le 1 aout 2026.`,
      );
    }
    if (inventoryStats.stockValue > 0) {
      rows.push(
        lang === "ar"
          ? `قيمة المخزون الحالية ${inventoryStats.stockValue.toLocaleString()} ${t.currency}.`
          : `La valeur actuelle du stock est de ${inventoryStats.stockValue.toLocaleString()} ${t.currency}.`,
      );
    }
    return rows;
  }, [inventoryStats.stockValue, lang, t.currency, workerStats.piecesThisMonth, workerStats.presentToday, workerStats.totalWorkers]);

  const alerts = useMemo(() => {
    const rows: string[] = [];
    if (inventoryStats.lowStockMaterials > 0) {
      rows.push(
        lang === "ar"
          ? `${inventoryStats.lowStockMaterials} مواد قاربت على النفاد في المخزون.`
          : `${inventoryStats.lowStockMaterials} matieres sont proches de la rupture.`,
      );
    }
    if (workerStats.absentToday > 0) {
      rows.push(
        lang === "ar"
          ? `${workerStats.absentToday} غيابات مسجلة اليوم.`
          : `${workerStats.absentToday} absences ont ete enregistrees aujourd'hui.`,
      );
    }
    if (delayedCount > 0) {
      rows.push(
        lang === "ar"
          ? `${delayedCount} طلبيات متأخرة تحتاج متابعة.`
          : `${delayedCount} commandes en retard demandent un suivi.`,
      );
    }
    return rows;
  }, [delayedCount, inventoryStats.lowStockMaterials, lang, workerStats.absentToday]);

  const actions = useMemo(() => {
    const rows: string[] = [];
    if (inventoryStats.lowStockMaterials > 0) {
      rows.push(lang === "ar" ? "أعط أولوية لإعادة تموين المواد الناقصة." : "Prioriser le reapprovisionnement des matieres critiques.");
    }
    if (workerStats.presentToday < workerStats.totalWorkers) {
      rows.push(lang === "ar" ? "راجع توزيع العمل حسب الحضور اليومي." : "Revoir la repartition des taches selon la presence du jour.");
    }
    if (metrics.sales > 0 && metrics.expenses > metrics.sales) {
      rows.push(lang === "ar" ? "راقب المصاريف لأنّها تتجاوز المبيعات الحالية." : "Surveiller les depenses car elles depassent les ventes actuelles.");
    }
    return rows;
  }, [inventoryStats.lowStockMaterials, lang, metrics.expenses, metrics.sales, workerStats.presentToday, workerStats.totalWorkers]);

  return (
    <PageBackground>
      <div className="flex items-center gap-4 pt-7">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}
        >
          <BackArrow size={20} />
        </button>
        <div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
            <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
              {t.breadcrumbHome}
            </button>
            <CrumbChevron size={14} />
            <span style={{ color: palette.text, fontWeight: 600 }}>{t.breadcrumb}</span>
          </div>
          <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 680 }}>{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-6">
        <SummaryCards metrics={metrics} />
      </div>

      <div className="mt-5">
        <ActionBar onCreateReport={() => setReportOpen(true)} />
      </div>

      <div className="mt-5 flex flex-col gap-6 pb-10 xl:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {tabs.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className="transition-colors"
                  style={{
                    padding: "9px 16px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : palette.muted,
                    backgroundColor: active ? palette.primary : palette.surface,
                    border: `1px solid ${active ? palette.primary : palette.border}`,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="mb-4 text-sm" style={{ color: palette.muted }}>
              {lang === "ar" ? "جاري تحميل التحليلات..." : "Chargement des analyses..."}
            </div>
          ) : null}
          {!loading && error ? (
            <div className="mb-4 text-sm" style={{ color: "#b46a66" }}>
              {lang === "ar" ? "تعذر تحميل بعض بيانات التحليل." : "Impossible de charger une partie des donnees analytiques."}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SalesProfitChart
              months={recentMonths.map((month) => month.label)}
              sales={salesByMonth.map((value) => (monthSales > 0 ? Math.round((value / Math.max(...salesByMonth, 1)) * 100) : 0))}
              profits={profitByMonth.map((value) => (Math.max(...profitByMonth, 0) > 0 ? Math.round((value / Math.max(...profitByMonth, 1)) * 100) : 0))}
            />
            <ExpensesRevChart salesTotal={monthSales} expensesTotal={monthExpenses} profitTotal={monthSales - monthExpenses} />
            <TopList title={t.charts.topProducts} items={topProducts} columns={[t.actions.product, lang === "ar" ? "الكمية" : "Qté", lang === "ar" ? "الإيراد" : "Revenu"]} />
            <TopList title={t.charts.topWorkers} items={topWorkers} columns={[t.actions.worker, lang === "ar" ? "الوظيفة" : "Rôle", lang === "ar" ? "الإنتاج" : "Prod."]} />
            <div className="md:col-span-2">
              <DelayedOrdersTable orders={delayedOrders} />
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 xl:w-[320px]">
          <div className="sticky top-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>
                {t.insights.title}
              </h2>
            </div>
            <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <InsightsSidebar insights={insights} alerts={alerts} actions={actions} />
            </div>
          </div>
        </div>
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </PageBackground>
  );
}
