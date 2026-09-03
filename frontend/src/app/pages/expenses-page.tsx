import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
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
  ShieldCheck,
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
  | "PAYROLL"
  | "SUPPLIER_LEGACY_PAYMENT";
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
  legacySupplierDebtRemaining?: number;
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
  legacySupplierDebtRemaining: 0,
};

const categoryOptions = [
  { value: "RENT", fr: "Loyer", ar: "الكراء" },
  { value: "ELECTRICITY", fr: "Électricité", ar: "الكهرباء" },
  { value: "WATER", fr: "Eau", ar: "الماء" },
  { value: "GAS", fr: "Gaz", ar: "الغاز" },
  { value: "INTERNET_PHONE", fr: "Internet / Téléphone", ar: "الإنترنت / الهاتف" },
  { value: "MAINTENANCE", fr: "Maintenance", ar: "الصيانة" },
  { value: "REPAIR", fr: "Réparation", ar: "الإصلاح" },
  { value: "TRANSPORT", fr: "Transport", ar: "النقل" },
  { value: "FUEL", fr: "Carburant", ar: "الوقود" },
  { value: "SUPPLIES", fr: "Fournitures", ar: "اللوازم" },
  { value: "CLEANING", fr: "Nettoyage", ar: "التنظيف" },
  { value: "OTHER", fr: "Autre", ar: "أخرى" },
];

const automaticCategoryLabels: Record<string, { ar: string; fr: string }> = {
  MATERIAL_PURCHASE: { ar: "شراء مواد أولية", fr: "Achat matière" },
  "Achat matière": { ar: "شراء مواد أولية", fr: "Achat matière" },
  WORKER_SALARIES: { ar: "الرواتب", fr: "Salaires" },
  Salaires: { ar: "الرواتب", fr: "Salaires" },
  FABRIC_PURCHASE: { ar: "شراء أقمشة", fr: "Achat tissu" },
  "Achat tissu": { ar: "شراء أقمشة", fr: "Achat tissu" },
  THREADS_ACCESSORIES: { ar: "الخيوط واللوازم", fr: "Fils et accessoires" },
  "Fils et accessoires": { ar: "الخيوط واللوازم", fr: "Fils et accessoires" },
  UTILITIES: { ar: "مصاريف الخدمات", fr: "Charges utilitaires" },
  "Charges utilitaires": { ar: "مصاريف الخدمات", fr: "Charges utilitaires" },
  MACHINE_MAINTENANCE: { ar: "صيانة الآلات", fr: "Maintenance machines" },
  "Maintenance machines": { ar: "صيانة الآلات", fr: "Maintenance machines" },
};

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
  SUPPLIER_LEGACY_PAYMENT: {
    ar: "تسديد دين سابق",
    fr: "Règlement dette antérieure",
  },
};

const statusLabels: Record<ExpenseStatus, { ar: string; fr: string; color: string; bg: string }> = {
  PAID: { ar: "مدفوع", fr: "Payé", color: "var(--app-positive)", bg: "color-mix(in srgb, var(--app-positive) 14%, transparent)" },
  PARTIALLY_PAID: { ar: "مدفوع جزئياً", fr: "Partiel", color: "var(--app-warning)", bg: "color-mix(in srgb, var(--app-warning) 15%, transparent)" },
  UNPAID: { ar: "غير مدفوع", fr: "Non payé", color: "var(--app-negative)", bg: "color-mix(in srgb, var(--app-negative) 14%, transparent)" },
  UPCOMING: { ar: "قادم", fr: "À venir", color: "var(--app-info)", bg: "color-mix(in srgb, var(--app-info) 14%, transparent)" },
  OVERDUE: { ar: "متأخر", fr: "En retard", color: "var(--app-negative)", bg: "color-mix(in srgb, var(--app-negative) 16%, transparent)" },
  CANCELLED: { ar: "ملغى", fr: "Annulé", color: palette.muted, bg: "rgba(138, 136, 127, 0.12)" },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number, lang: "ar" | "fr") {
  const locale = lang === "ar" ? "ar-DZ" : "fr-FR";
  const currency = lang === "ar" ? "دج" : "DZD";
  return `${Math.round(value || 0).toLocaleString(locale)} ${currency}`;
}

