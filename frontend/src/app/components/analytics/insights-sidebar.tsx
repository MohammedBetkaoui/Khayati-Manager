import { Lightbulb, AlertCircle, CheckCircle2 } from "lucide-react";
import { palette, analyticsText } from "../../pages/analytics-data";
import { useLanguage } from "../../language-context";

function Section({
  title,
  items,
  color,
  bg,
  icon: Icon,
}: {
  title: string;
  items: string[];
  color: string;
  bg: string;
  icon: typeof Lightbulb;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{title}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-start gap-2.5 rounded-xl border p-3" style={{ backgroundColor: bg, borderColor: `${color}30` }}>
            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: palette.text }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsSidebar({
  insights,
  alerts,
  actions,
}: {
  insights: string[];
  alerts: string[];
  actions: string[];
}) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].insights;
  const fallback = lang === "ar" ? ["لا توجد مؤشرات كافية حالياً."] : ["Aucun indicateur disponible pour le moment."];

  return (
    <div className="flex h-full flex-col">
      <Section title={t.quickInsights} items={insights.length ? insights : fallback} icon={Lightbulb} color={palette.primary} bg={`${palette.primary}08`} />
      <Section title={t.alerts} items={alerts.length ? alerts : fallback} icon={AlertCircle} color="#a87d3c" bg="rgba(168, 125, 60, 0.08)" />
      <Section title={t.actions} items={actions.length ? actions : fallback} icon={CheckCircle2} color="#4d8a6a" bg="rgba(77, 138, 106, 0.08)" />
    </div>
  );
}
