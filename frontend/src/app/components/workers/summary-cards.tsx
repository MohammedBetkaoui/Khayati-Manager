import { Users, UserCheck, UserX, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { workersText } from "../../pages/workers-data";

type Item = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tint: string;
  color: string;
};

export function SummaryCards({
  total,
  present,
  absent,
  pieces,
}: {
  total: number;
  present: number;
  absent: number;
  pieces: number;
}) {
  const { lang } = useLanguage();
  const t = workersText[lang];

  const items: Item[] = [
    {
      key: "total",
      icon: Users,
      label: t.summary.total,
      value: String(total),
      helper: workersText.fr.summary.total,
      tint: "rgba(18,60,74,0.08)",
      color: palette.primary,
    },
    {
      key: "present",
      icon: UserCheck,
      label: t.summary.present,
      value: String(present),
      helper: workersText.fr.summary.present,
      tint: "rgba(77,138,106,0.12)",
      color: "#4d8a6a",
    },
    {
      key: "absent",
      icon: UserX,
      label: t.summary.absent,
      value: String(absent),
      helper: workersText.fr.summary.absent,
      tint: "rgba(201,138,134,0.14)",
      color: "#b46a66",
    },
    {
      key: "pieces",
      icon: Package,
      label: t.summary.pieces,
      value: pieces.toLocaleString(),
      helper: workersText.fr.summary.pieces,
      tint: "rgba(195,154,91,0.14)",
      color: "#a87d3c",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.key}
            className="flex items-center gap-3.5"
            style={{
              backgroundColor: palette.surface,
              borderRadius: 18,
              border: `1px solid ${palette.border}`,
              boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
              padding: 18,
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: it.tint, color: it.color }}
            >
              <Icon size={22} strokeWidth={1.9} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 13, color: palette.muted, fontWeight: 500 }}>{it.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: palette.text, lineHeight: 1.2 }}>
                {it.value}
              </div>
              {lang === "ar" ? (
                <div style={{ fontSize: 11, color: palette.muted }}>{it.helper}</div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
