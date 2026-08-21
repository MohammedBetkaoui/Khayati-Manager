import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileBarChart,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { fetchJson } from "../lib/api";
import { useLanguage } from "../language-context";

type ExpenseSourceType =
  | "MANUAL"
  | "RECURRING"
  | "SUPPLIER_PURCHASE"
  | "PAYROLL";
type ExpenseStatus =
  | "PAID"
  | "PARTIALLY_PAID"
  | "UNPAID"
  | "UPCOMING"
  | "OVERDUE"
  | "CANCELLED";

type ExpenseRow = {
  id: string;
  sourceId: number;
  sourceType: ExpenseSourceType;
  date: string;
  description: string;
  category: string;
  originLabel: string;
  relatedName?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: ExpenseStatus;
  paymentMethod?: string | null;
  notes?: string | null;
  route?: string | null;
  canEdit: boolean;
  isRecurring?: boolean;
  nextDueDate?: string | null;
};

type ExpenseStats = {
  todayPaid: number;
  monthCharges: number;
  periodCharges: number;
  periodPaid: number;
  remainingToPay: number;
  payrollMonth: number;
  estimatedSales: number;
  estimatedResult: number;
  supplierPurchases: number;
  manualCharges: number;
};

type ExpenseAlert = {
  id: string;
  title: string;
  message: string;
  amount: number;
  severity: "low" | "medium" | "high";
  route?: string | null;
};

type ExpenseReports = {
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    charges: number;
    paid: number;
    remaining: number;
  }>;
};

type ExpensesPayload = {
  data: ExpenseRow[];
  stats: ExpenseStats;
  alerts: ExpenseAlert[];
  reports: ExpenseReports;
};

