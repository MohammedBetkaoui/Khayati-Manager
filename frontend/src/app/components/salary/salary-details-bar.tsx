import {
  User,
  Briefcase,
  Calendar,
  CalendarDays,
  Coins,
  CheckCircle2,
  Printer,
  ArrowDownUp,
  PlusCircle,
  X,
  AlertCircle,
  Clock,
  Scissors,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  palette,
  salaryText,
  paymentStatusColors,
  paymentStatusLabels,
  salaryTypeLabels,
  roleLabels,
} from "../../pages/salary-data";
import type { PayrollRecord } from "../../pages/salary-data";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ fontSize: 12.5 }}>
      <span className="flex items-center gap-1.5" style={{ color: palette.muted }}>
        <Icon size={14} strokeWidth={1.9} />
        {label}
      </span>
      <span style={{ fontWeight: 600, color: palette.text, textAlign: "end" }}>{value}</span>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
      <Icon size={14} strokeWidth={2} style={{ color: palette.primary }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: palette.text, letterSpacing: 0.1 }}>
        {children}
      </span>
    </div>
  );
}

function CostLine({
  label,
  value,
  cur,
  strong,
  color,
}: {
  label: string;
  value: number;
  cur: string;
  strong?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
      <span style={{ color: palette.muted }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, color: color ?? palette.text }}>
        {value.toLocaleString()}{" "}
        <span style={{ fontSize: 10.5, fontWeight: 600, color: palette.muted }}>{cur}</span>
      </span>
    </div>
  );
}

