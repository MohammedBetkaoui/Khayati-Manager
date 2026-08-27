import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarRange, ChevronLeft, ChevronRight, HandCoins, Plus, Search, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { Button, Select, TextInput } from "../components/kit";
import { PageBackground } from "../components/page-background";
import { PayrollTable } from "../components/salary/payroll-table";
import { SalaryDetailsModal } from "../components/salary/salary-details-bar";
import { SummaryCards } from "../components/salary/summary-cards";
import { AdvanceModal, CalculateSalaryModal, CancelPayrollModal, DeletePayrollModal, PaymentModal } from "../components/salary/salary-modals";
import { useLanguage } from "../language-context";
import { fetchJson, getArrayFromPayload } from "../lib/api";
import { palette, type DashboardStats, type PayrollRecord, type WorkerOption } from "./salary-data";

const emptyStats: DashboardStats = { activeWorkers: 0, salariesDueThisWeek: 0, paidThisWeek: 0, remainingToPay: 0, activeAdvances: 0 };

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateKey(start), end: dateKey(end) };
}

function shiftWeek(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount * 7);
  return dateKey(date);
}

export function SalaryPage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const initialWeek = useMemo(currentWeek, []);
  const [startDate, setStartDate] = useState(initialWeek.start);
  const [endDate, setEndDate] = useState(initialWeek.end);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [salaryType, setSalaryType] = useState("all");
  const [status, setStatus] = useState("all");
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<PayrollRecord | null>(null);
  const [cancelRecord, setCancelRecord] = useState<PayrollRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ startDate, endDate, page: "1", limit: "100" });
    if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
    if (salaryType !== "all") params.set("salaryType", salaryType);
    if (status !== "all") params.set("status", status);
    return params.toString();
  }, [deferredSearch, endDate, salaryType, startDate, status]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [payrollPayload, statsPayload, workersPayload] = await Promise.all([
          fetchJson<unknown>(`/payroll?${query}`),
          fetchJson<DashboardStats>(`/payroll/dashboard?startDate=${startDate}&endDate=${endDate}`),
          fetchJson<unknown>(`/workers?status=${encodeURIComponent("نشط")}&limit=100&sortBy=fullName&sortOrder=ASC`),
        ]);
        if (cancelled) return;
        const nextRecords = getArrayFromPayload(payrollPayload) as PayrollRecord[];
        setRecords(nextRecords);
        setStats(statsPayload);
        setWorkers(getArrayFromPayload(workersPayload) as WorkerOption[]);
        setSelectedId((current) => nextRecords.some((item) => item.id === current) ? current : null);
      } catch (caught) {
        if (!cancelled) { setRecords([]); setStats(emptyStats); setError(caught instanceof Error ? caught.message : "Unable to load payroll."); }
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [endDate, query, refreshKey, startDate]);

  const selected = records.find((record) => record.id === selectedId) ?? null;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const refresh = () => setRefreshKey((value) => value + 1);

  function moveWeek(amount: number) {
    setStartDate((value) => shiftWeek(value, amount));
    setEndDate((value) => shiftWeek(value, amount));
  }

  function afterPayrollCancelled() {
    if (cancelRecord?.id === selectedId) setSelectedId(null);
    setCancelRecord(null);
    refresh();
  }

  function afterPayrollDeleted() {
    if (deleteRecord?.id === selectedId) setSelectedId(null);
    setDeleteRecord(null);
    refresh();
  }

  return (
    <PageBackground>
      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate("/")} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}><BackArrow size={20} /></button>
          <div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}><button type="button" onClick={() => navigate("/")}>{lang === "ar" ? "الرئيسية" : "Accueil"}</button><CrumbChevron size={14} /><span style={{ color: palette.text, fontWeight: 600 }}>{lang === "ar" ? "تسيير الرواتب" : "Gestion des salaires"}</span></div>
            <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "تسيير الرواتب الأسبوعية" : "Gestion des paies hebdomadaires"}</h1>
            <p className="mt-1" style={{ fontSize: 13.5, color: palette.muted }}>{lang === "ar" ? "حساب الأجور، الدفعات الجزئية والسلف مع حفظ السجل المالي كاملاً." : "Calculs, paiements partiels et avances avec un historique financier durable."}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate("/worker-profile")}><UserRound size={15} />{lang === "ar" ? "ملفات العمال" : "Dossiers travailleurs"}</Button>
      </div>

      <div className="mt-6"><SummaryCards stats={stats} /></div>

      <section className="mt-5 rounded-[20px] p-4" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => moveWeek(-1)}><ChevronLeft size={16} />{lang === "ar" ? "الأسبوع السابق" : "Semaine précédente"}</Button>
            <div className="flex items-center gap-2 rounded-xl px-3" style={{ height: 40, backgroundColor: palette.bg, color: palette.text }}><CalendarRange size={16} color={palette.accent} /><input aria-label="start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="bg-transparent text-sm outline-none" /><span>→</span><input aria-label="end date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="bg-transparent text-sm outline-none" /></div>
            <Button variant="secondary" onClick={() => moveWeek(1)}>{lang === "ar" ? "الأسبوع التالي" : "Semaine suivante"}<ChevronRight size={16} /></Button>
            <Button variant="ghost" onClick={() => { const week = currentWeek(); setStartDate(week.start); setEndDate(week.end); }}>{lang === "ar" ? "الأسبوع الحالي" : "Cette semaine"}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAdvanceOpen(true)}><HandCoins size={15} />{lang === "ar" ? "سلفة" : "Avance"}</Button>
            <Button variant="primary" onClick={() => setPayrollOpen(true)}><Plus size={16} />{lang === "ar" ? "راتب جديد" : "Nouvelle paie"}</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_220px_220px]">
          <div className="relative"><Search size={16} className="absolute top-1/2 -translate-y-1/2" style={{ insetInlineStart: 13, color: palette.muted }} /><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === "ar" ? "البحث عن عامل..." : "Rechercher un travailleur..."} style={{ paddingInlineStart: 38 }} /></div>
          <Select value={salaryType} onChange={(event) => setSalaryType(event.target.value)}><option value="all">{lang === "ar" ? "كل أنواع الأجر" : "Tous les types"}</option><option value="MONTHLY">{lang === "ar" ? "شهري" : "Mensuel"}</option><option value="PIECE">{lang === "ar" ? "حسب القطعة" : "À la pièce"}</option></Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{lang === "ar" ? "كل الحالات" : "Tous les statuts"}</option><option value="CALCULATED">{lang === "ar" ? "محسوب" : "Calculé"}</option><option value="PARTIALLY_PAID">{lang === "ar" ? "جزئي" : "Partiel"}</option><option value="PAID">{lang === "ar" ? "مدفوع" : "Payé"}</option><option value="CANCELLED">{lang === "ar" ? "ملغى" : "Annulé"}</option></Select>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ color: "#b46a66", backgroundColor: "rgba(180,106,102,.1)" }}>{error}</div> : null}
      <section className="mt-5 mb-10 overflow-hidden rounded-[20px]" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}><h2 style={{ color: palette.text, fontWeight: 800 }}>{lang === "ar" ? "قائمة الرواتب" : "Paies de la période"}</h2>{loading ? <span className="text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "جاري التحميل..." : "Chargement..."}</span> : <span className="text-sm" style={{ color: palette.muted }}>{records.length}</span>}</div>
        <PayrollTable records={records} selectedId={selectedId} onSelect={setSelectedId} onCancel={setCancelRecord} onPay={setPaymentRecord} onDelete={setDeleteRecord} />
      </section>

      <SalaryDetailsModal open={Boolean(selected)} record={selected} onClose={() => setSelectedId(null)} onPay={() => selected && setPaymentRecord(selected)} onCancel={() => { if (selected) { setCancelRecord(selected); setSelectedId(null); } }} onDelete={() => selected && setDeleteRecord(selected)} />
      <CalculateSalaryModal open={payrollOpen} onClose={() => setPayrollOpen(false)} onSaved={refresh} workers={workers} periodStart={startDate} periodEnd={endDate} />
      <AdvanceModal open={advanceOpen} onClose={() => setAdvanceOpen(false)} onSaved={refresh} workers={workers} />
      <PaymentModal open={Boolean(paymentRecord)} onClose={() => setPaymentRecord(null)} onSaved={refresh} record={paymentRecord} />
      <CancelPayrollModal open={Boolean(cancelRecord)} onClose={() => setCancelRecord(null)} onCancelled={afterPayrollCancelled} record={cancelRecord} />
      <DeletePayrollModal open={Boolean(deleteRecord)} onClose={() => setDeleteRecord(null)} onDeleted={afterPayrollDeleted} record={deleteRecord} />
    </PageBackground>
  );
}
