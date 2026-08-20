import { Banknote, CircleDollarSign, HandCoins, UsersRound, WalletCards } from "lucide-react";
import { useLanguage } from "../../language-context";
import { money, palette, type DashboardStats } from "../../pages/salary-data";

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  const { lang } = useLanguage();
  const cards = [
    { label: lang === "ar" ? "العمال النشطون" : "Travailleurs actifs", value: String(stats.activeWorkers), icon: UsersRound, color: palette.primary },
    { label: lang === "ar" ? "رواتب هذا الأسبوع" : "Salaires de la semaine", value: money(stats.salariesDueThisWeek, lang), icon: WalletCards, color: "#a87d3c" },
    { label: lang === "ar" ? "المدفوع هذا الأسبوع" : "Payé cette semaine", value: money(stats.paidThisWeek, lang), icon: Banknote, color: "#4d8a6a" },
    { label: lang === "ar" ? "المتبقي للدفع" : "Reste à payer", value: money(stats.remainingToPay, lang), icon: CircleDollarSign, color: "#b46a66" },
    { label: lang === "ar" ? "سلف جارية" : "Avances en cours", value: String(stats.activeAdvances), icon: HandCoins, color: "#c07d4f" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          style={{
            minHeight: 122,
            borderRadius: 18,
            border: `1px solid ${palette.border}`,
            background: `linear-gradient(145deg, ${palette.surface}, ${color}0b)`,
            padding: 16,
            boxShadow: "0 8px 24px -22px rgba(18,60,74,.5)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontSize: 12.5, color: palette.muted }}>{label}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}14` }}>
              <Icon size={16} />
            </span>
          </div>
          <div className="mt-4" style={{ fontSize: 19, fontWeight: 800, color: palette.text }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