export function SalaryDetailsBar({
  record,
  onClose,
  onPay,
  onAdvance,
  onBonus,
}: {
  record: PayrollRecord;
  onClose: () => void;
  onPay: () => void;
  onAdvance: () => void;
  onBonus: () => void;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang];
  const tp = t.preview;
  const cur = t.currency;

  const statusColor = paymentStatusColors[record.status];
  const initials = record.workerName[lang]
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("");

  return (
    <div
      className="relative animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        overflow: "hidden",
      }}
    >
      {/* Top strip: identity + actions */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
        style={{
          backgroundColor: "rgba(18,60,74,0.04)",
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Avatar */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: palette.accentSoft,
              color: palette.accent,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {initials}
          </div>
          <span style={{ fontSize: 11.5, color: palette.muted }}>{tp.title}</span>
          <span
            style={{ width: 1, height: 22, backgroundColor: palette.border }}
            className="hidden sm:block"
          />
          <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>
            {record.workerName[lang]}
          </span>
          <Badge bg={`${palette.primary}12`} fg={palette.primary}>
            {roleLabels[record.role][lang]}
          </Badge>
          <Badge bg={`${palette.accent}1f`} fg={palette.accent}>
            {salaryTypeLabels[record.salaryType][lang]}
          </Badge>
          <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
            {paymentStatusLabels[record.status][lang]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={onPay} disabled={record.status === "paid"}>
            <CheckCircle2 size={15} />
            {tp.actions.confirmPay}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Printer size={15} />
            {tp.actions.print}
          </Button>
          <Button variant="secondary" onClick={onAdvance}>
            <ArrowDownUp size={15} />
            {tp.actions.addAdvance}
          </Button>
          <Button variant="secondary" onClick={onBonus}>
            <PlusCircle size={15} />
            {tp.actions.addBonus}
          </Button>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="flex items-center justify-center transition-colors hover:opacity-70"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              color: palette.muted,
              border: `1px solid ${palette.border}`,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Columns grid */}
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Col 1: Worker identity */}
        <div
          className="flex flex-col gap-2.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={User}>{tp.workerName}</SectionTitle>
          <InfoRow icon={User} label={tp.workerName} value={record.workerName[lang]} />
          <InfoRow
            icon={Briefcase}
            label={tp.role}
            value={
              <Badge bg={`${palette.primary}12`} fg={palette.primary}>
                {roleLabels[record.role][lang]}
              </Badge>
            }
          />
          <InfoRow
            icon={Coins}
            label={tp.type}
            value={
              <Badge bg={`${palette.accent}1f`} fg={palette.accent}>
                {salaryTypeLabels[record.salaryType][lang]}
              </Badge>
            }
          />
          <InfoRow icon={Calendar} label={tp.period} value={record.period} />
          {record.paymentDate && (
            <InfoRow
              icon={CalendarDays}
              label={tp.payDate}
              value={<span style={{ direction: "ltr" }}>{record.paymentDate}</span>}
            />
          )}
        </div>

        {/* Col 2: Work statistics */}
        <div
          className="flex flex-col gap-2.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={CalendarDays}>{tp.workDays}</SectionTitle>
          <InfoRow
            icon={CalendarDays}
            label={tp.workDays}
            value={
              <span style={{ fontWeight: 700 }}>
                {record.workDays}{" "}
                <span style={{ fontSize: 11, fontWeight: 500, color: palette.muted }}>
                  {lang === "ar" ? "يوم" : "j"}
                </span>
              </span>
            }
          />
          <InfoRow
            icon={AlertCircle}
            label={tp.absentDays}
            value={
              <span style={{ fontWeight: 700, color: record.absentDays > 0 ? "#b46a66" : palette.text }}>
                {record.absentDays}{" "}
                <span style={{ fontSize: 11, fontWeight: 500, color: palette.muted }}>
                  {lang === "ar" ? "يوم" : "j"}
                </span>
              </span>
            }
          />
          <InfoRow
            icon={Clock}
            label={tp.lateHours}
            value={
              <span style={{ fontWeight: 700, color: record.lateHours > 0 ? "#a87d3c" : palette.text }}>
                {record.lateHours}{" "}
                <span style={{ fontSize: 11, fontWeight: 500, color: palette.muted }}>
                  {lang === "ar" ? "س" : "h"}
                </span>
              </span>
            }
          />
          {(record.salaryType === "piece" || record.salaryType === "mixed") && (
            <>
              <InfoRow
                icon={Scissors}
                label={tp.piecesCount}
                value={
                  <span style={{ fontWeight: 700 }}>
                    {record.piecesCount}{" "}
                    <span style={{ fontSize: 11, fontWeight: 500, color: palette.muted }}>
                      {lang === "ar" ? "قطعة" : "pcs"}
                    </span>
                  </span>
                }
              />
              <InfoRow
                icon={Coins}
                label={tp.pieceRate}
                value={
                  <span style={{ fontWeight: 700 }}>
                    {record.pieceRate}{" "}
                    <span style={{ fontSize: 10.5, fontWeight: 500, color: palette.muted }}>{cur}</span>
                  </span>
                }
              />
            </>
          )}
        </div>

        {/* Col 3: Financial breakdown */}
        <div
          className="flex flex-col gap-1.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={Coins}>{tp.netSalary}</SectionTitle>
          <CostLine label={tp.baseSalary} value={record.baseSalary} cur={cur} />
          {record.bonuses > 0 && (
            <CostLine label={`${tp.bonus} (+)`} value={record.bonuses} cur={cur} color="#4d8a6a" />
          )}
          {record.deductions > 0 && (
            <CostLine label={`${tp.deduction} (−)`} value={record.deductions} cur={cur} color="#b46a66" />
          )}
          {record.advances > 0 && (
            <CostLine label={`${tp.advance} (−)`} value={record.advances} cur={cur} color="#a87d3c" />
          )}
          <div style={{ height: 1, backgroundColor: palette.borderStrong, margin: "4px 0" }} />
          <CostLine
            label={tp.netSalary}
            value={record.netSalary}
            cur={cur}
            strong
            color={palette.primary}
          />
          <div style={{ height: 1, backgroundColor: palette.border, margin: "4px 0" }} />
          <CostLine
            label={lang === "ar" ? "المدفوع" : "Payé"}
            value={record.paidAmount}
            cur={cur}
            color="#4d8a6a"
          />
          <CostLine
            label={lang === "ar" ? "المتبقي" : "Reste"}
            value={record.netSalary - record.paidAmount}
            cur={cur}
            strong
            color={record.netSalary - record.paidAmount > 0 ? "#b46a66" : palette.muted}
          />
        </div>

        {/* Col 4: Status + notes */}
        <div className="flex flex-col gap-3">
          <SectionTitle icon={CheckCircle2}>{tp.status}</SectionTitle>

          <div
            className="flex items-center justify-between rounded-lg p-3"
            style={{
              backgroundColor: `${statusColor}10`,
              border: `1px solid ${statusColor}30`,
            }}
          >
            <span style={{ fontSize: 13, color: palette.muted }}>{tp.status}</span>
            <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
              {paymentStatusLabels[record.status][lang]}
            </Badge>
          </div>

          {record.advances > 0 && (
            <div
              className="flex items-start gap-2 rounded-lg p-2.5"
              style={{
                backgroundColor: "rgba(168,125,60,0.08)",
                border: `1px solid rgba(168,125,60,0.2)`,
                fontSize: 12,
                color: "#a87d3c",
              }}
            >
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{t.alerts.adv}</span>
            </div>
          )}

          {record.absentDays > 0 && (
            <div
              className="flex items-start gap-2 rounded-lg p-2.5"
              style={{
                backgroundColor: "rgba(180,106,102,0.08)",
                border: `1px solid rgba(180,106,102,0.2)`,
                fontSize: 12,
                color: "#b46a66",
              }}
            >
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{t.alerts.absReview}</span>
            </div>
          )}

          {record.notes[lang] ? (
            <div>
              <div style={{ fontSize: 11, color: palette.muted, marginBottom: 4 }}>{tp.notes}</div>
              <div
                style={{
                  backgroundColor: palette.bg,
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  padding: "8px 10px",
                  fontSize: 11.5,
                  color: palette.text,
                  lineHeight: 1.55,
                }}
              >
                {record.notes[lang]}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
