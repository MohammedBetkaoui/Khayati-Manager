import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";


import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";

import { palette, expensesText, mockExpenses } from "./expenses-data";
import { SummaryCards } from "../components/expenses/summary-cards";
import { ExpensesTable } from "../components/expenses/expenses-table";
import { ExpenseDetailsBar } from "../components/expenses/expense-details-bar";
import { AddExpenseModal, RecurringExpenseModal } from "../components/expenses/expense-modals";

export function ExpensesPage() {
  const { lang, dir } = useLanguage();
  const t = expensesText[lang];
  const cur = t.currency;
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(mockExpenses[0]?.id || null);
  const [tab, setTab] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);

  // Derived mock summary metrics
  const todayExpenses = "6,500 " + cur;
  const monthExpenses = "126,500 " + cur;
  const topCategory = lang === "ar" ? "أقمشة" : "Tissus";
  const fixedExpenses = "80,000 " + cur;
  const netProfit = "257,500 " + cur;

  const filteredRecords = useMemo(() => {
    return mockExpenses.filter((rec) => {
      if (tab === "fixed" && rec.type !== "fixed") return false;
      if (tab === "variable" && rec.type !== "variable") return false;
      if (tab === "recurring" && !rec.isRecurring) return false;
      return true;
    });
  }, [tab]);

  const selectedRecord = mockExpenses.find((r) => r.id === selectedId) || null;

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs = [
    { id: "all", label: t.tabs.all },
    { id: "fixed", label: t.tabs.fixed },
    { id: "variable", label: t.tabs.variable },
    { id: "recurring", label: t.tabs.recurring },
    { id: "category", label: t.tabs.category },
    { id: "reports", label: t.tabs.reports },
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
        <SummaryCards
          todayExpenses={todayExpenses}
          monthExpenses={monthExpenses}
          topCategory={topCategory}
          fixedExpenses={fixedExpenses}
          netProfit={netProfit}
        />
      </div>



      {/* Tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
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

      {/* Expense details bar — shown when a record is selected */}
      {selectedRecord && (
        <div className="mt-5">
          <ExpenseDetailsBar
            record={selectedRecord}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {/* Main content — full width */}
      <div className="mt-5 pb-10">
        <div
          style={{
            backgroundColor: palette.surface,
            borderRadius: 20,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
            overflow: "hidden",
          }}
        >
          <ExpensesTable records={filteredRecords} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="mt-5">
          <div
            style={{
              backgroundColor: "#fffdf9",
              borderRadius: 16,
              border: `1px solid #eaddcb`,
              padding: "16px 20px",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} style={{ color: "#a87d3c" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#a87d3c" }}>{t.alerts.title}</span>
            </div>
            <ul className="flex flex-col gap-2" style={{ fontSize: 12, color: "#8a6d3f" }}>
              <li className="flex items-start gap-1.5"><span className="mt-0.5">•</span> {t.alerts.recurringDue}</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5">•</span> {t.alerts.laterDue}</li>
            </ul>
          </div>
        </div>
      </div>

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RecurringExpenseModal open={recOpen} onClose={() => setRecOpen(false)} />
    </PageBackground>
  );
}
