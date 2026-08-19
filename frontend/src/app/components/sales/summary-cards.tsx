import { useLanguage } from "../../language-context";
import { palette, salesText } from "../../pages/sales-data";
import { Coins, CalendarDays, AlertCircle, FileText, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

export function SummaryCards({
  todaySales,
  monthSales,
  unpaidCount,
  remainingAmount,
  invoiceCount,
}: {
  todaySales: string;
  monthSales: string;
  unpaidCount: number;
  remainingAmount: string;
  invoiceCount: number;
}) {
  const { lang } = useLanguage();
  const t = salesText[lang].summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card
        title={t.today}
        subtitle={t.todayHelp}
        value={todaySales}
        icon={Coins}
        color="#a87d3c"
        tint="rgba(168, 125, 60, 0.12)"
      />
      <Card
        title={t.month}
        subtitle={t.monthHelp}
        value={monthSales}
        icon={CalendarDays}
        color={palette.primary}
        tint="rgba(18, 60, 74, 0.08)"
      />
      <Card
        title={t.unpaid}
        subtitle={t.unpaidHelp}
        value={unpaidCount.toString()}
        icon={AlertCircle}
        color="#b46a66"
        tint="rgba(180, 106, 102, 0.12)"
      />
      <Card
        title={t.remaining}
        subtitle={t.remainingHelp}
        value={remainingAmount}
        icon={CreditCard}
        color="#b46a66"
        tint="rgba(180, 106, 102, 0.12)"
      />
      <Card
        title={t.count}
        subtitle={t.countHelp}
        value={invoiceCount.toString()}
        icon={FileText}
        color="#6b8aa0"
        tint="rgba(107, 138, 160, 0.12)"
      />
    </div>
  );
}
