import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, AlertCircle, Info, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";
import { palette, salaryText, type PayrollRecord, type PaymentStatus, type SalaryType, type WorkerRole } from "./salary-data";
import { Button } from "../components/kit";
import { SummaryCards } from "../components/salary/summary-cards";
import { PayrollTable } from "../components/salary/payroll-table";
import { SalaryDetailsBar } from "../components/salary/salary-details-bar";
import {
  CalculateSalaryModal,
  AdvanceModal,
  BonusDeductionModal,
  PaymentModal,
} from "../components/salary/salary-modals";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";

const roleMap: Record<string, WorkerRole> = {
  TAILOR: "tailor",
  ASSISTANT: "assistant",
  CUTTER: "cutter",
  IRONING: "ironer",
  PACKAGING: "packer",
  SELLER: "seller",
  SUPERVISOR: "supervisor",
  "خياط": "tailor",
  "مساعد": "assistant",
  "قاطع قماش": "cutter",
  "مسؤول كي": "ironer",
  "مسؤول تغليف": "packer",
  "بائع": "seller",
  "مشرف": "supervisor",
};

const salaryTypeMap: Record<string, SalaryType> = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  PIECE: "piece",
  MIXED: "mixed",
  "يومي": "daily",
  "أسبوعي": "weekly",
  "شهري": "monthly",
  "حسب القطعة": "piece",
  "مختلط": "mixed",
};

const paymentStatusMap: Record<string, PaymentStatus> = {
  PAID: "paid",
  PARTIAL: "partial",
  PARTIALLY_PAID: "partial",
  UNPAID: "unpaid",
  "مدفوع": "paid",
  "مدفوع جزئياً": "partial",
  "غير مدفوع": "unpaid",
};

function formatPeriod(start: string, end: string) {
  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || end || "-";
}

function mapPayrollRecord(raw: unknown): PayrollRecord {
  const record = asRecord(raw);
  const workerName = getText(record?.workerName) || getText(record?.fullName) || getText(record?.worker) || "Sans nom";
  const notes = getText(record?.notes);

  return {
    id: getText(record?.id) || getText(record?.number) || crypto.randomUUID(),
    workerName: { ar: workerName, fr: workerName },
    role: roleMap[getText(record?.role)] ?? "assistant",
    salaryType: salaryTypeMap[getText(record?.salaryType)] ?? "monthly",
    period: formatPeriod(getText(record?.periodStart), getText(record?.periodEnd)) || getText(record?.period),
    workDays: getNumber(record?.workDays ?? record?.workedDays),
    absentDays: getNumber(record?.absentDays),
    lateHours: getNumber(record?.lateHours),
    piecesCount: getNumber(record?.piecesCount ?? record?.piecesCompleted),
    pieceRate: getNumber(record?.pieceRate),
    baseSalary: getNumber(record?.baseSalary),
    bonuses: getNumber(record?.bonuses),
    deductions: getNumber(record?.deductions),
    advances: getNumber(record?.advances),
    netSalary: getNumber(record?.netSalary),
    paidAmount: getNumber(record?.paidAmount),
    paymentDate: getText(record?.paymentDate) || null,
    status: paymentStatusMap[getText(record?.status ?? record?.paymentStatus)] ?? "unpaid",
    notes: { ar: notes, fr: notes },
  };
}