function formatDate(value: string, lang: "ar" | "fr") {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMonth(value: string, lang: "ar" | "fr") {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function labelFromCategory(value: string, lang: "ar" | "fr") {
  const option = categoryOptions.find((item) => item.value === value || item.fr === value);
  return option?.[lang] ?? automaticCategoryLabels[value]?.[lang] ?? value;
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
        background: `linear-gradient(145deg, ${palette.surface}, ${palette.surfaceElevated})`,
        border: `1px solid ${palette.border}`,
        borderRadius: 20,
        padding: "18px 20px",
        boxShadow: "0 10px 24px -20px rgba(2, 9, 11, 0.55)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex size-11 items-center justify-center"
          style={{ borderRadius: 14, backgroundColor: `color-mix(in srgb, ${tone} 17%, transparent)`, color: tone }}
        >
          <Icon size={21} strokeWidth={1.9} />
        </div>
        <div className="text-end" style={{ fontSize: 22, fontWeight: 850, color: palette.text }}>
          <span dir="ltr">{value}</span>
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
        border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
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
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() => buildInitialForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("lang", lang);
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
      setError(
        lang === "ar"
          ? "تعذر تحميل المصاريف. يرجى المحاولة مجدداً."
          : err instanceof Error
            ? err.message
            : "Impossible de charger les dépenses.",
      );
    } finally {
      setLoading(false);
    }
  }, [lang, origin, period, search, status, tab]);

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
      category: categoryOptions.find((item) => item.fr === row.category || item.value === row.category)?.value ?? "OTHER",
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
      setError(
        lang === "ar"
          ? "تعذر حفظ المصروف. يرجى التحقق من البيانات والمحاولة مجدداً."
          : err instanceof Error
            ? err.message
            : "Erreur pendant l'enregistrement.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirmation = (row: ExpenseRow) => {
    setDeleteError(null);
    setDeleteTarget(row);
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await fetchJson(`/expenses/${deleteTarget.sourceId}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadExpenses();
    } catch (err) {
      setDeleteError(
        lang === "ar"
          ? "تعذر حذف المصروف. يرجى المحاولة مجدداً."
          : err instanceof Error
            ? err.message
            : "Impossible de supprimer la dépense.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const title = lang === "ar" ? "تسيير المصاريف" : "Gestion des Dépenses";
  const subtitle =
    lang === "ar"
      ? "مركز موحد لمتابعة مشتريات الموردين، الرواتب، المصاريف العامة والمبالغ المتبقية."
      : "Centre financier qui regroupe achats fournisseurs, salaires, charges générales et restes à payer.";

  const visibleRows = useMemo(() => rows, [rows]);
  const tableHeaders =
    lang === "ar"
      ? ["التاريخ", "الوصف", "الفئة", "المصدر", "المبلغ", "المدفوع", "الباقي", "الحالة", "الإجراءات"]
      : ["Date", "Description", "Catégorie", "Origine", "Total", "Payé", "Reste", "Statut", "Actions"];

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
        <StatCard title={lang === "ar" ? "مدفوع اليوم" : "Dépenses du jour"} subtitle={lang === "ar" ? "المبلغ المصروف اليوم" : "Payé aujourd'hui"} value={formatMoney(stats.todayPaid, lang)} icon={Wallet} tone="#a87d3c" />
        <StatCard title={lang === "ar" ? "مصاريف الشهر" : "Dépenses du mois"} subtitle={lang === "ar" ? "المصاريف المسجلة" : "Charges enregistrées"} value={formatMoney(stats.monthCharges, lang)} icon={CalendarDays} tone="#b46a66" />
        <StatCard title={lang === "ar" ? "المدفوع فعلياً" : "Montant payé"} subtitle={lang === "ar" ? "حسب الفترة المختارة" : "Décaissement réel"} value={formatMoney(stats.periodPaid, lang)} icon={Wallet} tone="#4d8a6a" />
        <StatCard title={lang === "ar" ? "الباقي للدفع" : "Reste à payer"} subtitle={lang === "ar" ? "ديون ومصاريف غير مسددة" : "Dettes et charges ouvertes"} value={formatMoney(stats.remainingToPay, lang)} icon={AlertCircle} tone="#c98a86" />
        <StatCard title={lang === "ar" ? "رواتب الشهر" : "Salaires du mois"} subtitle={lang === "ar" ? "الرواتب المسجلة" : "Paies enregistrées"} value={formatMoney(stats.payrollMonth, lang)} icon={FileBarChart} tone={palette.primary} />
        <StatCard title={lang === "ar" ? "النتيجة التقديرية" : "Résultat estimé"} subtitle={lang === "ar" ? "المبيعات ناقص المصاريف" : "Ventes moins charges"} value={formatMoney(stats.estimatedResult, lang)} icon={FileBarChart} tone="#6b8aa0" />
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
        <div className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "color-mix(in srgb, var(--app-negative) 12%, transparent)", color: "var(--app-negative)", border: "1px solid color-mix(in srgb, var(--app-negative) 26%, transparent)" }}>
          {error}
        </div>
      ) : null}

      {tab === "reports" ? (
        <ReportsPanel reports={reports} lang={lang} />
      ) : (
        <div className="mt-5 overflow-hidden rounded-[22px]" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, boxShadow: "0 18px 40px -34px rgba(2, 9, 11, 0.7)" }}>
          <div className="overflow-x-auto">
            <table dir={dir} className="w-full min-w-[980px] border-collapse text-sm">
              <thead style={{ backgroundColor: "var(--app-table-header)", color: palette.muted, borderBottom: `1px solid ${palette.borderStrong}` }}>
                <tr>
                  {tableHeaders.map((head) => (
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
                      <div className="mt-1 text-xs">{lang === "ar" ? "تظهر المشتريات والرواتب هنا تلقائياً، ويمكنك أيضاً إضافة مصاريف عامة." : "Les achats fournisseurs et salaires apparaîtront automatiquement ici."}</div>
                      <button type="button" onClick={openCreate} className="mt-4 rounded-2xl px-4 py-2 text-sm font-bold" style={{ backgroundColor: palette.primary, color: "#fff" }}>{lang === "ar" ? "مصروف جديد" : "Nouvelle dépense"}</button>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const statusInfo = statusLabels[safeStatus(row.status)];
                    return (
                      <tr key={row.id} className="expense-row border-t" style={{ borderColor: palette.border }}>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: palette.muted }}>{formatDate(row.date, lang)}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelected(row)} className="text-start font-bold hover:underline" style={{ color: palette.text }}>{row.description}</button>
                          {row.relatedName ? <div className="mt-0.5 text-xs" style={{ color: palette.muted }}>{row.relatedName}</div> : null}
                        </td>
                        <td className="px-4 py-3" style={{ color: palette.text }}>{labelFromCategory(row.category, lang)}</td>
                        <td className="px-4 py-3"><Badge color={palette.primary} bg="color-mix(in srgb, var(--app-primary) 13%, transparent)">{sourceLabels[row.sourceType]?.[lang] ?? row.originLabel}</Badge></td>
                        <td className="px-4 py-3 font-bold" style={{ color: palette.text }}><span dir="ltr">{formatMoney(row.totalAmount, lang)}</span></td>
                        <td className="px-4 py-3" style={{ color: "var(--app-positive)" }}><span dir="ltr">{formatMoney(row.paidAmount, lang)}</span></td>
                        <td className="px-4 py-3" style={{ color: row.remainingAmount > 0 ? "var(--app-negative)" : palette.muted }}><span dir="ltr">{formatMoney(row.remainingAmount, lang)}</span></td>
                        <td className="px-4 py-3"><Badge color={statusInfo.color} bg={statusInfo.bg}>{statusInfo[lang]}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSelected(row)} title={lang === "ar" ? "عرض" : "Voir"} aria-label={lang === "ar" ? "عرض التفاصيل" : "Voir les détails"} style={{ color: palette.primary }}><Eye size={17} /></button>
                            {row.canEdit ? (
                              <>
                                <button type="button" onClick={() => openEdit(row)} title={lang === "ar" ? "تعديل" : "Modifier"} aria-label={lang === "ar" ? "تعديل المصروف" : "Modifier la dépense"} style={{ color: "#a87d3c" }}><Pencil size={17} /></button>
                                <button type="button" onClick={() => openDeleteConfirmation(row)} title={lang === "ar" ? "حذف" : "Supprimer"} aria-label={lang === "ar" ? "حذف المصروف" : "Supprimer la dépense"} style={{ color: "#b46a66" }}><Trash2 size={17} /></button>
                              </>
                            ) : row.route ? (
                              <button type="button" onClick={() => navigate(row.route || "/expenses")} className="rounded-xl px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: palette.accentSoft, color: "var(--app-warning)", border: "1px solid color-mix(in srgb, var(--app-warning) 24%, transparent)" }}>
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

      <div className="mb-10 mt-5 rounded-[20px] p-5" style={{ backgroundColor: "var(--app-warning-panel)", border: "1px solid var(--app-warning-border)", boxShadow: "0 16px 34px -30px rgba(2, 9, 11, 0.75)" }}>
        <div className="mb-3 flex items-center gap-2" style={{ color: "var(--app-warning)", fontWeight: 850 }}>
          <AlertCircle size={17} />
          {lang === "ar" ? "تنبيهات مالية" : "Alertes financières"}
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "لا توجد تنبيهات مهمة حالياً." : "Aucune alerte importante pour le moment."}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {alerts.map((alert) => (
              <button key={alert.id} type="button" onClick={() => alert.route && navigate(alert.route)} className="rounded-2xl p-3 text-start transition-colors hover:bg-[var(--app-table-row-hover)]" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
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
            <Detail label={lang === "ar" ? "التاريخ" : "Date"} value={formatDate(selected.date, lang)} />
            <Detail label={lang === "ar" ? "الفئة" : "Catégorie"} value={labelFromCategory(selected.category, lang)} />
            <Detail label={lang === "ar" ? "المبلغ" : "Montant"} value={formatMoney(selected.totalAmount, lang)} />
            <Detail label={lang === "ar" ? "المدفوع" : "Payé"} value={formatMoney(selected.paidAmount, lang)} />
            <Detail label={lang === "ar" ? "الباقي" : "Reste"} value={formatMoney(selected.remainingAmount, lang)} />
            <Detail label={lang === "ar" ? "الحالة" : "Statut"} value={statusLabels[safeStatus(selected.status)][lang]} />
            {selected.notes ? <Detail label={lang === "ar" ? "ملاحظات" : "Notes"} value={selected.notes} wide /> : null}
          </div>
        </ModalShell>
      ) : null}

      {formOpen ? (
        <ModalShell title={editing ? (lang === "ar" ? "تعديل المصروف" : "Modifier la dépense") : (lang === "ar" ? "مصروف جديد" : "Nouvelle dépense")} onClose={() => setFormOpen(false)}>
          <form dir={dir} onSubmit={(event) => void submitForm(event)} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
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
            <label className="flex items-center gap-2 self-end rounded-2xl px-3 py-3 text-sm font-bold" style={{ backgroundColor: palette.surfaceElevated, border: `1px solid ${palette.border}`, color: palette.text }}>
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
                <Field label={lang === "ar" ? "الاستحقاق القادم" : "Prochaine échéance"}>
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

      {deleteTarget ? (
        <DeleteExpenseConfirmationModal
          expense={deleteTarget}
          lang={lang}
          deleting={deleting}
          error={deleteError}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={() => void confirmDeleteExpense()}
        />
      ) : null}

      <style>{`.field{height:44px;width:100%;border-radius:14px;border:1px solid ${palette.border};background:${palette.surface};padding:0 12px;font-size:14px;color:${palette.text};text-align:start;outline:none}.field:focus{border-color:${palette.primary}}textarea.field{height:auto;padding-top:10px}.expense-row{background:var(--app-surface);transition:background-color .16s ease}.expense-row:nth-child(even){background:var(--app-table-row-alt)}.expense-row:hover{background:var(--app-table-row-hover)}`}</style>
    </PageBackground>
  );
}

function DeleteExpenseConfirmationModal({
  expense,
  lang,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  expense: ExpenseRow;
  lang: "ar" | "fr";
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const statusInfo = statusLabels[safeStatus(expense.status)];
  const hasRemaining = expense.remainingAmount > 0;
  const copy =
    lang === "ar"
      ? {
          title: "تأكيد حذف المصروف",
          heading: "هل تريد حذف هذا المصروف من القائمة؟",
          body: hasRemaining
            ? "هذا المصروف يحتوي على مبلغ باقٍ للدفع. بعد الحذف لن يظهر في قائمة المصاريف، لذلك تأكد من أن العملية صحيحة قبل المتابعة."
            : "سيتم حذف هذا المصروف من القائمة الرئيسية. يمكنك متابعة المصاريف المرتبطة بالموردين أو الرواتب من مصدرها الأصلي.",
          protectedTitle: "تنبيه مهم",
          protectedText:
            "هذه العملية تخص المصاريف اليدوية فقط. المشتريات والرواتب تبقى محفوظة في صفحاتها الأصلية حتى لا يحدث أي تضارب مالي.",
          cancel: "إلغاء",
          confirm: "تأكيد الحذف",
          deleting: "جارٍ الحذف...",
          description: "الوصف",
          category: "الفئة",
          source: "المصدر",
          date: "التاريخ",
          total: "المبلغ",
          paid: "المدفوع",
          remaining: "الباقي",
          status: "الحالة",
        }
      : {
          title: "Confirmer la suppression",
          heading: "Supprimer cette dépense de la liste ?",
          body: hasRemaining
            ? "Cette dépense contient encore un montant restant à régler. Après suppression, elle ne sera plus affichée dans la liste des dépenses."
            : "Cette dépense sera retirée de la liste principale. Les opérations liées aux fournisseurs ou aux salaires restent suivies dans leurs modules d’origine.",
          protectedTitle: "Point de contrôle",
          protectedText:
            "Cette action concerne uniquement les charges modifiables ici. Les achats fournisseurs et les paies restent protégés par leur source pour garder une comptabilité cohérente.",
          cancel: "Annuler",
          confirm: "Supprimer",
          deleting: "Suppression...",
          description: "Description",
          category: "Catégorie",
          source: "Origine",
          date: "Date",
          total: "Montant",
          paid: "Payé",
          remaining: "Reste",
          status: "Statut",
        };

  return (
    <ModalShell title={copy.title} onClose={onCancel}>
      <div className="p-5">
        <div
          className="flex gap-4 rounded-[20px] p-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--app-negative) 10%, var(--app-surface-elevated))",
            border: "1px solid color-mix(in srgb, var(--app-negative) 28%, var(--app-border))",
          }}
        >
          <div
            className="flex size-12 shrink-0 items-center justify-center"
            style={{
              borderRadius: 16,
              backgroundColor: "color-mix(in srgb, var(--app-negative) 15%, transparent)",
              color: "var(--app-negative)",
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ color: palette.text, fontSize: 17, fontWeight: 900 }}>{copy.heading}</h3>
            <p className="mt-2 text-sm leading-7" style={{ color: palette.muted }}>
              {copy.body}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DeleteSummaryItem label={copy.description} value={expense.description} wide />
          <DeleteSummaryItem label={copy.category} value={labelFromCategory(expense.category, lang)} />
          <DeleteSummaryItem label={copy.source} value={sourceLabels[expense.sourceType]?.[lang] ?? expense.originLabel} />
          <DeleteSummaryItem label={copy.date} value={formatDate(expense.date, lang)} />
          <DeleteSummaryItem label={copy.status} value={statusInfo[lang]} />
          <DeleteSummaryItem label={copy.total} value={formatMoney(expense.totalAmount, lang)} strong />
          <DeleteSummaryItem label={copy.paid} value={formatMoney(expense.paidAmount, lang)} tone="positive" />
          <DeleteSummaryItem label={copy.remaining} value={formatMoney(expense.remainingAmount, lang)} tone={hasRemaining ? "negative" : "muted"} />
        </div>

        <div
          className="mt-4 flex gap-3 rounded-[18px] p-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--app-info) 8%, var(--app-surface-elevated))",
            border: "1px solid color-mix(in srgb, var(--app-info) 22%, var(--app-border))",
          }}
        >
          <ShieldCheck className="mt-0.5 shrink-0" size={19} style={{ color: "var(--app-info)" }} />
          <div>
            <div style={{ color: palette.text, fontWeight: 850 }}>{copy.protectedTitle}</div>
            <p className="mt-1 text-sm leading-6" style={{ color: palette.muted }}>
              {copy.protectedText}
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-sm font-bold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--app-negative) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--app-negative) 24%, transparent)",
              color: "var(--app-negative)",
            }}
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="rounded-2xl px-4 py-2 text-sm font-bold transition hover:opacity-80 disabled:opacity-55"
            style={{ border: `1px solid ${palette.border}`, color: palette.muted, backgroundColor: palette.surface }}
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-sm font-bold transition hover:opacity-90 disabled:opacity-60"
            style={{
              backgroundColor: "var(--app-negative)",
              color: "#fff",
              boxShadow: "0 16px 28px -22px var(--app-negative)",
            }}
          >
            <Trash2 size={16} />
            {deleting ? copy.deleting : copy.confirm}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteSummaryItem({
  label,
  value,
  wide = false,
  strong = false,
  tone = "default",
}: {
  label: string;
  value: string;
  wide?: boolean;
  strong?: boolean;
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  const color =
    tone === "positive"
      ? "var(--app-positive)"
      : tone === "negative"
        ? "var(--app-negative)"
        : tone === "muted"
          ? palette.muted
          : palette.text;

  return (
    <div
      className={wide ? "sm:col-span-2" : ""}
      style={{
        backgroundColor: palette.surfaceElevated,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        padding: 13,
      }}
    >
      <div style={{ fontSize: 11.5, color: palette.muted, fontWeight: 750 }}>{label}</div>
      <div className="mt-1 break-words" style={{ fontSize: 14, color, fontWeight: strong ? 900 : 800 }}>
        {value}
      </div>
    </div>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""} style={{ backgroundColor: palette.surfaceElevated, border: `1px solid ${palette.border}`, borderRadius: 16, padding: 13 }}>
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
                <span dir="ltr" style={{ color: palette.muted }}>{formatMoney(item.amount, lang)} · {Math.round(item.percentage).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR")}%</span>
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
          <div className="grid grid-cols-4 gap-2 px-3 text-xs font-bold" style={{ color: palette.muted }}>
            <span>{lang === "ar" ? "الشهر" : "Mois"}</span>
            <span>{lang === "ar" ? "المصاريف" : "Charges"}</span>
            <span>{lang === "ar" ? "المدفوع" : "Payé"}</span>
            <span>{lang === "ar" ? "الباقي" : "Reste"}</span>
          </div>
          {reports.monthlyTrend.map((item) => (
            <div key={item.month} className="grid grid-cols-4 gap-2 rounded-2xl px-3 py-2 text-sm" style={{ backgroundColor: palette.surfaceElevated, border: `1px solid ${palette.border}` }}>
              <span style={{ color: palette.text, fontWeight: 800 }}>{formatMonth(item.month, lang)}</span>
              <span dir="ltr" style={{ color: palette.muted }}>{formatMoney(item.charges, lang)}</span>
              <span dir="ltr" style={{ color: "var(--app-positive)" }}>{formatMoney(item.paid, lang)}</span>
              <span dir="ltr" style={{ color: item.remaining > 0 ? "var(--app-negative)" : palette.muted }}>{formatMoney(item.remaining, lang)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
