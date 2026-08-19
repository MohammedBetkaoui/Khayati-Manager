import { Boxes, AlertTriangle, Wallet, ArrowLeftRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { stockText } from "../../pages/stock-data";

type Item = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  frHelper: string;
  tint: string;
  color: string;
};

export function SummaryCards({
  total,
  low,
  value,
  moves,
}: {
  total: number;
  low: number;
  value: string;
  moves: number;
}) {
  const { lang } = useLanguage();
  const t = stockText[lang].summary;
  const fr = stockText.fr.summary;

  const items: Item[] = [
    {
      key: "total",
      icon: Boxes,
      label: t.total,
      value: String(total),
      helper: t.totalHelp,
      frHelper: fr.total,
      tint: "rgba(18,60,74,0.08)",
      color: palette.primary,
    },
    {
      key: "low",
      icon: AlertTriangle,
      label: t.low,
      value: String(low),
      helper: t.lowHelp,
      frHelper: fr.low,
      tint: "rgba(195,154,91,0.16)",
      color: "#a87d3c",
    },
    {
      key: "value",
      icon: Wallet,
      label: t.value,
      value: value,
      helper: t.valueHelp,
      frHelper: fr.value,
      tint: "rgba(77,138,106,0.12)",
      color: "#4d8a6a",
    },
    {
      key: "moves",
      icon: ArrowLeftRight,
      label: t.moves,
      value: String(moves),
      helper: t.movesHelp,
      frHelper: fr.moves,
      tint: "rgba(201,138,134,0.14)",
      color: "#b46a66",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.key}
            style={{
              backgroundColor: palette.surface,
              borderRadius: 18,
              border: `1px solid ${palette.border}`,
              boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
              padding: 18,
            }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: it.tint, color: it.color }}
              >
                <Icon size={22} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div style={{ fontSize: 13, color: palette.muted, fontWeight: 500 }}>{it.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: palette.text, lineHeight: 1.25 }}>
                  {it.value}
                </div>
                {lang === "ar" ? (
                  <div style={{ fontSize: 11, color: palette.muted }}>{it.frHelper}</div>
                ) : null}
              </div>
            </div>
            <div
              className="mt-3 pt-3"
              style={{ borderTop: `1px solid ${palette.border}`, fontSize: 12, color: palette.muted, lineHeight: 1.5 }}
            >
              {it.helper}
            </div>
          </div>
        );
      })}
    </div>
  );
}
