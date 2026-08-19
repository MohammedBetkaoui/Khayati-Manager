import { FilePlus2, Hammer, PackageCheck, AlarmClockOff, Coins } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { palette, prodText } from "../../pages/production-data";
import { useLanguage } from "../../language-context";

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
  newCount,
  inProduction,
  ready,
  late,
  monthCost,
}: {
  newCount: number;
  inProduction: number;
  ready: number;
  late: number;
  monthCost: string;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang].summary;
  const fr = prodText.fr.summary;

  const items: Item[] = [
    {
      key: "new",
      icon: FilePlus2,
      label: t.new,
      value: String(newCount),
      helper: t.newHelp,
      frHelper: fr.new,
      tint: "rgba(107,138,160,0.14)",
      color: "#5a778c",
    },
    {
      key: "prod",
      icon: Hammer,
      label: t.prod,
      value: String(inProduction),
      helper: t.prodHelp,
      frHelper: fr.prod,
      tint: "rgba(18,60,74,0.08)",
      color: palette.primary,
    },
    {
      key: "ready",
      icon: PackageCheck,
      label: t.ready,
      value: String(ready),
      helper: t.readyHelp,
      frHelper: fr.ready,
      tint: "rgba(77,138,106,0.12)",
      color: "#4d8a6a",
    },
    {
      key: "late",
      icon: AlarmClockOff,
      label: t.late,
      value: String(late),
      helper: t.lateHelp,
      frHelper: fr.late,
      tint: "rgba(201,138,134,0.16)",
      color: "#b46a66",
    },
    {
      key: "cost",
      icon: Coins,
      label: t.cost,
      value: monthCost,
      helper: t.costHelp,
      frHelper: fr.cost,
      tint: "rgba(195,154,91,0.16)",
      color: "#a87d3c",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
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
              padding: 16,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: it.tint, color: it.color }}
              >
                <Icon size={20} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div style={{ fontSize: 12.5, color: palette.muted, fontWeight: 500 }}>{it.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: palette.text, lineHeight: 1.25 }}>
                  {it.value}
                </div>
              </div>
            </div>
            <div
              className="mt-3 pt-2.5"
              style={{ borderTop: `1px solid ${palette.border}`, fontSize: 11.5, color: palette.muted, lineHeight: 1.5 }}
            >
              {lang === "ar" ? it.helper : it.frHelper}
            </div>
          </div>
        );
      })}
    </div>
  );
}
