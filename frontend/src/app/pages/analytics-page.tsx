import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BanknoteArrowDown,
  Boxes,
  CircleDollarSign,
  Factory,
  HandCoins,
  PackageCheck,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PageHeading,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { PageBackground } from "../components/page-background";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";

type MonthPoint = { month: string };

type AnalyticsDashboard = {
  period: { months: number; startDate: string; endDate: string };
  summary: {
    sales: number;
    receipts: number;
    outflows: number;
    estimatedCashFlow: number;
    customerDebt: number;
    currentCustomerDebt: number;
    legacyCustomerDebt: number;
    supplierDebt: number;
    currentSupplierDebt: number;
    legacySupplierDebt: number;
    payrollPaid: number;
    payrollRemaining: number;
  };
  financialTrend: Array<
    MonthPoint & { sales: number; receipts: number; outflows: number }
  >;
  expenseBreakdown: Array<
    MonthPoint & {
      salaries: number;
      materials: number;
      rent: number;
      maintenance: number;
      transport: number;
      other: number;
    }
  >;
  productionSales: Array<MonthPoint & { produced: number; sold: number }>;
  topProducts: Array<{
    productId: number | null;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  finishedStock: Array<{
    productId: number;
    name: string;
    quantityAvailable: number;
    quantityProduced: number;
    quantitySold: number;
  }>;
  debtTrend: Array<MonthPoint & { customerDebt: number; supplierDebt: number }>;
  insights: {
    topCustomers: Array<{
      id: number;
      fullName: string;
      revenue: number;
      salesCount: number;
    }>;
    customerDebts: Array<{
      id: number;
      fullName: string;
      phone: string;
      debt: number;
      currentDebt: number;
      legacyDebt: number;
    }>;
    supplierDebts: Array<{
      id: number;
      name: string;
      phone: string | null;
      debt: number;
      currentDebt: number;
      legacyDebt: number;
    }>;
    overdueInvoices: Array<{
      id: number;
      invoiceNumber: string;
      customerId: number;
      customerName: string;
      dueDate: string;
      remainingAmount: number;
      daysOverdue: number;
    }>;
    supplierPaymentsDue: Array<{
      purchaseId: number;
      supplierId: number;
      supplierName: string;
      materialName: string;
      purchaseDate: string;
      remainingAmount: number;
      daysOpen: number;
      status: "OLD" | "OPEN";
    }>;
    inactiveProducts: Array<{
      productId: number;
      name: string;
      quantityAvailable: number;
      lastSaleDate: string | null;
      inactiveDays: number;
      level: "30_DAYS" | "60_DAYS";
    }>;
    payroll: {
      totalDue: number;
      totalPaid: number;
      totalRemaining: number;
      payrollCount: number;
    };
    pieceWorkers: Array<{
      workerId: number;
      workerName: string;
      pieces: number;
      amount: number;
    }>;
  };
  sourceCounts: {
    invoices: number;
    purchases: number;
    payrolls: number;
    manualExpenses: number;
  };
};

const emptyDashboard: AnalyticsDashboard = {
  period: { months: 12, startDate: "", endDate: "" },
  summary: {
    sales: 0,
    receipts: 0,
    outflows: 0,
    estimatedCashFlow: 0,
    customerDebt: 0,
    currentCustomerDebt: 0,
    legacyCustomerDebt: 0,
    supplierDebt: 0,
    currentSupplierDebt: 0,
    legacySupplierDebt: 0,
    payrollPaid: 0,
    payrollRemaining: 0,
  },
  financialTrend: [],
  expenseBreakdown: [],
  productionSales: [],
  topProducts: [],
  finishedStock: [],
  debtTrend: [],
  insights: {
    topCustomers: [],
    customerDebts: [],
    supplierDebts: [],
    overdueInvoices: [],
    supplierPaymentsDue: [],
    inactiveProducts: [],
    payroll: { totalDue: 0, totalPaid: 0, totalRemaining: 0, payrollCount: 0 },
    pieceWorkers: [],
  },
  sourceCounts: { invoices: 0, purchases: 0, payrolls: 0, manualExpenses: 0 },
};

const colors = {
  teal: "var(--app-primary)",
  gold: "var(--app-accent)",
  green: "#4d8a6a",
  red: "#c46f67",
  blue: "#6b8fa4",
  sand: "#dfc89f",
  gray: "var(--app-muted)",
};

export function AnalyticsPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [months, setMonths] = useState(12);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchJson<AnalyticsDashboard>(
          `/analytics/dashboard?months=${months}`,
          { signal: controller.signal },
        );
        setDashboard(result);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Impossible de charger les statistiques",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [months, refreshKey]);

  const ar = lang === "ar";
  const text = ar
    ? {
        title: "الإحصائيات والتحليل المالي",
        subtitle:
          "رؤية موحدة للمبيعات، المصاريف، الإنتاج، المخزون والديون من البيانات الفعلية للورشة.",
        period: "الفترة",
        sales: "المبيعات المسجلة",
        receipts: "المبالغ المحصلة",
        outflows: "المبالغ المدفوعة",
        cashFlow: "صافي التدفق النقدي",
        customerDebt: "ديون الزبائن",
        supplierDebt: "ديون الموردين",
        currentCustomerDebt: "مستحقات الزبائن الحالية",
        legacyCustomerDebt: "مستحقات الزبائن السابقة",
        currentSupplierDebt: "ديون الموردين الحالية",
        legacySupplierDebt: "ديون الموردين السابقة",
        financial: "التطور المالي",
        financialHelp: "المبيعات، التحصيلات والمدفوعات خلال الفترة",
        expenses: "توزيع المصاريف",
        expensesHelp: "الرواتب، المشتريات والمصاريف العامة دون تكرار",
        production: "الإنتاج والمبيعات",
        productionHelp: "مقارنة القطع المنتجة بالقطع المباعة كل شهر",
        products: "المنتجات الأكثر مبيعاً",
        productsHelp: "الكمية المباعة ورقم الأعمال لكل موديل",
        stock: "مخزون المنتجات الجاهزة",
        stockHelp: "الكميات المتوفرة حالياً للموديلات النشطة",
        debts: "تطور الديون",
        debtsHelp: "ديون الزبائن وديون الموردين المتراكمة",
        topCustomers: "أفضل الزبائن حسب رقم الأعمال",
        customerDebts: "أكبر ديون الزبائن",
        supplierDebts: "أكبر ديون الموردين",
        overdueInvoices: "فواتير الزبائن المتأخرة",
        supplierDue: "مبالغ الموردين المفتوحة",
        inactiveProducts: "موديلات بدون مبيعات",
        payroll: "ملخص الرواتب",
        pieceWorkers: "إنتاج العمال بالدفع حسب القطعة",
        noData: "لا توجد بيانات في هذه الفترة",
        sourceNote:
          "المؤشرات محسوبة مباشرة من الفواتير، المدفوعات، المشتريات، الرواتب والمخزون.",
      }
    : {
        title: "Statistiques et analyse financière",
        subtitle:
          "Vue unifiée des ventes, charges, productions, stocks et dettes à partir des données réelles de l'atelier.",
        period: "Période",
        sales: "Ventes enregistrées",
        receipts: "Encaissements reçus",
        outflows: "Décaissements réels",
        cashFlow: "Flux de trésorerie net",
        customerDebt: "Créances clients",
        supplierDebt: "Dettes fournisseurs",
        currentCustomerDebt: "Créances clients actuelles",
        legacyCustomerDebt: "Créances clients antérieures",
        currentSupplierDebt: "Dettes fournisseurs actuelles",
        legacySupplierDebt: "Dettes fournisseurs antérieures",
        financial: "Évolution financière",
        financialHelp: "Ventes, encaissements et décaissements sur la période",
        expenses: "Répartition des charges",
        expensesHelp: "Salaires, achats et charges générales sans duplication",
        production: "Production et ventes",
        productionHelp:
          "Pièces produites comparées aux pièces vendues par mois",
        products: "Produits les plus vendus",
        productsHelp: "Quantités vendues et chiffre d'affaires par modèle",
        stock: "Stock des produits finis",
        stockHelp: "Quantités disponibles des modèles actifs",
        debts: "Évolution des créances et dettes",
        debtsHelp: "Créances clients et dettes fournisseurs cumulées",
        topCustomers: "Top clients par chiffre d'affaires",
        customerDebts: "Plus grandes créances clients",
        supplierDebts: "Plus grandes dettes fournisseurs",
        overdueInvoices: "Factures clients en retard",
        supplierDue: "Paiements fournisseurs ouverts",
        inactiveProducts: "Modèles sans vente",
        payroll: "Synthèse des salaires",
        pieceWorkers: "Production des travailleurs à la pièce",
        noData: "Aucune donnée pour cette période",
        sourceNote:
          "Les indicateurs sont calculés directement depuis les factures, paiements, achats, salaires et stocks.",
      };

  const moneyTooltip = (value: number | string) =>
    formatMoney(Number(value), lang);

  return (
    <PageBackground>
      <PageHeading
        title={text.title}
        subtitle={text.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: palette.muted }}>
              {text.period}
            </span>
            <Select
              value={String(months)}
              onValueChange={(value) => setMonths(Number(value))}
            >
              <SelectTrigger
                className="w-[155px] rounded-xl"
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                  color: palette.text,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">
                  {ar ? "آخر 6 أشهر" : "6 derniers mois"}
                </SelectItem>
                <SelectItem value="12">
                  {ar ? "آخر 12 شهراً" : "12 derniers mois"}
                </SelectItem>
                <SelectItem value="24">
                  {ar ? "آخر 24 شهراً" : "24 derniers mois"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mt-6">
        <StatePanel
          loading={loading}
          error={error}
          empty={false}
          emptyTitle={text.noData}
          onRetry={() => setRefreshKey((value) => value + 1)}
        />
      </div>

      {!loading && !error ? (
        <>
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              icon={Receipt}
              label={text.sales}
              value={formatMoney(dashboard.summary.sales, lang)}
            />
            <StatCard
              icon={HandCoins}
              label={text.receipts}
              value={formatMoney(dashboard.summary.receipts, lang)}
              color={colors.green}
              tint="rgba(77,138,106,0.12)"
            />
            <StatCard
              icon={BanknoteArrowDown}
              label={text.outflows}
              value={formatMoney(dashboard.summary.outflows, lang)}
              color={colors.red}
              tint="rgba(196,111,103,0.12)"
            />
            <StatCard
              icon={TrendingUp}
              label={text.cashFlow}
              value={formatMoney(dashboard.summary.estimatedCashFlow, lang)}
              color={
                dashboard.summary.estimatedCashFlow >= 0
                  ? colors.green
                  : colors.red
              }
              tint={
                dashboard.summary.estimatedCashFlow >= 0
                  ? "rgba(77,138,106,0.12)"
                  : "rgba(196,111,103,0.12)"
              }
            />
            <StatCard
              icon={CircleDollarSign}
              label={text.customerDebt}
              value={formatMoney(dashboard.summary.customerDebt, lang)}
              color={colors.gold}
              tint="rgba(195,154,91,0.15)"
            />
            <StatCard
              icon={AlertTriangle}
              label={text.supplierDebt}
              value={formatMoney(dashboard.summary.supplierDebt, lang)}
              color={colors.red}
              tint="rgba(196,111,103,0.12)"
            />
          </section>

          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DebtOriginCard
              label={text.currentCustomerDebt}
              value={dashboard.summary.currentCustomerDebt}
              lang={lang}
              tone="current"
            />
            <DebtOriginCard
              label={text.legacyCustomerDebt}
              value={dashboard.summary.legacyCustomerDebt}
              lang={lang}
              tone="legacy"
            />
            <DebtOriginCard
              label={text.currentSupplierDebt}
              value={dashboard.summary.currentSupplierDebt}
              lang={lang}
              tone="current"
            />
            <DebtOriginCard
              label={text.legacySupplierDebt}
              value={dashboard.summary.legacySupplierDebt}
              lang={lang}
              tone="legacy"
            />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartCard
              title={text.financial}
              subtitle={text.financialHelp}
              icon={<TrendingUp size={19} />}
            >
              <div className="h-full w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dashboard.financialTrend}
                    margin={{ top: 8, right: 10, left: 6, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={palette.border}
                      strokeDasharray="3 5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => formatMonth(value, lang)}
                      padding={{ left: 10, right: 10 }}
                      tick={{ fontSize: 11, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={compactMoney}
                      tick={{ fontSize: 10, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={54}
                    />
                    <Tooltip
                      formatter={moneyTooltip}
                      labelFormatter={(value) =>
                        formatMonth(String(value), lang, true)
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      isAnimationActive={false}
                      name={ar ? "المبيعات" : "Ventes"}
                      stroke={colors.teal}
                      strokeWidth={2.7}
                      dot={{ r: 2.5, strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="receipts"
                      isAnimationActive={false}
                      name={ar ? "التحصيلات" : "Encaissements"}
                      stroke={colors.green}
                      strokeWidth={2.4}
                      dot={{ r: 2.5, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="outflows"
                      isAnimationActive={false}
                      name={ar ? "المدفوعات" : "Décaissements"}
                      stroke={colors.red}
                      strokeWidth={2.4}
                      dot={{ r: 2.5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title={text.expenses}
              subtitle={text.expensesHelp}
              icon={<Receipt size={19} />}
            >
              <div className="h-full w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboard.expenseBreakdown}
                    margin={{ top: 8, right: 10, left: 6, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={palette.border}
                      strokeDasharray="3 5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => formatMonth(value, lang)}
                      padding={{ left: 10, right: 10 }}
                      tick={{ fontSize: 11, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={compactMoney}
                      tick={{ fontSize: 10, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={54}
                    />
                    <Tooltip
                      formatter={moneyTooltip}
                      labelFormatter={(value) =>
                        formatMonth(String(value), lang, true)
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 10.5, paddingTop: 12 }} />
                    <Bar
                      dataKey="salaries"
                      isAnimationActive={false}
                      name={ar ? "الرواتب" : "Salaires"}
                      stackId="charges"
                      fill={colors.teal}
                    />
                    <Bar
                      dataKey="materials"
                      isAnimationActive={false}
                      name={ar ? "المواد" : "Matières"}
                      stackId="charges"
                      fill={colors.gold}
                    />
                    <Bar
                      dataKey="rent"
                      isAnimationActive={false}
                      name={ar ? "الكراء" : "Loyer"}
                      stackId="charges"
                      fill={colors.blue}
                    />
                    <Bar
                      dataKey="maintenance"
                      isAnimationActive={false}
                      name={ar ? "الصيانة" : "Maintenance"}
                      stackId="charges"
                      fill={colors.green}
                    />
                    <Bar
                      dataKey="transport"
                      isAnimationActive={false}
                      name={ar ? "النقل" : "Transport"}
                      stackId="charges"
                      fill={colors.sand}
                    />
                    <Bar
                      dataKey="other"
                      isAnimationActive={false}
                      name={ar ? "أخرى" : "Autres"}
                      stackId="charges"
                      fill={colors.gray}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title={text.production}
              subtitle={text.productionHelp}
              icon={<Factory size={19} />}
            >
              <div className="h-full w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboard.productionSales}
                    margin={{ top: 8, right: 10, left: 6, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={palette.border}
                      strokeDasharray="3 5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => formatMonth(value, lang)}
                      padding={{ left: 10, right: 10 }}
                      tick={{ fontSize: 11, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        formatMonth(String(value), lang, true)
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    <Bar
                      dataKey="produced"
                      isAnimationActive={false}
                      name={ar ? "منتجة" : "Produites"}
                      fill={colors.teal}
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="sold"
                      isAnimationActive={false}
                      name={ar ? "مباعة" : "Vendues"}
                      fill={colors.gold}
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title={text.debts}
              subtitle={text.debtsHelp}
              icon={<CircleDollarSign size={19} />}
            >
              <div className="h-full w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dashboard.debtTrend}
                    margin={{ top: 8, right: 10, left: 6, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={palette.border}
                      strokeDasharray="3 5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => formatMonth(value, lang)}
                      padding={{ left: 10, right: 10 }}
                      tick={{ fontSize: 11, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={compactMoney}
                      tick={{ fontSize: 10, fill: palette.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={54}
                    />
                    <Tooltip
                      formatter={moneyTooltip}
                      labelFormatter={(value) =>
                        formatMonth(String(value), lang, true)
                      }
                      contentStyle={tooltipStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="customerDebt"
                      isAnimationActive={false}
                      name={ar ? "ديون الزبائن" : "Créances clients"}
                      stroke={colors.gold}
                      strokeWidth={2.6}
                      dot={{ r: 2.5, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="supplierDebt"
                      isAnimationActive={false}
                      name={ar ? "ديون الموردين" : "Dettes fournisseurs"}
                      stroke={colors.red}
                      strokeWidth={2.6}
                      dot={{ r: 2.5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title={text.products}
              subtitle={text.productsHelp}
              icon={<PackageCheck size={19} />}
            >
              <HorizontalProductBars
                data={dashboard.topProducts}
                lang={lang}
                emptyText={text.noData}
              />
            </ChartCard>

            <ChartCard
              title={text.stock}
              subtitle={text.stockHelp}
              icon={<Boxes size={19} />}
            >
              <StockBars
                data={dashboard.finishedStock}
                lang={lang}
                emptyText={text.noData}
              />
            </ChartCard>
          </div>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <InsightCard title={text.topCustomers} icon={<Users size={18} />}>
              {dashboard.insights.topCustomers.length ? (
                dashboard.insights.topCustomers.map((item, index) => (
                  <ClickableRow
                    key={item.id}
                    onClick={() => navigate(`/customer-profile/${item.id}`)}
                  >
                    <RowIdentity
                      rank={index + 1}
                      title={item.fullName}
                      subtitle={`${item.salesCount} ${ar ? "عملية بيع" : "ventes"}`}
                    />
                    <Money value={item.revenue} lang={lang} />
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>

            <InsightCard
              title={text.customerDebts}
              icon={<CircleDollarSign size={18} />}
              tone="warning"
            >
              {dashboard.insights.customerDebts.length ? (
                dashboard.insights.customerDebts.map((item, index) => (
                  <ClickableRow
                    key={item.id}
                    onClick={() => navigate(`/customer-profile/${item.id}`)}
                  >
                    <RowIdentity
                      rank={index + 1}
                      title={item.fullName}
                      subtitle={item.phone || "—"}
                    />
                    <Money value={item.debt} lang={lang} danger />
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>

            <InsightCard
              title={text.supplierDebts}
              icon={<AlertTriangle size={18} />}
              tone="warning"
            >
              {dashboard.insights.supplierDebts.length ? (
                dashboard.insights.supplierDebts.map((item, index) => (
                  <ClickableRow
                    key={item.id}
                    onClick={() => navigate(`/suppliers/${item.id}`)}
                  >
                    <RowIdentity
                      rank={index + 1}
                      title={item.name}
                      subtitle={item.phone || "—"}
                    />
                    <Money value={item.debt} lang={lang} danger />
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>

            <InsightCard
              title={text.overdueInvoices}
              icon={<Receipt size={18} />}
              tone="warning"
            >
              {dashboard.insights.overdueInvoices.length ? (
                dashboard.insights.overdueInvoices.map((item) => (
                  <ClickableRow
                    key={item.id}
                    onClick={() => navigate("/sales")}
                  >
                    <RowIdentity
                      title={item.invoiceNumber}
                      subtitle={`${item.customerName} · ${formatDate(item.dueDate, lang)}`}
                    />
                    <div className="text-end">
                      <Money value={item.remainingAmount} lang={lang} danger />
                      <Badge
                        variant="outline"
                        className="mt-1 border-red-200 bg-red-50 text-red-700"
                      >
                        {item.daysOverdue} {ar ? "يوم" : "j"}
                      </Badge>
                    </div>
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>

            <InsightCard
              title={text.supplierDue}
              icon={<BanknoteArrowDown size={18} />}
            >
              {dashboard.insights.supplierPaymentsDue.length ? (
                dashboard.insights.supplierPaymentsDue.map((item) => (
                  <ClickableRow
                    key={item.purchaseId}
                    onClick={() => navigate(`/suppliers/${item.supplierId}`)}
                  >
                    <RowIdentity
                      title={item.supplierName}
                      subtitle={`${item.materialName} · ${formatDate(item.purchaseDate, lang)}`}
                    />
                    <div className="text-end">
                      <Money value={item.remainingAmount} lang={lang} />
                      <span
                        className="mt-1 block"
                        style={{
                          fontSize: 10.5,
                          color:
                            item.status === "OLD" ? colors.red : palette.muted,
                        }}
                      >
                        {item.daysOpen} {ar ? "يوم مفتوح" : "jours ouverts"}
                      </span>
                    </div>
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>

            <InsightCard
              title={text.inactiveProducts}
              icon={<Boxes size={18} />}
            >
              {dashboard.insights.inactiveProducts.length ? (
                dashboard.insights.inactiveProducts.map((item) => (
                  <ClickableRow
                    key={item.productId}
                    onClick={() => navigate("/stock")}
                  >
                    <RowIdentity
                      title={item.name}
                      subtitle={
                        item.lastSaleDate
                          ? `${ar ? "آخر بيع" : "Dernière vente"}: ${formatDate(item.lastSaleDate, lang)}`
                          : ar
                            ? "لم يبع بعد"
                            : "Jamais vendu"
                      }
                    />
                    <div className="text-end">
                      <Metric
                        value={`${item.quantityAvailable}`}
                        label={ar ? "متوفر" : "en stock"}
                      />
                      <span
                        style={{
                          fontSize: 10.5,
                          color:
                            item.level === "60_DAYS" ? colors.red : colors.gold,
                        }}
                      >
                        {item.inactiveDays} {ar ? "يوم" : "jours"}
                      </span>
                    </div>
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>

            <InsightCard title={text.payroll} icon={<HandCoins size={18} />}>
              <button
                type="button"
                onClick={() => navigate("/salary")}
                className="grid w-full grid-cols-2 gap-3 text-start"
              >
                <SummaryBox
                  label={ar ? "المستحق" : "Total dû"}
                  value={formatMoney(dashboard.insights.payroll.totalDue, lang)}
                />
                <SummaryBox
                  label={ar ? "المدفوع" : "Payé"}
                  value={formatMoney(
                    dashboard.insights.payroll.totalPaid,
                    lang,
                  )}
                  color={colors.green}
                />
                <SummaryBox
                  label={ar ? "المتبقي" : "Reste"}
                  value={formatMoney(
                    dashboard.insights.payroll.totalRemaining,
                    lang,
                  )}
                  color={colors.red}
                />
                <SummaryBox
                  label={ar ? "عدد الرواتب" : "Paies"}
                  value={String(dashboard.insights.payroll.payrollCount)}
                />
              </button>
            </InsightCard>

            <InsightCard title={text.pieceWorkers} icon={<Factory size={18} />}>
              {dashboard.insights.pieceWorkers.length ? (
                dashboard.insights.pieceWorkers.map((item, index) => (
                  <ClickableRow
                    key={item.workerId}
                    onClick={() =>
                      navigate(`/worker-profile?workerId=${item.workerId}`)
                    }
                  >
                    <RowIdentity
                      rank={index + 1}
                      title={item.workerName}
                      subtitle={formatMoney(item.amount, lang)}
                    />
                    <Metric
                      value={String(item.pieces)}
                      label={ar ? "قطعة" : "pièces"}
                    />
                  </ClickableRow>
                ))
              ) : (
                <EmptyState text={text.noData} />
              )}
            </InsightCard>
          </section>

          <div
            className="mt-5 rounded-2xl border px-4 py-3"
            style={{
              borderColor: palette.border,
              backgroundColor: "var(--app-translucent-surface)",
              color: palette.muted,
              fontSize: 11.5,
            }}
          >
            {text.sourceNote} {ar ? "المصادر" : "Sources"}:{" "}
            {dashboard.sourceCounts.invoices} {ar ? "فاتورة" : "factures"},{" "}
            {dashboard.sourceCounts.purchases} {ar ? "شراء" : "achats"},{" "}
            {dashboard.sourceCounts.payrolls} {ar ? "راتب" : "paies"},{" "}
            {dashboard.sourceCounts.manualExpenses}{" "}
            {ar ? "مصروف عام" : "charges générales"}.
          </div>
        </>
      ) : null}
    </PageBackground>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0 rounded-[22px] border p-5"
      style={{
        borderColor: palette.border,
        backgroundColor: palette.surface,
        boxShadow: "0 14px 34px -30px rgba(18,60,74,0.55)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: palette.primary,
            backgroundColor: "rgba(18,60,74,0.08)",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 style={{ fontSize: 15.5, fontWeight: 900, color: palette.text }}>
            {title}
          </h2>
          <p
            className="mt-0.5"
            style={{ fontSize: 11.5, color: palette.muted }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-5 h-[310px] min-w-0">{children}</div>
    </section>
  );
}

function InsightCard({
  title,
  icon,
  tone = "normal",
  children,
}: {
  title: string;
  icon: ReactNode;
  tone?: "normal" | "warning";
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0 rounded-[22px] border p-4"
      style={{
        borderColor:
          tone === "warning" ? "rgba(196,111,103,0.24)" : palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <div
        className="flex items-center gap-2 border-b pb-3"
        style={{ borderColor: palette.border }}
      >
        <span
          style={{
            color: tone === "warning" ? colors.red : palette.primary,
          }}
        >
          {icon}
        </span>
        <h3 style={{ fontSize: 14, fontWeight: 900, color: palette.text }}>
          {title}
        </h3>
      </div>
      <div className="mt-2 flex max-h-[330px] flex-col overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

function HorizontalProductBars({
  data,
  lang,
  emptyText,
}: {
  data: AnalyticsDashboard["topProducts"];
  lang: "ar" | "fr";
  emptyText: string;
}) {
  if (!data.length) return <EmptyState text={emptyText} fill />;
  const max = Math.max(...data.map((item) => item.quantity), 1);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pe-1">
      {data.map((item, index) => (
        <div key={`${item.productId ?? "snapshot"}-${item.productName}`}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span
              className="truncate"
              style={{ fontSize: 12.5, fontWeight: 800 }}
            >
              <span style={{ color: colors.gold }}>#{index + 1}</span>{" "}
              {item.productName}
            </span>
            <span
              className="shrink-0"
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: palette.primary,
              }}
            >
              {item.quantity} · {formatMoney(item.revenue, lang)}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full"
            style={{ backgroundColor: palette.bg }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, (item.quantity / max) * 100)}%`,
                background: `linear-gradient(90deg, ${colors.teal}, ${colors.gold})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StockBars({
  data,
  lang,
  emptyText,
}: {
  data: AnalyticsDashboard["finishedStock"];
  lang: "ar" | "fr";
  emptyText: string;
}) {
  if (!data.length) return <EmptyState text={emptyText} fill />;
  const max = Math.max(...data.map((item) => item.quantityAvailable), 1);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pe-1">
      {data.map((item) => (
        <div key={item.productId}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span
              className="truncate"
              style={{ fontSize: 12.5, fontWeight: 800 }}
            >
              {item.name}
            </span>
            <span
              className="shrink-0"
              style={{ fontSize: 11.5, color: palette.muted }}
            >
              {item.quantityAvailable} {lang === "ar" ? "قطعة" : "pièces"}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full"
            style={{ backgroundColor: palette.bg }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, (item.quantityAvailable / max) * 100)}%`,
                backgroundColor:
                  item.quantityAvailable > 0 ? colors.green : colors.red,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ClickableRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-start transition-colors hover:bg-black/[0.025]"
      style={{ borderBottom: `1px solid ${palette.border}` }}
    >
      {children}
    </button>
  );
}

function RowIdentity({
  rank,
  title,
  subtitle,
}: {
  rank?: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {rank ? (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: rank === 1 ? palette.accentSoft : palette.bg,
            color: rank === 1 ? colors.gold : palette.primary,
            fontSize: 11.5,
            fontWeight: 900,
          }}
        >
          {rank}
        </span>
      ) : null}
      <div className="min-w-0">
        <div
          className="truncate"
          style={{ fontSize: 12.5, fontWeight: 800, color: palette.text }}
        >
          {title}
        </div>
        <div
          className="mt-0.5 truncate"
          style={{ fontSize: 10.5, color: palette.muted }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function Money({
  value,
  lang,
  danger = false,
}: {
  value: number;
  lang: "ar" | "fr";
  danger?: boolean;
}) {
  return (
    <span
      className="shrink-0"
      style={{
        fontSize: 12,
        fontWeight: 900,
        color: danger ? colors.red : palette.primary,
      }}
    >
      {formatMoney(value, lang)}
    </span>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="shrink-0 text-end">
      <div style={{ fontSize: 13, fontWeight: 900, color: palette.primary }}>
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: palette.muted }}>{label}</div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  color = palette.primary,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: palette.bg }}>
      <div style={{ fontSize: 10.5, color: palette.muted }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 13, fontWeight: 900, color }}>
        {value}
      </div>
    </div>
  );
}

function DebtOriginCard({
  label,
  value,
  lang,
  tone,
}: {
  label: string;
  value: number;
  lang: "ar" | "fr";
  tone: "current" | "legacy";
}) {
  const legacy = tone === "legacy";
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: legacy ? "rgba(195,154,91,0.28)" : palette.border,
        backgroundColor: legacy ? "rgba(195,154,91,0.09)" : palette.surface,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span style={{ color: palette.muted, fontSize: 11.5 }}>{label}</span>
        <Badge
          variant="outline"
          style={{
            borderColor: legacy ? "rgba(195,154,91,0.35)" : palette.border,
            color: legacy ? colors.gold : palette.primary,
          }}
        >
          {legacy
            ? lang === "ar"
              ? "رصيد سابق"
              : "Solde antérieur"
            : lang === "ar"
              ? "حالي"
              : "Actuel"}
        </Badge>
      </div>
      <div className="mt-1" style={{ color: legacy ? colors.gold : palette.text, fontSize: 18, fontWeight: 900 }}>
        {formatMoney(value, lang)}
      </div>
    </div>
  );
}

function EmptyState({ text, fill = false }: { text: string; fill?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center text-center ${fill ? "h-full" : "min-h-24"}`}
      style={{ color: palette.muted, fontSize: 12 }}
    >
      {text}
    </div>
  );
}

function formatMonth(value: string, lang: string, long = false) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString(
    lang === "ar" ? "ar-DZ" : "fr-DZ",
    {
      month: long ? "long" : "short",
      year: long ? "numeric" : undefined,
    },
  );
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("fr-DZ", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const tooltipStyle = {
  border: `1px solid ${palette.border}`,
  borderRadius: 12,
  backgroundColor: palette.surfaceElevated,
  color: palette.text,
  boxShadow: "0 12px 30px rgba(18,60,74,0.12)",
  fontSize: 11.5,
};
