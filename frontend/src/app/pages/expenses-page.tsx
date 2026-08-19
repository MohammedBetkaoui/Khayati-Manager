import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";
import {
  categoryLabels,
  palette,
  expensesText,
  type ExpenseCategory,
  type ExpenseRecord,
  type ExpenseType,
  type LinkedTo,
  type PaymentMethod,
} from "./expenses-data";
import { SummaryCards } from "../components/expenses/summary-cards";
import { ExpensesTable } from "../components/expenses/expenses-table";
import { ExpenseDetailsBar } from "../components/expenses/expense-details-bar";
import {
  AddExpenseModal,
  RecurringExpenseModal,
} from "../components/expenses/expense-modals";
import {
  asRecord,
  fetchJson,
  getArrayFromPayload,
  getBoolean,
  getNumber,
  getText,
} from "../lib/api";

const categoryMap: Record<string, ExpenseCategory> = {
  fabric: "fabric",
  thread: "thread",
  rent: "rent",
  utilities: "utilities",
  maintenance: "maintenance",
  salaries: "salaries",
  transport: "transport",
  other: "other",
};

const typeMap: Record<string, ExpenseType> = {
  fixed: "fixed",
  variable: "variable",
  recurring: "recurring",
};

const methodMap: Record<string, PaymentMethod> = {
  cash: "cash",
  transfer: "transfer",
  later: "later",
};

const linkedToMap: Record<string, LinkedTo> = {
  stock: "stock",
  production: "production",
  salary: "salary",
  sale: "sale",
  general: "general",
};

function mapExpense(raw: unknown): ExpenseRecord {
  const record = asRecord(raw);
  const name =
    getText(record?.name) || getText(record?.title) || "Sans designation";
  const notes = getText(record?.notes);

  return {
    id: getText(record?.id) || crypto.randomUUID(),
    name: { ar: name, fr: name },
    category: categoryMap[getText(record?.category)] ?? "other",
    type: typeMap[getText(record?.type)] ?? "variable",
    date: getText(record?.date) || getText(record?.createdAt) || "-",
    amount: getNumber(record?.amount),
    paymentMethod:
      methodMap[getText(record?.paymentMethod ?? record?.method)] ?? "cash",
    supplier: getText(record?.supplier),
    linkedTo: linkedToMap[getText(record?.linkedTo)] ?? "general",
    isRecurring: getBoolean(record?.isRecurring),
    notes: { ar: notes, fr: notes },
    lastUpdated:
      getText(record?.lastUpdated) || getText(record?.updatedAt) || "-",
  };
}

export function ExpensesPage() {
  const { lang, dir } = useLanguage();
  const t = expensesText[lang];
  const cur = t.currency;
  const navigate = useNavigate();

  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/expenses");
        if (cancelled) return;

        const nextRecords = getArrayFromPayload(payload).map(mapExpense);
        setRecords(nextRecords);
        setSelectedId((current) => current ?? nextRecords[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setRecords([]);
        setSelectedId(null);
        setError(
          err instanceof Error ? err.message : "Unable to load expenses.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentMonth = todayKey.slice(0, 7);

  const todayTotal = records
    .filter((record) => record.date.slice(0, 10) === todayKey)
    .reduce((sum, record) => sum + record.amount, 0);
  const monthTotal = records
    .filter((record) => record.date.startsWith(currentMonth))
    .reduce((sum, record) => sum + record.amount, 0);
  const fixedTotal = records
    .filter((record) => record.type === "fixed")
    .reduce((sum, record) => sum + record.amount, 0);

  const categoryTotals = records.reduce<Record<string, number>>(
    (acc, record) => {
      acc[record.category] = (acc[record.category] ?? 0) + record.amount;
      return acc;
    },
    {},
  );

  const topCategoryKey = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] as ExpenseCategory | undefined;
  const topCategory = topCategoryKey
    ? categoryLabels[topCategoryKey][lang]
    : lang === "ar"
      ? "لا توجد بيانات"
      : "Aucune donnee";

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (tab === "fixed" && record.type !== "fixed") return false;
      if (tab === "variable" && record.type !== "variable") return false;
      if (tab === "recurring" && !record.isRecurring) return false;
      return true;
    });
  }, [records, tab]);

  const selectedRecord =
    records.find((record) => record.id === selectedId) ?? null;
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
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.primary,
          }}
        >
          <BackArrow size={20} />
        </button>
        <div>
          <div
            className="flex items-center gap-1.5"
            style={{ fontSize: 12.5, color: palette.muted }}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="transition-colors hover:opacity-80"
            >
              {t.breadcrumbHome}
            </button>
            <CrumbChevron size={14} />
            <span style={{ color: palette.text, fontWeight: 600 }}>
              {t.breadcrumb}
            </span>
          </div>
          <h1
            className="mt-1"
            style={{ fontSize: 24, fontWeight: 800, color: palette.text }}
          >
            {t.title}
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: palette.muted,
              marginTop: 2,
              maxWidth: 680,
            }}
          >
            {t.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SummaryCards
          todayExpenses={`${todayTotal.toLocaleString()} ${cur}`}
          monthExpenses={`${monthTotal.toLocaleString()} ${cur}`}
          topCategory={topCategory}
          fixedExpenses={`${fixedTotal.toLocaleString()} ${cur}`}
          netProfit={`0 ${cur}`}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
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
              {item.label}
            </button>
          );
        })}
      </div>

      {selectedRecord ? (
        <div className="mt-5">
          <ExpenseDetailsBar
            record={selectedRecord}
            onClose={() => setSelectedId(null)}
          />
        </div>
      ) : null}

      <div className="mt-5 pb-10">
        {loading ? (
          <div className="mb-4 text-sm" style={{ color: palette.muted }}>
            {lang === "ar"
              ? "جاري تحميل المصاريف..."
              : "Chargement des depenses..."}
          </div>
        ) : null}
        {!loading && error ? (
          <div className="mb-4 text-sm" style={{ color: "#b46a66" }}>
            {lang === "ar"
              ? "تعذر تحميل المصاريف من الواجهة الخلفية."
              : "Impossible de charger les depenses depuis l'API."}
          </div>
        ) : null}

        <div
          style={{
            backgroundColor: palette.surface,
            borderRadius: 20,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
            overflow: "hidden",
          }}
        >
          <ExpensesTable
            records={filteredRecords}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="mt-5">
          <div
            style={{
              backgroundColor: "#fffdf9",
              borderRadius: 16,
              border: "1px solid #eaddcb",
              padding: "16px 20px",
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={16} style={{ color: "#a87d3c" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#a87d3c" }}>
                {t.alerts.title}
              </span>
            </div>
            <ul
              className="flex flex-col gap-2"
              style={{ fontSize: 12, color: "#8a6d3f" }}
            >
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5">•</span> {t.alerts.recurringDue}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5">•</span> {t.alerts.laterDue}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RecurringExpenseModal open={recOpen} onClose={() => setRecOpen(false)} />
    </PageBackground>
  );
}
