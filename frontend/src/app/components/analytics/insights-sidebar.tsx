import { Lightbulb, AlertCircle, CheckCircle2 } from "lucide-react";
import { palette, analyticsText } from "../../pages/analytics-data";
import { useLanguage } from "../../language-context";

export function InsightsSidebar() {
  const { lang } = useLanguage();
  const t = analyticsText[lang].insights;

  const insights = lang === "ar" ? [
    "فستان السهرة هو المنتج الأكثر مبيعاً هذا الشهر بنسبة 45%.",
    "أحمد هو العامل الأكثر إنتاجاً خلال آخر 30 يوماً.",
    "الجمعة هو أكثر يوم نشاطاً في استقبال الطلبيات."
  ] : [
    "La robe de soirée est le produit le plus vendu (45%).",
    "Ahmed est l'employé le plus productif ce mois-ci.",
    "Le vendredi est le jour le plus actif pour les commandes."
  ];

  const alerts = lang === "ar" ? [
    "انخفاض الربح الصافي بنسبة 5% مقارنة بالشهر الماضي.",
    "وجود 4 طلبيات متأخرة يجب تسليمها.",
    "ارتفاع مصاريف الصيانة هذا الأسبوع بشكل ملحوظ."
  ] : [
    "Baisse du bénéfice net de 5% par rapport au mois dernier.",
    "4 commandes en retard à livrer d'urgence.",
    "Hausse significative des frais de maintenance cette semaine."
  ];

  const actions = lang === "ar" ? [
    "زيادة إنتاج الفساتين الجاهزة لتلبية الطلب المرتفع.",
    "إعادة توزيع مهام الكي على العمال الأقل نشاطاً.",
    "مراجعة أسباب تأخر طلبيات الزي المدرسي لتجنبها مستقبلاً."
  ] : [
    "Augmenter la production de robes pour répondre à la demande.",
    "Redistribuer les tâches de repassage aux employés moins actifs.",
    "Analyser les causes de retard des uniformes scolaires."
  ];

  const Section = ({ title, items, icon: Icon, color, bg }: any) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{title}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item: string, i: number) => (
          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ backgroundColor: bg, borderColor: `${color}30` }}>
            <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: palette.text }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Section title={t.quickInsights} items={insights} icon={Lightbulb} color={palette.primary} bg={`${palette.primary}08`} />
      <Section title={t.alerts} items={alerts} icon={AlertCircle} color="#a87d3c" bg="rgba(168, 125, 60, 0.08)" />
      <Section title={t.actions} items={actions} icon={CheckCircle2} color="#4d8a6a" bg="rgba(77, 138, 106, 0.08)" />
    </div>
  );
}
