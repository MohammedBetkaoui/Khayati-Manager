import { Printer, HandCoins, ArrowDownUp, PlusCircle, CheckCircle2, FileText, User } from "lucide-react";
import { palette, salaryText, paymentStatusColors, paymentStatusLabels, salaryTypeLabels, roleLabels } from "../../pages/salary-data";
import type { PayrollRecord } from "../../pages/salary-data";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";

export function PayslipPreview({
  record,
  onPay,
}: {
  record: PayrollRecord | null;
  onPay: () => void;
}) {
  const { lang, dir } = useLanguage();
  const t = salaryText[lang].preview;
  const cur = salaryText[lang].currency;

  if (!record) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center text-center p-8"
        style={{ color: palette.muted }}
      >
        <FileText size={48} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 16 }} />
        <p>{t.empty}</p>
      </div>
    );
  }

  const statusColor = paymentStatusColors[record.status];

  return (
    <div className="flex flex-col gap-5">
      {/* Official Print-like Payslip Box */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 4px 20px -8px rgba(0,0,0,0.08)",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="absolute top-0 end-0" style={{ width: 0, height: 0, borderTop: "30px solid #f9f9f9", borderInlineStart: "30px solid transparent" }} />

        <div className="flex items-start justify-between">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: palette.primary }}>{t.workshopName}</div>
            <div style={{ fontSize: 12, color: palette.muted, marginTop: 4 }}>{t.payslipTitle} - {record.period}</div>
          </div>
          <div style={{ textAlign: "end" }}>
            <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
              {paymentStatusLabels[record.status][lang]}
            </Badge>
            {record.paymentDate && (
              <div style={{ fontSize: 11, color: palette.muted, marginTop: 6, direction: "ltr" }}>{record.paymentDate}</div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-black/5 p-3 flex gap-3 items-center">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: palette.accentSoft, color: palette.accent, fontWeight: 700 }}
          >
            {record.workerName[lang].split(" ").slice(0, 2).map(w => w[0]).join("")}
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{record.workerName[lang]}</div>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ fontSize: 12, color: palette.muted }}>{roleLabels[record.role][lang]}</span>
              <span style={{ fontSize: 10, color: palette.borderStrong }}>•</span>
              <span style={{ fontSize: 12, color: palette.muted }}>{salaryTypeLabels[record.salaryType][lang]}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center" style={{ fontSize: 12 }}>
          <div className="p-2 border rounded-lg" style={{ borderColor: palette.border }}>
            <div style={{ color: palette.muted }}>{t.workDays}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{record.workDays}</div>
          </div>
          <div className="p-2 border rounded-lg" style={{ borderColor: palette.border }}>
            <div style={{ color: palette.muted }}>{t.absentDays}</div>
            <div style={{ fontWeight: 700, color: record.absentDays > 0 ? "#b46a66" : palette.text, marginTop: 2 }}>{record.absentDays}</div>
          </div>
          <div className="p-2 border rounded-lg" style={{ borderColor: palette.border }}>
            <div style={{ color: palette.muted }}>{t.piecesCount}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{record.piecesCount}</div>
          </div>
          <div className="p-2 border rounded-lg" style={{ borderColor: palette.border }}>
            <div style={{ color: palette.muted }}>{t.pieceRate}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{record.pieceRate} {cur}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2" style={{ fontSize: 13 }}>
          <div className="flex justify-between border-b pb-2" style={{ borderColor: palette.border }}>
            <span style={{ fontWeight: 600 }}>{t.baseSalary}</span>
            <span style={{ fontWeight: 600 }}>{record.baseSalary.toLocaleString()} {cur}</span>
          </div>
          {record.bonuses > 0 && (
            <div className="flex justify-between text-muted-foreground pt-1" style={{ color: "#4d8a6a" }}>
              <span>{t.bonus} (+)</span>
              <span>{record.bonuses.toLocaleString()} {cur}</span>
            </div>
          )}
          {record.deductions > 0 && (
            <div className="flex justify-between text-muted-foreground pt-1" style={{ color: "#b46a66" }}>
              <span>{t.deduction} (-)</span>
              <span>{record.deductions.toLocaleString()} {cur}</span>
            </div>
          )}
          {record.advances > 0 && (
            <div className="flex justify-between text-muted-foreground pt-1" style={{ color: "#a87d3c" }}>
              <span>{t.advance} (-)</span>
              <span>{record.advances.toLocaleString()} {cur}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 mt-1" style={{ fontSize: 15, fontWeight: 800, color: palette.primary, borderColor: palette.borderStrong }}>
            <span>{t.netSalary}</span>
            <span>{record.netSalary.toLocaleString()} {cur}</span>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={onPay} disabled={record.status === "paid"}>
          <CheckCircle2 size={15} />
          {t.actions.confirmPay}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Printer size={15} />
          {t.actions.print}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <ArrowDownUp size={15} />
          {t.actions.addAdvance}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <PlusCircle size={15} />
          {t.actions.addBonus}
        </Button>
      </div>
    </div>
  );
}
