import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";


import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";

import { palette, analyticsText } from "./analytics-data";
import { SummaryCards } from "../components/analytics/summary-cards";
import { ActionBar } from "../components/analytics/action-bar";
import { InsightsSidebar } from "../components/analytics/insights-sidebar";
import { ReportModal } from "../components/analytics/report-modal";
import { 
  SalesProfitChart, 
  ExpensesRevChart, 
  TopList, 
  DelayedOrdersTable 
} from "../components/analytics/charts-and-lists";

export function AnalyticsPage() {
  const { lang, dir } = useLanguage();
  const t = analyticsText[lang];
  const navigate = useNavigate();

  const [tab, setTab] = useState<string>("overview");
  const [reportOpen, setReportOpen] = useState(false);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs = [
    { id: "overview", label: t.tabs.overview },
    { id: "salesProfits", label: t.tabs.salesProfits },
    { id: "workersProd", label: t.tabs.workersProd },
    { id: "stockMat", label: t.tabs.stockMat },
    { id: "orders", label: t.tabs.orders },
    { id: "detailed", label: t.tabs.detailed },
  ];

  // Mock Top Products
  const topProducts = [
    { name: lang === "ar" ? "فستان سهرة" : "Robe soirée", val1: "120", val2: `450K ${t.currency}` },
    { name: lang === "ar" ? "سروال جينز" : "Pantalon Jean", val1: "85", val2: `136K ${t.currency}` },
    { name: lang === "ar" ? "زي مدرسي" : "Uniforme", val1: "200", val2: `210K ${t.currency}` },
  ];

  // Mock Top Workers
  const topWorkers = [
    { name: lang === "ar" ? "أحمد بن علي" : "Ahmed Ben Ali", val1: lang === "ar" ? "خياط" : "Tailleur", val2: "145 قطعة" },
    { name: lang === "ar" ? "سميرة بن يوسف" : "Samira B.", val1: lang === "ar" ? "مشرف" : "Superviseur", val2: "110 قطعة" },
    { name: lang === "ar" ? "يوسف حمدي" : "Youcef H.", val1: lang === "ar" ? "مسؤول كي" : "Repasseur", val2: "90 قطعة" },
  ];

  return (
    <PageBackground>
      <div className="flex items-center gap-4 pt-7">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}
        >
          <BackArrow size={20} />
        </button>
        <div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
            <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
              {t.breadcrumbHome}
            </button>
            <CrumbChevron size={14} />
            <span style={{ color: palette.text, fontWeight: 600 }}>{t.breadcrumb}</span>
          </div>
          <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 680 }}>{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-6">
        <SummaryCards />
      </div>

      <div className="mt-5">
        <ActionBar onCreateReport={() => setReportOpen(true)} />
      </div>

      <div className="mt-5 flex flex-col gap-6 xl:flex-row pb-10">
        
        {/* LEFT / MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {tabs.map((tb) => {
              const active = tb.id === tab;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setTab(tb.id)}
                  className="transition-colors"
                  style={{
                    padding: "9px 16px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#fff" : palette.muted,
                    backgroundColor: active ? palette.primary : palette.surface,
                    border: `1px solid ${active ? palette.primary : palette.border}`,
                  }}
                >
                  {tb.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SalesProfitChart />
            <ExpensesRevChart />
            <TopList title={t.charts.topProducts} items={topProducts} columns={[t.actions.product, lang === "ar" ? "الكمية" : "Qté", lang === "ar" ? "الإيراد" : "Revenu"]} />
            <TopList title={t.charts.topWorkers} items={topWorkers} columns={[t.actions.worker, lang === "ar" ? "الوظيفة" : "Rôle", lang === "ar" ? "الإنتاج" : "Prod."]} />
            <div className="md:col-span-2">
              <DelayedOrdersTable />
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Insights & Recommendations */}
        <div className="w-full xl:w-[320px] shrink-0">
          <div className="sticky top-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>
                {t.insights.title}
              </h2>
            </div>
            <div className="rounded-2xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <InsightsSidebar />
            </div>
          </div>
        </div>
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </PageBackground>
  );
}
