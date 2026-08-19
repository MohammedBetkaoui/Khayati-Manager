import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, HandCoins, Landmark, PackageCheck, UserRound, WalletCards } from "lucide-react";
import { useNavigate } from "react-router";
import { LoanRepaymentModal } from "../components/salary/salary-modals";
import { Badge, Button, Select } from "../components/kit";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";
import { money, payrollStatusCode, payrollStatusColors, payrollStatusLabels, salaryTypeCode, salaryTypeLabels, type BalanceRecord, type PayrollRecord, type SalaryPayment } from "./salary-data";

type WorkerOption = { id: number; fullName: string; status: string };
type WorkerInfo = { id: number; fullName: string; phone: string; role: string; salaryType: string; monthlySalary: number; startDate: string; status: string; notes: string };
type FinancialSummary = { totalPaid: number; paidThisMonth: number; lastPayment: { amount: number; date: string } | null; outstandingAdvances: number; outstandingLoans: number; totalToRecover: number; paymentCount: number; totalPieces: number; piecesThisMonth: number; averageWeeklyPieces: number };
type AttendanceRow = { id: number; date: string; status: string; checkIn: string; checkOut: string; lateMinutes: number };
type LoanRecord = BalanceRecord & { repayments?: { id: number; amount: number; date: string; method: string }[] };
type ProfilePayload = { worker: WorkerInfo; financialSummary: FinancialSummary; payrolls: PayrollRecord[]; salaryPayments: SalaryPayment[]; advances: BalanceRecord[]; loans: LoanRecord[] };
type Tab = "payrolls" | "payments" | "advances" | "loans" | "attendance";