export function SalaryPage() {
  const { lang, dir } = useLanguage();
  const t = salaryText[lang];
  const cur = t.currency;
  const navigate = useNavigate();

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [bonOpen, setBonOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/payroll");
        if (cancelled) return;

        const nextRecords = getArrayFromPayload(payload).map(mapPayrollRecord);
        setRecords(nextRecords);
        setSelectedId((current) => current ?? nextRecords[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setRecords([]);
        setSelectedId(null);
        setError(err instanceof Error ? err.message : "Unable to load payroll.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (tab === "paid" && record.status !== "paid") return false;
      if (tab === "unpaid" && record.status === "paid") return false;
      if (tab === "advances" && record.advances === 0) return false;
      if (tab === "bonuses" && record.bonuses === 0 && record.deductions === 0) return false;
      return true;
    });
  }, [records, tab]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;
  const totalSalaries = `${records.reduce((sum, record) => sum + record.netSalary, 0).toLocaleString()} ${cur}`;
  const paidSalaries = `${records.reduce((sum, record) => sum + record.paidAmount, 0).toLocaleString()} ${cur}`;
  const unpaidSalaries = `${records.reduce((sum, record) => sum + Math.max(0, record.netSalary - record.paidAmount), 0).toLocaleString()} ${cur}`;
  const totalAdvances = `${records.reduce((sum, record) => sum + record.advances, 0).toLocaleString()} ${cur}`;
  const netBonuses = `${records.reduce((sum, record) => sum + record.bonuses - record.deductions, 0).toLocaleString()} ${cur}`;

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs = [
    { id: "all", label: t.tabs.all },
    { id: "paid", label: t.tabs.paid },
    { id: "unpaid", label: t.tabs.unpaid },
    { id: "advances", label: t.tabs.advances },
    { id: "bonuses", label: t.tabs.bonuses },
    { id: "reports", label: t.tabs.reports },
  ];

  return (
    <PageBackground>
      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex items-center gap-4">
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
        <Button variant="primary" onClick={() => navigate("/worker-profile")}>
          <UserRound size={15} />
          {lang === "ar" ? "فتح ملف العامل" : "Ouvrir fiche travailleur"}
        </Button>
      </div>

      <div className="mt-6">
        <SummaryCards
          totalSalaries={totalSalaries}
          paidSalaries={paidSalaries}
          unpaidSalaries={unpaidSalaries}
          totalAdvances={totalAdvances}
          netBonuses={netBonuses}
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
          <SalaryDetailsBar
            record={selectedRecord}
            onClose={() => setSelectedId(null)}
            onPay={() => setPayOpen(true)}
            onAdvance={() => setAdvOpen(true)}
            onBonus={() => setBonOpen(true)}
          />
        </div>
      ) : null}

      <div className="mt-5 pb-10">
        {loading ? (
          <div className="mb-4 text-sm" style={{ color: palette.muted }}>
            {lang === "ar" ? "جاري تحميل بيانات الرواتب..." : "Chargement des donnees de paie..."}
          </div>
        ) : null}
        {!loading && error ? (
          <div className="mb-4 text-sm" style={{ color: "#b46a66" }}>
            {lang === "ar" ? "تعذر تحميل الرواتب من الواجهة الخلفية." : "Impossible de charger les salaires depuis l'API."}
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
          <PayrollTable records={filteredRecords} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            style={{
              backgroundColor: palette.surface,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              padding: "16px 20px",
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Info size={16} style={{ color: palette.primary }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{t.helpers.title}</span>
            </div>
            <ul className="flex flex-col gap-2" style={{ fontSize: 12, color: palette.muted }}>
              <li><span className="font-semibold" style={{ color: palette.text }}>{t.helpers.daily.split(":")[0]}:</span> {t.helpers.daily.split(":")[1]}</li>
              <li><span className="font-semibold" style={{ color: palette.text }}>{t.helpers.weekly.split(":")[0]}:</span> {t.helpers.weekly.split(":")[1]}</li>
              <li><span className="font-semibold" style={{ color: palette.text }}>{t.helpers.monthly.split(":")[0]}:</span> {t.helpers.monthly.split(":")[1]}</li>
              <li><span className="font-semibold" style={{ color: palette.text }}>{t.helpers.piece.split(":")[0]}:</span> {t.helpers.piece.split(":")[1]}</li>
              <li><span className="font-semibold" style={{ color: palette.text }}>{t.helpers.mixed.split(":")[0]}:</span> {t.helpers.mixed.split(":")[1]}</li>
            </ul>
          </div>

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
              <span style={{ fontSize: 14, fontWeight: 700, color: "#a87d3c" }}>{t.alerts.title}</span>
            </div>
            <ul className="flex flex-col gap-2" style={{ fontSize: 12, color: "#8a6d3f" }}>
              <li className="flex items-start gap-1.5"><span className="mt-0.5">•</span> {t.alerts.adv}</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5">•</span> {t.alerts.latePay}</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5">•</span> {t.alerts.absReview}</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5">•</span> {t.alerts.pieceCalc}</li>
            </ul>
          </div>
        </div>
      </div>

      <CalculateSalaryModal open={calcOpen} onClose={() => setCalcOpen(false)} />
      <AdvanceModal open={advOpen} onClose={() => setAdvOpen(false)} />
      <BonusDeductionModal open={bonOpen} onClose={() => setBonOpen(false)} />
      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} record={selectedRecord} />
    </PageBackground>
  );
}
