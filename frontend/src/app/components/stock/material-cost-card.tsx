import { Coins, TrendingUp, Receipt, ArrowLeft, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { stockText } from "../../pages/stock-data";

function Line({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2" style={{ color: palette.muted, fontSize: 13 }}>
        <Icon size={16} strokeWidth={1.9} />
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{value}</span>
    </div>
  );
}

export function MaterialCostCard({
  monthCost,
  topMaterial,
  averageOrderCost,
}: {
  monthCost: number;
  topMaterial: string;
  averageOrderCost: number;
}) {
  const { lang, dir } = useLanguage();
  const t = stockText[lang].cost;
  const cur = stockText[lang].currency;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div
      className="flex flex-col items-center justify-between gap-6 lg:flex-row"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        padding: "16px 24px",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(195,154,91,0.16)", color: "#a87d3c" }}
        >
          <Coins size={22} strokeWidth={1.9} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: palette.text, lineHeight: 1.35 }}>{t.title}</div>
          <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2 }}>{t.subtitle}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 lg:gap-10">
        <Line icon={Coins} label={t.monthCost} value={`${monthCost.toLocaleString()} ${cur}`} />
        <div style={{ width: 1, height: 24, backgroundColor: palette.border }} className="hidden lg:block" />
        <Line icon={TrendingUp} label={t.topMaterial} value={topMaterial || (lang === "ar" ? "لا توجد بيانات" : "Aucune donnee")} />
        <div style={{ width: 1, height: 24, backgroundColor: palette.border }} className="hidden lg:block" />
        <Line icon={Receipt} label={t.avgOrder} value={`${averageOrderCost.toLocaleString()} ${cur}`} />
      </div>

      <button
        type="button"
        className="flex items-center justify-center gap-1.5 px-4 transition-colors hover:opacity-90"
        style={{
          height: 38,
          borderRadius: 12,
          backgroundColor: palette.bg,
          border: `1px solid ${palette.border}`,
          color: palette.primary,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {t.details}
        <Arrow size={15} />
      </button>
    </div>
  );
}
