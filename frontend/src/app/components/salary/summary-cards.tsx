import { useLanguage } from "../../language-context";
import { palette, salaryText } from "../../pages/salary-data";
import { WalletCards, HandCoins, AlertCircle, Banknote, PlusCircle } from "lucide-react";
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
  totalSalaries,
  paidSalaries,
  unpaidSalaries,
  totalAdvances,
  netBonuses,
}: {
  totalSalaries: string;
  paidSalaries: string;
  unpaidSalaries: string;
  totalAdvances: string;
  netBonuses: string;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang].summary;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card
        title={t.total}
        subtitle={t.totalHelp}
        value={totalSalaries}
        icon={WalletCards}
        color={palette.primary}
        tint="rgba(18, 60, 74, 0.08)"
      />
      <Card
        title={t.paid}
        subtitle={t.paidHelp}
        value={paidSalaries}
        icon={HandCoins}
        color="#4d8a6a"
        tint="rgba(77, 138, 106, 0.12)"
      />
      <Card
        title={t.unpaid}
        subtitle={t.unpaidHelp}
        value={unpaidSalaries}
        icon={AlertCircle}
        color="#b46a66"
        tint="rgba(180, 106, 102, 0.12)"
      />
      <Card
        title={t.advances}
        subtitle={t.advancesHelp}
        value={totalAdvances}
        icon={Banknote}
        color="#a87d3c"
        tint="rgba(168, 125, 60, 0.12)"
      />
      <Card
        title={t.bonuses}
        subtitle={t.bonusesHelp}
        value={netBonuses}
        icon={PlusCircle}
        color="#6b8aa0"
        tint="rgba(107, 138, 160, 0.12)"
      />
    </div>
  );
}
