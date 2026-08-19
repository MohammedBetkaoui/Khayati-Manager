import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Factory,
  PackageCheck,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  PageHeading,
  StatePanel,
  StatCard,
  formatMoney,
} from "../components/commerce-ui";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { ApiInvoice, FinishedProduct } from "../lib/commerce";

type SalesStats = {
  monthSales: number;
  totalDebt: number;
  totalInvoices: number;
  averageSale: number;
};

type RawStats = {
  totalMaterials: number;
  lowStockMaterials: number;
  stockValue: number;
  monthlyMovements: number;
};

type ProductStats = {
  totalProducts: number;
  availablePieces: number;
  soldPieces: number;
  lowStockProducts: number;
  productionBatches: number;
  retailStockValue: number;
  costStockValue: number;
};

type WorkerStats = {
  totalWorkers: number;
  presentToday: number;
  absentToday: number;
  totalPiecesThisMonth?: number;
  piecesThisMonth?: number;
};

const emptySales: SalesStats = {
  monthSales: 0,
  totalDebt: 0,
  totalInvoices: 0,
  averageSale: 0,
};
const emptyRaw: RawStats = {
  totalMaterials: 0,
  lowStockMaterials: 0,
  stockValue: 0,
  monthlyMovements: 0,
};
const emptyProducts: ProductStats = {
  totalProducts: 0,
  availablePieces: 0,
  soldPieces: 0,
  lowStockProducts: 0,
  productionBatches: 0,
  retailStockValue: 0,
  costStockValue: 0,
};
const emptyWorkers: WorkerStats = {
  totalWorkers: 0,
  presentToday: 0,
  absentToday: 0,
};

function recentMonths(count: number) {
  const current = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      current.getFullYear(),
      current.getMonth() - (count - index - 1),
      1,
    );
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("fr-DZ", { month: "short" }),
    };
  });
}