type ExpenseForm = {
  category: string;
  description: string;
  totalAmount: string;
  paidAmount: string;
  expenseDate: string;
  paymentMethod: string;
  isRecurring: boolean;
  frequency: string;
  nextDueDate: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const emptyStats: ExpenseStats = {
  todayPaid: 0,
  monthCharges: 0,
  periodCharges: 0,
  periodPaid: 0,
  remainingToPay: 0,
  payrollMonth: 0,
  estimatedSales: 0,
  estimatedResult: 0,
  supplierPurchases: 0,
  manualCharges: 0,
};

const categoryOptions = [
  { value: "RENT", label: "Loyer", ar: "الكراء" },
  { value: "ELECTRICITY", label: "Électricité", ar: "الكهرباء" },
  { value: "WATER", label: "Eau", ar: "الماء" },
  { value: "GAS", label: "Gaz", ar: "الغاز" },
  { value: "INTERNET_PHONE", label: "Internet / Téléphone", ar: "الإنترنت / الهاتف" },
  { value: "MAINTENANCE", label: "Maintenance", ar: "الصيانة" },
  { value: "REPAIR", label: "Réparation", ar: "إصلاح" },
  { value: "TRANSPORT", label: "Transport", ar: "النقل" },
  { value: "FUEL", label: "Carburant", ar: "الوقود" },
  { value: "SUPPLIES", label: "Fournitures", ar: "لوازم" },
  { value: "CLEANING", label: "Nettoyage", ar: "التنظيف" },
  { value: "OTHER", label: "Autre", ar: "أخرى" },
];

const tabOptions = [
  { id: "all", ar: "الكل", fr: "Toutes" },
  { id: "purchases", ar: "المشتريات", fr: "Achats" },
  { id: "payroll", ar: "الرواتب", fr: "Salaires" },
  { id: "manual", ar: "المصاريف العامة", fr: "Charges générales" },
  { id: "recurring", ar: "المتكررة", fr: "Récurrentes" },
  { id: "reports", ar: "التقارير", fr: "Rapports" },
];

const periodOptions = [
  { value: "today", ar: "اليوم", fr: "Aujourd'hui" },
  { value: "week", ar: "هذا الأسبوع", fr: "Cette semaine" },
  { value: "month", ar: "هذا الشهر", fr: "Ce mois" },
  { value: "previous_month", ar: "الشهر السابق", fr: "Mois précédent" },
  { value: "all", ar: "كل الفترات", fr: "Toutes les périodes" },
];

const sourceLabels: Record<ExpenseSourceType, { ar: string; fr: string }> = {
  SUPPLIER_PURCHASE: { ar: "شراء مورد", fr: "Achat fournisseur" },
  PAYROLL: { ar: "راتب", fr: "Salaire" },
  MANUAL: { ar: "يدوي", fr: "Manuel" },
  RECURRING: { ar: "متكرر", fr: "Récurrent" },
};

const statusLabels: Record<ExpenseStatus, { ar: string; fr: string; color: string; bg: string }> = {
  PAID: { ar: "مدفوع", fr: "Payé", color: "#2f6f52", bg: "rgba(77, 138, 106, 0.12)" },
  PARTIALLY_PAID: { ar: "مدفوع جزئياً", fr: "Partiel", color: "#9a6b27", bg: "rgba(195, 154, 91, 0.16)" },
  UNPAID: { ar: "غير مدفوع", fr: "Non payé", color: "#9f4f4b", bg: "rgba(201, 138, 134, 0.16)" },
  UPCOMING: { ar: "قادم", fr: "À venir", color: "#587c92", bg: "rgba(107, 138, 160, 0.14)" },
  OVERDUE: { ar: "متأخر", fr: "En retard", color: "#9f4f4b", bg: "rgba(180, 106, 102, 0.18)" },
  CANCELLED: { ar: "ملغى", fr: "Annulé", color: palette.muted, bg: "rgba(138, 136, 127, 0.12)" },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return `${Math.round(value || 0).toLocaleString("fr-FR")} DZD`;
}

function labelFromCategory(value: string, lang: "ar" | "fr") {
  const option = categoryOptions.find((item) => item.value === value);
  return option ? option[lang] : value;
}

function safeStatus(value: string): ExpenseStatus {
  return value in statusLabels ? (value as ExpenseStatus) : "UNPAID";
}

function buildInitialForm(): ExpenseForm {
  const today = todayKey();
  return {
    category: "OTHER",
    description: "",
    totalAmount: "",
    paidAmount: "",
    expenseDate: today,
    paymentMethod: "CASH",
    isRecurring: false,
    frequency: "MONTHLY",
    nextDueDate: "",
    startDate: today,
    endDate: "",
    notes: "",
  };
}

function StatCard({
  title,
  subtitle,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  subtitle: string;
  value: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <div
      className="flex min-h-[118px] flex-col justify-between"
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 20,
        padding: "18px 20px",
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.14)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex size-11 items-center justify-center"
          style={{ borderRadius: 14, backgroundColor: `${tone}1f`, color: tone }}
        >
          <Icon size={21} strokeWidth={1.9} />
        </div>
        <div className="text-end" style={{ fontSize: 22, fontWeight: 850, color: palette.text }}>
          {value}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 750, color: palette.text }}>{title}</div>
        <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 3 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Badge({ children, color, bg }: { children: string; color: string; bg: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11.5,
        fontWeight: 750,
        color,
        backgroundColor: bg,
      }}
    >
      {children}
    </span>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto"
        style={{ backgroundColor: palette.surface, borderRadius: 22, border: `1px solid ${palette.border}` }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: palette.border }}>
          <h2 style={{ color: palette.text, fontSize: 18, fontWeight: 850 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ color: palette.muted, fontWeight: 800 }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ExpensesPage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [stats, setStats] = useState<ExpenseStats>(emptyStats);
  const [alerts, setAlerts] = useState<ExpenseAlert[]>([]);
  const [reports, setReports] = useState<ExpenseReports>({ categoryBreakdown: [], monthlyTrend: [] });
  const [tab, setTab] = useState("all");
  const [period, setPeriod] = useState("month");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() => buildInitialForm());
  const [saving, setSaving] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set("period", period);
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (origin) params.set("origin", origin);

    try {
      const payload = await fetchJson<ExpensesPayload>(`/expenses?${params.toString()}`);
      setRows(payload.data ?? []);
      setStats(payload.stats ?? emptyStats);
      setAlerts(payload.alerts ?? []);
      setReports(payload.reports ?? { categoryBreakdown: [], monthlyTrend: [] });
    } catch (err) {
      setRows([]);
      setAlerts([]);
      setError(err instanceof Error ? err.message : "Impossible de charger les dépenses.");
    } finally {
      setLoading(false);
    }
  }, [origin, period, search, status, tab]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const openCreate = () => {
    setEditing(null);
    setForm(buildInitialForm());
    setFormOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setForm({
      category: categoryOptions.find((item) => item.label === row.category || item.value === row.category)?.value ?? "OTHER",
      description: row.description,
      totalAmount: String(row.totalAmount),
      paidAmount: String(row.paidAmount),
      expenseDate: row.date,
      paymentMethod: "CASH",
      isRecurring: row.sourceType === "RECURRING",
      frequency: "MONTHLY",
      nextDueDate: row.nextDueDate ?? "",
      startDate: row.date,
      endDate: "",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = {
        category: form.category,
        description: form.description,
        totalAmount: Number(form.totalAmount),
        paidAmount: form.paidAmount === "" ? Number(form.totalAmount) : Number(form.paidAmount),
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        isRecurring: form.isRecurring,
        frequency: form.isRecurring ? form.frequency : undefined,
        nextDueDate: form.isRecurring && form.nextDueDate ? form.nextDueDate : undefined,
        startDate: form.isRecurring && form.startDate ? form.startDate : undefined,
        endDate: form.isRecurring && form.endDate ? form.endDate : undefined,
        notes: form.notes || undefined,
      };

      await fetchJson(editing ? `/expenses/${editing.sourceId}` : "/expenses", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setFormOpen(false);
      await loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const archiveExpense = async (row: ExpenseRow) => {
    const message =
      lang === "ar"
        ? "هل تريد أرشفة هذه المصروف؟ سيبقى التاريخ محفوظاً."
        : "Archiver cette dépense ? L'historique restera conservé.";
    if (!window.confirm(message)) return;
    await fetchJson(`/expenses/${row.sourceId}`, { method: "DELETE" });
    await loadExpenses();
  };

  const title = lang === "ar" ? "تسيير المصاريف" : "Gestion des Dépenses";
  const subtitle =
    lang === "ar"
      ? "مركز موحد لمتابعة مشتريات الموردين، الرواتب، المصاريف العامة والمبالغ المتبقية."
      : "Centre financier qui regroupe achats fournisseurs, salaires, charges générales et restes à payer.";

  const visibleRows = useMemo(() => rows, [rows]);

  return (
    <PageBackground>
      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex size-11 items-center justify-center transition hover:opacity-80"
            style={{ borderRadius: 14, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}
          >
            <BackArrow size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
              <button type="button" onClick={() => navigate("/")}>
                {lang === "ar" ? "الرئيسية" : "Accueil"}
              </button>
              <CrumbChevron size={14} />
              <span style={{ color: palette.text, fontWeight: 700 }}>{title}</span>
            </div>
            <h1 className="mt-1" style={{ fontSize: 25, fontWeight: 900, color: palette.text }}>
              {title}
            </h1>
            <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 3, maxWidth: 760 }}>{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 transition hover:opacity-90"
          style={{ backgroundColor: palette.primary, color: "#fff", borderRadius: 14, padding: "11px 16px", fontWeight: 800 }}
        >
          <Plus size={17} />
          {lang === "ar" ? "مصروف جديد" : "Nouvelle dépense"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title={lang === "ar" ? "مدفوع اليوم" : "Dépenses du jour"} subtitle={lang === "ar" ? "المبلغ الخارج اليوم" : "Payé aujourd'hui"} value={formatMoney(stats.todayPaid)} icon={Wallet} tone="#a87d3c" />
        <StatCard title={lang === "ar" ? "مصروفات الشهر" : "Dépenses du mois"} subtitle={lang === "ar" ? "ال charges المسجلة" : "Charges enregistrées"} value={formatMoney(stats.monthCharges)} icon={CalendarDays} tone="#b46a66" />
        <StatCard title={lang === "ar" ? "المدفوع فعلياً" : "Montant payé"} subtitle={lang === "ar" ? "حسب الفترة المختارة" : "Décaissement réel"} value={formatMoney(stats.periodPaid)} icon={Wallet} tone="#4d8a6a" />
        <StatCard title={lang === "ar" ? "الباقي للدفع" : "Reste à payer"} subtitle={lang === "ar" ? "ديون ومصاريف غير مسددة" : "Dettes et charges ouvertes"} value={formatMoney(stats.remainingToPay)} icon={AlertCircle} tone="#c98a86" />
        <StatCard title={lang === "ar" ? "رواتب الشهر" : "Salaires du mois"} subtitle={lang === "ar" ? "الرواتب المسجلة" : "Paies enregistrées"} value={formatMoney(stats.payrollMonth)} icon={FileBarChart} tone={palette.primary} />
        <StatCard title={lang === "ar" ? "نتيجة تقديرية" : "Résultat estimé"} subtitle={lang === "ar" ? "المبيعات ناقص charges" : "Ventes moins charges"} value={formatMoney(stats.estimatedResult)} icon={FileBarChart} tone="#6b8aa0" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {tabOptions.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              style={{
                borderRadius: 13,
                padding: "9px 15px",
                backgroundColor: active ? palette.primary : palette.surface,
                border: `1px solid ${active ? palette.primary : palette.border}`,
                color: active ? "#fff" : palette.muted,
                fontSize: 13.5,
                fontWeight: active ? 850 : 650,
              }}
            >
              {item[lang]}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
        <label className="flex items-center gap-2 rounded-2xl px-3" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          <Search size={16} style={{ color: palette.muted }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={lang === "ar" ? "بحث: وصف، مورد، عامل..." : "Recherche: description, fournisseur, travailleur..."}
            className="h-11 flex-1 bg-transparent text-sm outline-none"
            style={{ color: palette.text }}
          />
        </label>
        <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 rounded-2xl px-3 text-sm outline-none" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.text }}>
          {periodOptions.map((item) => (
            <option key={item.value} value={item.value}>{item[lang]}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-2xl px-3 text-sm outline-none" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.text }}>
          <option value="">{lang === "ar" ? "كل الحالات" : "Tous statuts"}</option>
          {Object.entries(statusLabels).map(([key, item]) => (
            <option key={key} value={key}>{item[lang]}</option>
          ))}
        </select>
        <select value={origin} onChange={(event) => setOrigin(event.target.value)} className="h-11 rounded-2xl px-3 text-sm outline-none" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.text }}>
          <option value="">{lang === "ar" ? "كل المصادر" : "Toutes origines"}</option>
          {Object.entries(sourceLabels).map(([key, item]) => (
            <option key={key} value={key}>{item[lang]}</option>
          ))}
        </select>
        <button type="button" onClick={() => void loadExpenses()} className="flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}>
          <RefreshCcw size={15} />
          {lang === "ar" ? "تحديث" : "Actualiser"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "rgba(201, 138, 134, 0.12)", color: "#9f4f4b", border: `1px solid rgba(201, 138, 134, 0.25)` }}>
          {error}
        </div>
      ) : null}

      {tab === "reports" ? (
        <ReportsPanel reports={reports} lang={lang} />
      ) : (
        <div className="mt-5 overflow-hidden rounded-[22px]" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead style={{ backgroundColor: "#fbfaf7", color: palette.muted }}>
                <tr>
                  {["Date", lang === "ar" ? "الوصف" : "Description", lang === "ar" ? "الفئة" : "Catégorie", lang === "ar" ? "المصدر" : "Origine", lang === "ar" ? "المبلغ" : "Total", lang === "ar" ? "المدفوع" : "Payé", lang === "ar" ? "الباقي" : "Reste", lang === "ar" ? "الحالة" : "Statut", lang === "ar" ? "إجراءات" : "Actions"].map((head) => (
                    <th key={head} className="px-4 py-3 text-start font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center" style={{ color: palette.muted }}>{lang === "ar" ? "جاري تحميل المصاريف..." : "Chargement des dépenses..."}</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center" style={{ color: palette.muted }}>
                      <div style={{ fontWeight: 800, color: palette.text }}>{lang === "ar" ? "لا توجد مصاريف لهذه الفترة" : "Aucune dépense pour cette période"}</div>
                      <div className="mt-1 text-xs">{lang === "ar" ? "المشتريات والرواتب تظهر هنا تلقائياً، ويمكنك إضافة charges عامة." : "Les achats fournisseurs et salaires apparaîtront automatiquement ici."}</div>
                      <button type="button" onClick={openCreate} className="mt-4 rounded-2xl px-4 py-2 text-sm font-bold" style={{ backgroundColor: palette.primary, color: "#fff" }}>{lang === "ar" ? "مصروف جديد" : "Nouvelle dépense"}</button>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const statusInfo = statusLabels[safeStatus(row.status)];
                    return (
                      <tr key={row.id} className="border-t" style={{ borderColor: palette.border }}>
                        <td className="px-4 py-3" style={{ color: palette.muted }}>{row.date}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelected(row)} className="text-start font-bold hover:underline" style={{ color: palette.text }}>{row.description}</button>
                          {row.relatedName ? <div className="mt-0.5 text-xs" style={{ color: palette.muted }}>{row.relatedName}</div> : null}
                        </td>
                        <td className="px-4 py-3" style={{ color: palette.text }}>{labelFromCategory(row.category, lang)}</td>
                        <td className="px-4 py-3"><Badge color={palette.primary} bg="rgba(18, 60, 74, 0.08)">{sourceLabels[row.sourceType]?.[lang] ?? row.originLabel}</Badge></td>
                        <td className="px-4 py-3 font-bold" style={{ color: palette.text }}>{formatMoney(row.totalAmount)}</td>
                        <td className="px-4 py-3" style={{ color: "#2f6f52" }}>{formatMoney(row.paidAmount)}</td>
                        <td className="px-4 py-3" style={{ color: row.remainingAmount > 0 ? "#9f4f4b" : palette.muted }}>{formatMoney(row.remainingAmount)}</td>
                        <td className="px-4 py-3"><Badge color={statusInfo.color} bg={statusInfo.bg}>{statusInfo[lang]}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSelected(row)} title="Voir" style={{ color: palette.primary }}><Eye size={17} /></button>
                            {row.canEdit ? (
                              <>
                                <button type="button" onClick={() => openEdit(row)} title="Modifier" style={{ color: "#a87d3c" }}><Pencil size={17} /></button>
                                <button type="button" onClick={() => void archiveExpense(row)} title="Archiver" style={{ color: "#b46a66" }}><Trash2 size={17} /></button>
                              </>
                            ) : row.route ? (
                              <button type="button" onClick={() => navigate(row.route || "/expenses")} className="rounded-xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: palette.accentSoft, color: "#8b6428" }}>
                                {lang === "ar" ? "المصدر" : "Source"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-10 mt-5 rounded-[20px] p-5" style={{ backgroundColor: "#fffdf9", border: "1px solid #eaddcb" }}>
        <div className="mb-3 flex items-center gap-2" style={{ color: "#a87d3c", fontWeight: 850 }}>
          <AlertCircle size={17} />
          {lang === "ar" ? "تنبيهات مالية" : "Alertes financières"}
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "لا توجد تنبيهات مهمة حالياً." : "Aucune alerte importante pour le moment."}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alerts.map((alert) => (
              <button key={alert.id} type="button" onClick={() => alert.route && navigate(alert.route)} className="rounded-2xl p-3 text-start" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
                <div className="font-bold" style={{ color: palette.text }}>{alert.title}</div>
                <div className="mt-1 text-xs" style={{ color: palette.muted }}>{alert.message}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <ModalShell title={lang === "ar" ? "تفاصيل العملية" : "Détail de l'opération"} onClose={() => setSelected(null)}>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <Detail label={lang === "ar" ? "الوصف" : "Description"} value={selected.description} />
            <Detail label={lang === "ar" ? "المصدر" : "Origine"} value={sourceLabels[selected.sourceType]?.[lang] ?? selected.originLabel} />
            <Detail label={lang === "ar" ? "التاريخ" : "Date"} value={selected.date} />
            <Detail label={lang === "ar" ? "الفئة" : "Catégorie"} value={labelFromCategory(selected.category, lang)} />
            <Detail label={lang === "ar" ? "المبلغ" : "Montant"} value={formatMoney(selected.totalAmount)} />
            <Detail label={lang === "ar" ? "المدفوع" : "Payé"} value={formatMoney(selected.paidAmount)} />
            <Detail label={lang === "ar" ? "الباقي" : "Reste"} value={formatMoney(selected.remainingAmount)} />
            <Detail label={lang === "ar" ? "الحالة" : "Statut"} value={statusLabels[safeStatus(selected.status)][lang]} />
            {selected.notes ? <Detail label={lang === "ar" ? "ملاحظات" : "Notes"} value={selected.notes} wide /> : null}
          </div>
        </ModalShell>
      ) : null}

      {formOpen ? (
        <ModalShell title={editing ? (lang === "ar" ? "تعديل المصروف" : "Modifier la dépense") : (lang === "ar" ? "مصروف جديد" : "Nouvelle dépense")} onClose={() => setFormOpen(false)}>
          <form onSubmit={(event) => void submitForm(event)} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label={lang === "ar" ? "الفئة" : "Catégorie"}>
              <select required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="field">
                {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item[lang]}</option>)}
              </select>
            </Field>
            <Field label={lang === "ar" ? "التاريخ" : "Date"}>
              <input required type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} className="field" />
            </Field>
            <Field label={lang === "ar" ? "الوصف" : "Description"} wide>
              <input required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="field" placeholder={lang === "ar" ? "مثال: إصلاح آلة Singer" : "Ex: Réparation machine Singer"} />
            </Field>
            <Field label={lang === "ar" ? "المبلغ الإجمالي" : "Montant total"}>
              <input required min={0} type="number" value={form.totalAmount} onChange={(event) => setForm((current) => ({ ...current, totalAmount: event.target.value }))} className="field" />
            </Field>
            <Field label={lang === "ar" ? "المبلغ المدفوع" : "Montant payé"}>
              <input min={0} type="number" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} className="field" placeholder={form.totalAmount || "0"} />
            </Field>
            <Field label={lang === "ar" ? "طريقة الدفع" : "Mode de paiement"}>
              <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="field">
                <option value="CASH">{lang === "ar" ? "نقداً" : "Espèces"}</option>
                <option value="TRANSFER">{lang === "ar" ? "تحويل" : "Virement"}</option>
                <option value="OTHER">{lang === "ar" ? "أخرى" : "Autre"}</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end rounded-2xl px-3 py-3 text-sm font-bold" style={{ backgroundColor: "#fbfaf7", border: `1px solid ${palette.border}`, color: palette.text }}>
              <input type="checkbox" checked={form.isRecurring} onChange={(event) => setForm((current) => ({ ...current, isRecurring: event.target.checked }))} />
              {lang === "ar" ? "مصروف متكرر؟" : "Dépense récurrente ?"}
            </label>
            {form.isRecurring ? (
              <>
                <Field label={lang === "ar" ? "التكرار" : "Fréquence"}>
                  <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))} className="field">
                    <option value="WEEKLY">{lang === "ar" ? "أسبوعي" : "Hebdomadaire"}</option>
                    <option value="MONTHLY">{lang === "ar" ? "شهري" : "Mensuel"}</option>
                    <option value="QUARTERLY">{lang === "ar" ? "ثلاثي" : "Trimestriel"}</option>
                    <option value="YEARLY">{lang === "ar" ? "سنوي" : "Annuel"}</option>
                  </select>
                </Field>
                <Field label={lang === "ar" ? "الإستحقاق القادم" : "Prochaine échéance"}>
                  <input type="date" value={form.nextDueDate} onChange={(event) => setForm((current) => ({ ...current, nextDueDate: event.target.value }))} className="field" />
                </Field>
              </>
            ) : null}
            <Field label={lang === "ar" ? "ملاحظات" : "Notes"} wide>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="field min-h-[90px]" />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl px-4 py-2 text-sm font-bold" style={{ border: `1px solid ${palette.border}`, color: palette.muted }}>{lang === "ar" ? "إلغاء" : "Annuler"}</button>
              <button disabled={saving} type="submit" className="rounded-2xl px-5 py-2 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: palette.primary, color: "#fff" }}>{saving ? (lang === "ar" ? "حفظ..." : "Enregistrement...") : (lang === "ar" ? "حفظ" : "Enregistrer")}</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      <style>{`.field{height:44px;width:100%;border-radius:14px;border:1px solid ${palette.border};background:${palette.surface};padding:0 12px;font-size:14px;color:${palette.text};outline:none}.field:focus{border-color:${palette.primary}}textarea.field{height:auto;padding-top:10px}`}</style>
    </PageBackground>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""} style={{ backgroundColor: "#fbfaf7", border: `1px solid ${palette.border}`, borderRadius: 16, padding: 13 }}>
      <div style={{ fontSize: 11.5, color: palette.muted, fontWeight: 700 }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 14, color: palette.text, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <div className="mb-1.5 text-xs font-bold" style={{ color: palette.muted }}>{label}</div>
      {children}
    </label>
  );
}

function ReportsPanel({ reports, lang }: { reports: ExpenseReports; lang: "ar" | "fr" }) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-[22px] p-5" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <h3 style={{ color: palette.text, fontWeight: 850 }}>{lang === "ar" ? "توزيع المصاريف حسب الفئة" : "Répartition par catégorie"}</h3>
        <div className="mt-4 flex flex-col gap-3">
          {reports.categoryBreakdown.length === 0 ? (
            <p className="text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "لا توجد بيانات." : "Aucune donnée."}</p>
          ) : reports.categoryBreakdown.map((item) => (
            <div key={item.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span style={{ color: palette.text, fontWeight: 750 }}>{labelFromCategory(item.category, lang)}</span>
                <span style={{ color: palette.muted }}>{formatMoney(item.amount)} · {Math.round(item.percentage)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: palette.accentSoft }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.percentage)}%`, backgroundColor: palette.accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[22px] p-5" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <h3 style={{ color: palette.text, fontWeight: 850 }}>{lang === "ar" ? "التطور الشهري" : "Évolution mensuelle"}</h3>
        <div className="mt-4 flex flex-col gap-2">
          {reports.monthlyTrend.map((item) => (
            <div key={item.month} className="grid grid-cols-4 gap-2 rounded-2xl px-3 py-2 text-sm" style={{ backgroundColor: "#fbfaf7" }}>
              <span style={{ color: palette.text, fontWeight: 800 }}>{item.month}</span>
              <span style={{ color: palette.muted }}>{formatMoney(item.charges)}</span>
              <span style={{ color: "#2f6f52" }}>{formatMoney(item.paid)}</span>
              <span style={{ color: item.remaining > 0 ? "#9f4f4b" : palette.muted }}>{formatMoney(item.remaining)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
