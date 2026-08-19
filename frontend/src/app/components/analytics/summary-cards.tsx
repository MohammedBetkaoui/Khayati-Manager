import { TrendingUp, Wallet, Receipt, Clock, UserCheck, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "../../language-context";
import { palette, analyticsText } from "../../pages/analytics-data";

export type AnalyticsSummaryMetrics = {
  sales: number;
  profits: number;
  expenses: number;
  delayed: number;
  topWorker: string;
  topProduct: string;
};

type CardProps = {
  title: string;
  subtitle: string;
  value: string;
  icon: LucideIcon;
  color: string;
  tint: string;
};

function Card({ title, subtitle, value, icon: Icon, color, tint }: CardProps) {
  return (
    <div
      className="flex flex-col justify-between"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.12)",
        padding: "18px 20px",
        minHeight: 110,
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint, color }}
        >
          <Icon size={22} strokeWidth={1.9} />
        </div>
        <div style={{ textAlign: "end" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: palette.text, lineHeight: 1.1 }}>{value}</div>
        </div>
      </div>
      <div className="mt-4">
        <div style={{ fontSize: 13.5, fontWeight: 700, color: palette.text }}>{title}</div>
        <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

export function SummaryCards({ metrics }: { metrics: AnalyticsSummaryMetrics }) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].summary;
  const cur = analyticsText[lang].currency;
  const noDataText = lang === "ar" ? "لا توجد بيانات" : "Aucune donnee";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card
        title={t.sales}
        subtitle={t.salesHelp}
        value={`${metrics.sales.toLocaleString()} ${cur}`}
        icon={TrendingUp}
        color={palette.primary}
        tint="rgba(18, 60, 74, 0.08)"
      />
      <Card
        title={t.profits}
        subtitle={t.profitsHelp}
        value={`${metrics.profits.toLocaleString()} ${cur}`}
        icon={Wallet}
        color="#4d8a6a"
        tint="rgba(77, 138, 106, 0.12)"
      />
      <Card
        title={t.expenses}
        subtitle={t.expensesHelp}
        value={`${metrics.expenses.toLocaleString()} ${cur}`}
        icon={Receipt}
        color="#b46a66"
        tint="rgba(180, 106, 102, 0.12)"
      />
      <Card
        title={t.delayed}
        subtitle={t.delayedHelp}
        value={String(metrics.delayed)}
        icon={Clock}
        color="#a87d3c"
        tint="rgba(168, 125, 60, 0.12)"
      />
      <Card
        title={t.topWorker}
        subtitle={t.topWorkerHelp}
        value={metrics.topWorker || noDataText}
        icon={UserCheck}
        color="#6b8aa0"
        tint="rgba(107, 138, 160, 0.12)"
      />
      <Card
        title={t.topProduct}
        subtitle={t.topProductHelp}
        value={metrics.topProduct || noDataText}
        icon={ShoppingBag}
        color={palette.accent}
        tint="rgba(195, 154, 91, 0.12)"
      />
    </div>
  );
}