export function AnalyticsPage() {
  const { lang } = useLanguage();
  const [sales, setSales] = useState<SalesStats>(emptySales);
  const [raw, setRaw] = useState<RawStats>(emptyRaw);
  const [productStats, setProductStats] = useState<ProductStats>(emptyProducts);
  const [workers, setWorkers] = useState<WorkerStats>(emptyWorkers);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          salesStats,
          rawStats,
          finishedStats,
          workerStats,
          invoiceList,
          productList,
        ] = await Promise.all([
          fetchJson<SalesStats>("/sales/stats", { signal: controller.signal }),
          fetchJson<RawStats>("/inventory/stats", {
            signal: controller.signal,
          }),
          fetchJson<ProductStats>("/inventory/products/stats", {
            signal: controller.signal,
          }),
          fetchJson<WorkerStats>("/workers/stats", {
            signal: controller.signal,
          }),
          fetchJson<{ data: ApiInvoice[] }>("/sales/invoices?limit=100", {
            signal: controller.signal,
          }),
          fetchJson<{ data: FinishedProduct[] }>(
            "/inventory/products?limit=100",
            { signal: controller.signal },
          ),
        ]);
        setSales(salesStats);
        setRaw(rawStats);
        setProductStats(finishedStats);
        setWorkers(workerStats);
        setInvoices(invoiceList.data);
        setProducts(productList.data);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load analytics",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const months = useMemo(() => recentMonths(6), []);
  const monthlySales = useMemo(() => {
    const totals = new Map<string, number>();
    for (const invoice of invoices)
      totals.set(
        invoice.date.slice(0, 7),
        (totals.get(invoice.date.slice(0, 7)) ?? 0) + invoice.totalAmount,
      );
    return months.map((month) => ({
      ...month,
      amount: totals.get(month.key) ?? 0,
    }));
  }, [invoices, months]);
  const maxMonth = Math.max(...monthlySales.map((month) => month.amount), 1);

  const topProducts = useMemo(() => {
    const values = new Map<string, { quantity: number; amount: number }>();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const current = values.get(item.productName) ?? {
          quantity: 0,
          amount: 0,
        };
        current.quantity += item.quantity;
        current.amount += item.total;
        values.set(item.productName, current);
      }
    }
    return [...values.entries()]
      .sort((left, right) => right[1].quantity - left[1].quantity)
      .slice(0, 5);
  }, [invoices]);

  const stockProducts = [...products]
    .sort((left, right) => right.quantityAvailable - left.quantityAvailable)
    .slice(0, 6);
  const grossStockMargin = Math.max(
    0,
    productStats.retailStockValue - productStats.costStockValue,
  );
  const attendanceRate = workers.totalWorkers
    ? Math.round((workers.presentToday / workers.totalWorkers) * 100)
    : 0;
  const lowAlerts = raw.lowStockMaterials + productStats.lowStockProducts;

  const text =
    lang === "ar"
      ? {
          title: "تحليل البيانات",
          subtitle:
            "قراءة مباشرة للمبيعات، المخزون، الإنتاج ونشاط الورشة دون بيانات ثابتة.",
          sales: "مبيعات الشهر",
          debt: "ديون الزبائن",
          stock: "قيمة المنتجات",
          pieces: "القطع المتوفرة",
          alerts: "تنبيهات المخزون",
          batches: "دفعات الإنتاج",
          trend: "تطور المبيعات خلال 6 أشهر",
          top: "المنتجات الأكثر مبيعا",
          stockTitle: "توزيع مخزون المنتجات",
          workshop: "مؤشرات الورشة",
          attendance: "نسبة الحضور اليوم",
          rawValue: "قيمة المواد الأولية",
          margin: "هامش المخزون المتوقع",
          movements: "حركات المواد هذا الشهر",
          empty: "لا توجد بيانات كافية للتحليل",
        }
      : {
          title: "Analyse des données",
          subtitle:
            "Lecture directe des ventes, stocks, productions et activités de l'atelier, sans données statiques.",
          sales: "Ventes du mois",
          debt: "Créances clients",
          stock: "Valeur des produits",
          pieces: "Pièces disponibles",
          alerts: "Alertes de stock",
          batches: "Lots de production",
          trend: "Évolution des ventes sur 6 mois",
          top: "Produits les plus vendus",
          stockTitle: "Répartition du stock produits",
          workshop: "Indicateurs atelier",
          attendance: "Présence aujourd'hui",
          rawValue: "Valeur des matières",
          margin: "Marge potentielle du stock",
          movements: "Mouvements matières du mois",
          empty: "Pas encore assez de données pour l'analyse",
        };

  return (
    <PageBackground>
      <PageHeading title={text.title} subtitle={text.subtitle} />
      <div className="mt-6">
        <StatePanel
          loading={loading}
          error={error}
          empty={false}
          emptyTitle={text.empty}
          onRetry={() => setRefreshKey((value) => value + 1)}
        />
      </div>
      {!loading && !error ? (
        <>
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              icon={Receipt}
              label={text.sales}
              value={formatMoney(sales.monthSales, lang)}
            />
            <StatCard
              icon={CircleDollarSign}
              label={text.debt}
              value={formatMoney(sales.totalDebt, lang)}
              color="#b46a66"
              tint="rgba(201,138,134,0.13)"
            />
            <StatCard
              icon={Boxes}
              label={text.stock}
              value={formatMoney(productStats.retailStockValue, lang)}
              color="#a87d3c"
              tint="rgba(195,154,91,0.15)"
            />
            <StatCard
              icon={PackageCheck}
              label={text.pieces}
              value={productStats.availablePieces}
              color="#4d8a6a"
              tint="rgba(77,138,106,0.12)"
            />
            <StatCard
              icon={AlertTriangle}
              label={text.alerts}
              value={lowAlerts}
              color="#b46a66"
              tint="rgba(201,138,134,0.13)"
            />
            <StatCard
              icon={Factory}
              label={text.batches}
              value={productStats.productionBatches}
              color="#6b8aa0"
              tint="rgba(107,138,160,0.13)"
            />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <section
              className="rounded-[22px] border p-5"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={18} style={{ color: palette.primary }} />
                <h2 style={{ fontSize: 16, fontWeight: 900 }}>{text.trend}</h2>
              </div>
              <div className="mt-6 flex h-64 items-end gap-3">
                {monthlySales.map((month) => (
                  <div
                    key={month.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span
                      className="max-w-full truncate"
                      style={{ fontSize: 10.5, color: palette.muted }}
                    >
                      {formatMoney(month.amount, lang)}
                    </span>
                    <div
                      className="w-full max-w-[62px] rounded-t-xl transition-all"
                      style={{
                        height: `${Math.max(5, (month.amount / maxMonth) * 180)}px`,
                        background: month.amount
                          ? "linear-gradient(180deg, #c39a5b 0%, #123c4a 100%)"
                          : palette.border,
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: palette.muted }}>
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section
              className="rounded-[22px] border p-5"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 900 }}>{text.top}</h2>
              {topProducts.length ? (
                <div className="mt-4 flex flex-col gap-3">
                  {topProducts.map(([name, values], index) => (
                    <div
                      key={name}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ backgroundColor: palette.bg }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor:
                            index === 0
                              ? palette.accentSoft
                              : "rgba(18,60,74,0.07)",
                          color: index === 0 ? "#a87d3c" : palette.primary,
                          fontWeight: 900,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate"
                          style={{ fontSize: 13.5, fontWeight: 800 }}
                        >
                          {name}
                        </div>
                        <div style={{ fontSize: 11.5, color: palette.muted }}>
                          {values.quantity} {lang === "ar" ? "قطعة" : "pièces"}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 900,
                          color: palette.primary,
                        }}
                      >
                        {formatMoney(values.amount, lang)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text={text.empty} />
              )}
            </section>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section
              className="rounded-[22px] border p-5"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 900 }}>
                {text.stockTitle}
              </h2>
              {stockProducts.length ? (
                <div className="mt-4 flex flex-col gap-3">
                  {stockProducts.map((product) => {
                    const width = productStats.availablePieces
                      ? Math.max(
                          3,
                          (product.quantityAvailable /
                            productStats.availablePieces) *
                            100,
                        )
                      : 0;
                    return (
                      <div key={product.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span
                            className="truncate"
                            style={{ fontSize: 13, fontWeight: 700 }}
                          >
                            {product.name}
                          </span>
                          <span style={{ fontSize: 12, color: palette.muted }}>
                            {product.quantityAvailable}
                          </span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full"
                          style={{ backgroundColor: palette.bg }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${width}%`,
                              backgroundColor:
                                product.quantityAvailable <=
                                product.minStockAlert
                                  ? "#c98a86"
                                  : "#4d8a6a",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty text={text.empty} />
              )}
            </section>
            <section
              className="rounded-[22px] border p-5"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
            >
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: palette.primary }} />
                <h2 style={{ fontSize: 16, fontWeight: 900 }}>
                  {text.workshop}
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Indicator
                  label={text.attendance}
                  value={`${attendanceRate}%`}
                  helper={`${workers.presentToday}/${workers.totalWorkers}`}
                  color="#4d8a6a"
                />
                <Indicator
                  label={text.rawValue}
                  value={formatMoney(raw.stockValue, lang)}
                  helper={`${raw.totalMaterials} ${lang === "ar" ? "مادة" : "matières"}`}
                  color="#a87d3c"
                />
                <Indicator
                  label={text.margin}
                  value={formatMoney(grossStockMargin, lang)}
                  helper={lang === "ar" ? "قبل المصاريف" : "avant charges"}
                  color={palette.primary}
                />
                <Indicator
                  label={text.movements}
                  value={String(raw.monthlyMovements)}
                  helper={
                    lang === "ar"
                      ? "دخول وخروج وإنتاج"
                      : "entrées, sorties, production"
                  }
                  color="#6b8aa0"
                />
              </div>
            </section>
          </div>
        </>
      ) : null}
    </PageBackground>
  );
}

function Indicator({
  label,
  value,
  helper,
  color,
}: {
  label: string;
  value: string;
  helper: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: palette.bg }}>
      <div style={{ fontSize: 11.5, color: palette.muted }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 19, fontWeight: 900, color }}>
        {value}
      </div>
      <div className="mt-1" style={{ fontSize: 11, color: palette.muted }}>
        {helper}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      className="mt-4 flex min-h-36 items-center justify-center rounded-xl border border-dashed text-center text-sm"
      style={{ borderColor: palette.borderStrong, color: palette.muted }}
    >
      {text}
    </div>
  );
}
