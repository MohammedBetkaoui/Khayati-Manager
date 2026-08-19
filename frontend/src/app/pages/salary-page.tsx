import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, AlertCircle, Info, UserRound } from "lucide-react";
import { useNavigate } from "react-router";


import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";

import { palette, salaryText, mockPayroll } from "./salary-data";
import { Button } from "../components/kit";
import { SummaryCards } from "../components/salary/summary-cards";
import { PayrollTable } from "../components/salary/payroll-table";
import { SalaryDetailsBar } from "../components/salary/salary-details-bar";
import {
  CalculateSalaryModal,
  AdvanceModal,
  BonusDeductionModal,
  PaymentModal
} from "../components/salary/salary-modals";

export function SalaryPage() {
  const { lang, dir } = useLanguage();
  const t = salaryText[lang];
  const cur = t.currency;
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(mockPayroll[0]?.id || null);
  const [tab, setTab] = useState<string>("all");

  const [calcOpen, setCalcOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [bonOpen, setBonOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  // Derive summary metrics
  const totalSalaries = mockPayroll.reduce((s, r) => s + r.netSalary, 0).toLocaleString() + " " + cur;
  const paidSalaries = mockPayroll.filter(r => r.status === "paid" || r.status === "partial").reduce((s, r) => s + r.paidAmount, 0).toLocaleString() + " " + cur;
  const unpaidSalaries = mockPayroll.reduce((s, r) => s + (r.netSalary - r.paidAmount), 0).toLocaleString() + " " + cur;
  const totalAdvances = mockPayroll.reduce((s, r) => s + r.advances, 0).toLocaleString() + " " + cur;
  const netBonuses = mockPayroll.reduce((s, r) => s + r.bonuses - r.deductions, 0).toLocaleString() + " " + cur;

  const filteredRecords = useMemo(() => {
    return mockPayroll.filter((rec) => {
      if (tab === "paid" && rec.status !== "paid") return false;
      if (tab === "unpaid" && rec.status === "paid") return false;
      if (tab === "advances" && rec.advances === 0) return false;
      if (tab === "bonuses" && rec.bonuses === 0 && rec.deductions === 0) return false;
      return true;
    });
  }, [tab]);

  const selectedRecord = mockPayroll.find((r) => r.id === selectedId) || null;

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

      {/* Salary details bar — shown when a record is selected */}
      {selectedRecord && (
        <div className="mt-5">
          <SalaryDetailsBar
            record={selectedRecord}
            onClose={() => setSelectedId(null)}
            onPay={() => setPayOpen(true)}
            onAdvance={() => setAdvOpen(true)}
            onBonus={() => setBonOpen(true)}
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
          <PayrollTable records={filteredRecords} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Salary Types Helper & Alerts */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            style={{
              backgroundColor: palette.surface,
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              padding: "16px 20px",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
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
              border: `1px solid #eaddcb`,
              padding: "16px 20px",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
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