const emptySummary: FinancialSummary = { totalPaid: 0, paidThisMonth: 0, lastPayment: null, outstandingAdvances: 0, outstandingLoans: 0, totalToRecover: 0, paymentCount: 0, totalPieces: 0, piecesThisMonth: 0, averageWeeklyPieces: 0 };

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Banknote; color: string }) {
  return <div className="rounded-[18px] p-4" style={{ background: `linear-gradient(145deg, ${palette.surface}, ${color}0b)`, border: `1px solid ${palette.border}` }}><div className="flex items-center justify-between gap-2"><span className="text-xs" style={{ color: palette.muted }}>{label}</span><span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}14` }}><Icon size={16} /></span></div><div className="mt-4 text-lg font-extrabold" style={{ color: palette.text }}>{value}</div></div>;
}

export function WorkerProfilePage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [tab, setTab] = useState<Tab>("payrolls");
  const [loanToRepay, setLoanToRepay] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadWorkers() {
      try {
        const payload = await fetchJson<unknown>("/workers?limit=100&includeArchived=true&sortBy=fullName&sortOrder=ASC");
        if (cancelled) return;
        const next = getArrayFromPayload(payload).map((raw) => { const row = asRecord(raw); return { id: getNumber(row?.id), fullName: getText(row?.fullName), status: getText(row?.status) }; }).filter((item) => item.id > 0);
        setWorkers(next);
        setSelectedWorkerId((current) => current ?? next[0]?.id ?? null);
      } catch (caught) { if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load workers."); }
    }
    void loadWorkers();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedWorkerId) { setProfile(null); setAttendance([]); setLoading(false); return; }
    let cancelled = false;
    async function loadProfile() {
      setLoading(true); setError(null);
      try {
        const [profilePayload, attendancePayload] = await Promise.all([
          fetchJson<ProfilePayload>(`/workers/${selectedWorkerId}/profile`),
          fetchJson<unknown>(`/workers/${selectedWorkerId}/attendance?limit=100`),
        ]);
        if (cancelled) return;
        setProfile(profilePayload);
        setAttendance(getArrayFromPayload(attendancePayload) as AttendanceRow[]);
      } catch (caught) { if (!cancelled) { setProfile(null); setAttendance([]); setError(caught instanceof Error ? caught.message : "Unable to load profile."); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [refreshKey, selectedWorkerId]);

  const worker = profile?.worker;
  const summary = profile?.financialSummary ?? emptySummary;
  const salaryType = worker ? salaryTypeCode(worker.salaryType) : "monthly";
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const archived = worker?.status === "مؤرشف" || worker?.status === "ARCHIVED";
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "payrolls", label: lang === "ar" ? "سجل الرواتب" : "Salaires", count: profile?.payrolls.length ?? 0 },
    { id: "payments", label: lang === "ar" ? "الدفعات" : "Paiements", count: profile?.salaryPayments.length ?? 0 },
    { id: "advances", label: lang === "ar" ? "السلف" : "Avances", count: profile?.advances.length ?? 0 },
    { id: "loans", label: lang === "ar" ? "القروض" : "Prêts", count: profile?.loans.length ?? 0 },
    { id: "attendance", label: lang === "ar" ? "الحضور" : "Présence", count: attendance.length },
  ];

  return <PageBackground>
    <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
      <div className="flex items-center gap-4"><button type="button" onClick={() => navigate("/workers")} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}><BackArrow size={20} /></button><div><div className="flex items-center gap-1.5 text-xs" style={{ color: palette.muted }}><button type="button" onClick={() => navigate("/workers")}>{lang === "ar" ? "العمال" : "Travailleurs"}</button><CrumbChevron size={14} /><span style={{ color: palette.text, fontWeight: 700 }}>{lang === "ar" ? "الملف المهني والمالي" : "Dossier professionnel et financier"}</span></div><h1 className="mt-1 text-2xl font-extrabold" style={{ color: palette.text }}>{lang === "ar" ? "ملف العامل" : "Fiche du travailleur"}</h1></div></div>
      <div className="flex min-w-[280px] items-center gap-2"><Select value={selectedWorkerId ?? ""} onChange={(event) => setSelectedWorkerId(Number(event.target.value))}>{workers.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.status === "مؤرشف" ? (lang === "ar" ? " · مؤرشف" : " · archivé") : ""}</option>)}</Select>{!archived ? <Button variant="primary" onClick={() => navigate("/salary")}><WalletCards size={15} />{lang === "ar" ? "عملية مالية" : "Opération financière"}</Button> : null}</div>
    </div>

    {error ? <div className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ color: "#b46a66", backgroundColor: "rgba(180,106,102,.1)" }}>{error}</div> : null}
    {loading ? <div className="mt-8 text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "جاري تحميل الملف..." : "Chargement du dossier..."}</div> : null}

    {worker && !loading ? <>
      <section className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ color: palette.primary, backgroundColor: palette.accentSoft }}><UserRound size={25} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold" style={{ color: palette.text }}>{worker.fullName}</h2><Badge bg={archived ? "rgba(107,106,98,.14)" : "rgba(77,138,106,.14)"} fg={archived ? "#6b6a62" : "#4d8a6a"}>{worker.status}</Badge></div><p className="mt-1 text-sm" style={{ color: palette.muted }}>{worker.role} · {salaryTypeLabels[salaryType][lang]}</p></div></div><div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm"><span style={{ color: palette.muted }}>{lang === "ar" ? "الهاتف" : "Téléphone"}</span><strong>{worker.phone || "-"}</strong><span style={{ color: palette.muted }}>{lang === "ar" ? "تاريخ الدخول" : "Date d’entrée"}</span><strong>{worker.startDate}</strong><span style={{ color: palette.muted }}>{lang === "ar" ? "العقد" : "Base contractuelle"}</span><strong>{salaryType === "monthly" ? money(worker.monthlySalary, lang) : (lang === "ar" ? "سعر متغير أسبوعياً" : "Prix variable par semaine")}</strong></div></div>
        {worker.notes ? <p className="mt-4 border-t pt-4 text-sm" style={{ borderColor: palette.border, color: palette.muted }}>{worker.notes}</p> : null}
        {archived ? <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ color: "#6b6a62", backgroundColor: "rgba(107,106,98,.1)" }}>{lang === "ar" ? "هذا العامل مؤرشف: ملفه وتاريخه محفوظان، ولا يمكن إنشاء عمليات مالية جديدة له." : "Ce travailleur est archivé : son dossier reste consultable, mais aucune nouvelle opération financière n’est autorisée."}</div> : null}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard label={lang === "ar" ? "إجمالي المدفوع" : "Total versé"} value={money(summary.totalPaid, lang)} icon={Banknote} color="#4d8a6a" />
        <SummaryCard label={lang === "ar" ? "مدفوع هذا الشهر" : "Versé ce mois"} value={money(summary.paidThisMonth, lang)} icon={CalendarDays} color={palette.primary} />
        <SummaryCard label={lang === "ar" ? "آخر دفعة" : "Dernier paiement"} value={summary.lastPayment ? money(summary.lastPayment.amount, lang) : "-"} icon={CircleDollarSign} color="#a87d3c" />
        <SummaryCard label={lang === "ar" ? "السلف المتبقية" : "Avances en cours"} value={money(summary.outstandingAdvances, lang)} icon={HandCoins} color="#c07d4f" />
        <SummaryCard label={lang === "ar" ? "القروض المتبقية" : "Prêts en cours"} value={money(summary.outstandingLoans, lang)} icon={Landmark} color="#4f6a99" />
        <SummaryCard label={lang === "ar" ? "عدد الدفعات" : "Paiements"} value={String(summary.paymentCount)} icon={WalletCards} color="#8b6d9c" />
        <SummaryCard label={lang === "ar" ? "قطع هذا الشهر" : "Pièces ce mois"} value={String(summary.piecesThisMonth)} icon={PackageCheck} color="#b46a66" />
      </div>

      <section className="mt-5 mb-10 overflow-hidden rounded-[22px]" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <div className="flex gap-1 overflow-x-auto px-4 pt-3" style={{ borderBottom: `1px solid ${palette.border}` }}>{tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className="whitespace-nowrap px-4 py-3 text-sm font-bold" style={{ color: tab === item.id ? palette.primary : palette.muted, borderBottom: tab === item.id ? `2px solid ${palette.primary}` : "2px solid transparent" }}>{item.label} <span className="ms-1 text-xs">{item.count}</span></button>)}</div>
        <div className="p-5">{tab === "payrolls" ? <PayrollHistory rows={profile.payrolls} lang={lang} /> : null}{tab === "payments" ? <PaymentHistory rows={profile.salaryPayments} lang={lang} /> : null}{tab === "advances" ? <AdvanceHistory rows={profile.advances} lang={lang} /> : null}{tab === "loans" ? <LoanHistory rows={profile.loans} lang={lang} onRepay={setLoanToRepay} archived={archived} /> : null}{tab === "attendance" ? <AttendanceHistory rows={attendance} lang={lang} /> : null}</div>
      </section>
    </> : null}

    <LoanRepaymentModal open={Boolean(loanToRepay)} onClose={() => setLoanToRepay(null)} onSaved={() => setRefreshKey((value) => value + 1)} loan={loanToRepay} />
  </PageBackground>;
}

function Empty({ lang }: { lang: "ar" | "fr" }) { return <div className="flex min-h-[180px] items-center justify-center text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "لا توجد بيانات مسجلة." : "Aucune donnée enregistrée."}</div>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="overflow-x-auto"><table className="w-full" style={{ minWidth: 760, borderCollapse: "collapse" }}><thead><tr style={{ backgroundColor: palette.bg }}>{headers.map((item) => <th key={item} className="px-3 py-3 text-start text-xs" style={{ color: palette.muted }}>{item}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
const rowStyle = { borderTop: `1px solid ${palette.border}` };

function PayrollHistory({ rows, lang }: { rows: PayrollRecord[]; lang: "ar" | "fr" }) { if (!rows.length) return <Empty lang={lang} />; return <Table headers={lang === "ar" ? ["الفترة", "النوع", "القطع / السعر", "المحسوب", "الاقتطاعات", "المدفوع", "الباقي", "الحالة"] : ["Période", "Type", "Pièces / prix", "Calculé", "Retenues", "Payé", "Reste", "Statut"]}>{rows.map((row) => { const status = payrollStatusCode(row.status); const type = salaryTypeCode(row.salaryType); return <tr key={row.id} style={rowStyle}><td className="px-3 py-3 text-sm">{row.periodStart} → {row.periodEnd}</td><td className="px-3 py-3 text-sm">{salaryTypeLabels[type][lang]}</td><td className="px-3 py-3 text-sm">{type === "piece" ? `${row.piecesCompleted} × ${money(row.piecePrice, lang)}` : `${row.installmentNumber}/${row.installmentsInMonth}`}</td><td className="px-3 py-3 text-sm font-bold">{money(row.grossAmount, lang)}</td><td className="px-3 py-3 text-sm">{money(row.totalDeductions, lang)}</td><td className="px-3 py-3 text-sm" style={{ color: "#4d8a6a" }}>{money(row.paidAmount, lang)}</td><td className="px-3 py-3 text-sm" style={{ color: row.remainingAmount ? "#b46a66" : palette.muted }}>{money(row.remainingAmount, lang)}</td><td className="px-3 py-3"><Badge bg={`${payrollStatusColors[status]}16`} fg={payrollStatusColors[status]}>{payrollStatusLabels[status][lang]}</Badge></td></tr>; })}</Table>; }
function PaymentHistory({ rows, lang }: { rows: SalaryPayment[]; lang: "ar" | "fr" }) { if (!rows.length) return <Empty lang={lang} />; return <Table headers={lang === "ar" ? ["التاريخ", "المبلغ", "الطريقة", "المرجع", "ملاحظات"] : ["Date", "Montant", "Mode", "Référence", "Notes"]}>{rows.map((row) => <tr key={row.id} style={rowStyle}><td className="px-3 py-3 text-sm">{row.date}</td><td className="px-3 py-3 text-sm font-bold" style={{ color: "#4d8a6a" }}>{money(row.amount, lang)}</td><td className="px-3 py-3 text-sm">{row.method}</td><td className="px-3 py-3 text-sm">{row.reference || "-"}</td><td className="px-3 py-3 text-sm">{row.notes || "-"}</td></tr>)}</Table>; }
function AdvanceHistory({ rows, lang }: { rows: BalanceRecord[]; lang: "ar" | "fr" }) { if (!rows.length) return <Empty lang={lang} />; return <Table headers={lang === "ar" ? ["التاريخ", "المبلغ", "المخصوم", "الباقي", "الحالة"] : ["Date", "Montant", "Déduit", "Reste", "Statut"]}>{rows.map((row) => <tr key={row.id} style={rowStyle}><td className="px-3 py-3 text-sm">{row.date}</td><td className="px-3 py-3 text-sm">{money(row.amount ?? 0, lang)}</td><td className="px-3 py-3 text-sm">{money(row.deductedAmount ?? 0, lang)}</td><td className="px-3 py-3 text-sm font-bold">{money(row.remainingAmount, lang)}</td><td className="px-3 py-3 text-sm">{row.status}</td></tr>)}</Table>; }
function LoanHistory({ rows, lang, onRepay, archived }: { rows: LoanRecord[]; lang: "ar" | "fr"; onRepay: (row: LoanRecord) => void; archived: boolean }) { if (!rows.length) return <Empty lang={lang} />; return <Table headers={lang === "ar" ? ["التاريخ", "المبلغ الأصلي", "المسدّد", "الباقي", "الحالة", "الإجراء"] : ["Date", "Montant initial", "Remboursé", "Reste", "Statut", "Action"]}>{rows.map((row) => <tr key={row.id} style={rowStyle}><td className="px-3 py-3 text-sm">{row.date}</td><td className="px-3 py-3 text-sm">{money(row.initialAmount ?? 0, lang)}</td><td className="px-3 py-3 text-sm">{money(row.repaidAmount ?? 0, lang)}</td><td className="px-3 py-3 text-sm font-bold">{money(row.remainingAmount, lang)}</td><td className="px-3 py-3 text-sm">{row.status}</td><td className="px-3 py-3">{row.remainingAmount > 0 && !archived ? <Button variant="secondary" onClick={() => onRepay(row)}>{lang === "ar" ? "تسجيل تسديد" : "Rembourser"}</Button> : "-"}</td></tr>)}</Table>; }
function AttendanceHistory({ rows, lang }: { rows: AttendanceRow[]; lang: "ar" | "fr" }) { if (!rows.length) return <Empty lang={lang} />; return <Table headers={lang === "ar" ? ["التاريخ", "الحالة", "الدخول", "الخروج", "التأخر"] : ["Date", "Statut", "Entrée", "Sortie", "Retard"]}>{rows.map((row) => <tr key={row.id} style={rowStyle}><td className="px-3 py-3 text-sm">{row.date}</td><td className="px-3 py-3 text-sm">{row.status}</td><td className="px-3 py-3 text-sm">{row.checkIn || "-"}</td><td className="px-3 py-3 text-sm">{row.checkOut || "-"}</td><td className="px-3 py-3 text-sm">{row.lateMinutes} min</td></tr>)}</Table>; }
