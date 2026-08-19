import {
  AlarmClockOff,
  Coins,
  FilePlus2,
  Hammer,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "../../language-context";
import {
  palette,
  productionText,
  type DashboardStats,
} from "../../pages/production-data";

type CardItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  tint: string;
};

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  const { lang } = useLanguage();
  const text = productionText[lang];
  const items: CardItem[] = [
    {
      key: "new",
      icon: FilePlus2,
      label: text.cards.new,
      value: String(stats.newOrders),
      accent: "#5a778c",
      tint: "rgba(107,138,160,.14)",
    },
    {
      key: "production",
      icon: Hammer,
      label: text.cards.production,
      value: String(stats.inProduction),
      accent: palette.primary,
      tint: "rgba(18,60,74,.09)",
    },
    {
      key: "ready",
      icon: PackageCheck,
      label: text.cards.ready,
      value: String(stats.ready),
      accent: "#4d8a6a",
      tint: "rgba(77,138,106,.13)",
    },
    {
      key: "late",
      icon: AlarmClockOff,
      label: text.cards.late,
      value: String(stats.late),
      accent: "#b46a66",
      tint: "rgba(180,106,102,.14)",
    },
    {
      key: "cost",
      icon: Coins,
      label: text.cards.cost,
      value: `${stats.monthlyCost.toLocaleString()} ${text.currency}`,
      accent: "#a87d3c",
      tint: "rgba(168,125,60,.14)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 18,
              boxShadow: "0 8px 24px -20px rgba(18,60,74,.38)",
              padding: 16,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: item.tint,
                  color: item.accent,
                }}
              >
                <Icon size={20} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div
                  className="truncate"
                  style={{
                    color: palette.muted,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    color: palette.text,
                    fontSize: item.key === "cost" ? 18 : 23,
                    fontWeight: 800,
                    lineHeight: 1.3,
                  }}
                >
                  {item.value}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
