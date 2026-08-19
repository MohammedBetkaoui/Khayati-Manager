import {
  Calendar,
  Coins,
  Edit,
  FileText,
  Link2,
  Printer,
  RefreshCw,
  Settings,
  ShoppingBag,
  Tag,
  X,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  palette,
  expensesText,
  categoryLabels,
  typeLabels,
  methodLabels,
  linkLabels,
  typeColors,
  methodColors,
} from "../../pages/expenses-data";
import type { ExpenseRecord } from "../../pages/expenses-data";
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

export function ExpenseDetailsBar({
  record,
  onClose,
}: {
  record: ExpenseRecord;
  onClose: () => void;
}) {
  const { lang, dir } = useLanguage();
  const t = expensesText[lang];
  const tp = t.preview;
  const cur = t.currency;

  const mColor = methodColors[record.paymentMethod];
  const tColor = typeColors[record.type];

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
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11.5, color: palette.muted }}>{tp.title}</span>
          </div>
          <span
            style={{ width: 1, height: 22, backgroundColor: palette.border }}
            className="hidden sm:block"
          />
          <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>
            {record.name[lang]}
          </span>
          <Badge bg={`${tColor}14`} fg={tColor}>
            {typeLabels[record.type][lang]}
          </Badge>
          <Badge bg={`${mColor}1f`} fg={mColor} dot={mColor}>
            {methodLabels[record.paymentMethod][lang]}
          </Badge>
          <Badge bg={`${palette.primary}12`} fg={palette.primary}>
            {categoryLabels[record.category][lang]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => {}}>
            <Edit size={15} />
            {tp.actions.edit}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Printer size={15} />
            {tp.actions.print}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <RefreshCw size={15} />
            {tp.actions.repeat}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Link2 size={15} />
            {tp.actions.linkProd}
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
        {/* Col 1: Identification */}
        <div
          className="flex flex-col gap-2.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={FileText}>{tp.name}</SectionTitle>
          <InfoRow
            icon={Tag}
            label={tp.category}
            value={
              <Badge bg={`${palette.primary}12`} fg={palette.primary}>
                {categoryLabels[record.category][lang]}
              </Badge>
            }
          />
          <InfoRow
            icon={Calendar}
            label={tp.date}
            value={<span style={{ direction: "ltr" }}>{record.date}</span>}
          />
          <InfoRow
            icon={ShoppingBag}
            label={tp.supplier}
            value={record.supplier}
          />
          <InfoRow
            icon={Link2}
            label={tp.linkedTo}
            value={linkLabels[record.linkedTo][lang]}
          />
        </div>

        {/* Col 2: Classification */}
        <div
          className="flex flex-col gap-2.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={Settings}>{tp.type}</SectionTitle>
          <div className="flex flex-col gap-2">
            <div style={{ fontSize: 11, color: palette.muted, marginBottom: 2 }}>
              {tp.type}
            </div>
            <Badge bg={`${tColor}14`} fg={tColor}>
              {typeLabels[record.type][lang]}
            </Badge>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div style={{ fontSize: 11, color: palette.muted, marginBottom: 2 }}>
              {tp.method}
            </div>
            <Badge bg={`${mColor}1f`} fg={mColor} dot={mColor}>
              {methodLabels[record.paymentMethod][lang]}
            </Badge>
          </div>
          <InfoRow
            icon={RefreshCw}
            label={tp.isRecurring}
            value={
              <span
                style={{
                  fontWeight: 700,
                  color: record.isRecurring ? palette.primary : palette.muted,
                }}
              >
                {record.isRecurring ? tp.yes : tp.no}
              </span>
            }
          />
          <InfoRow
            icon={Calendar}
            label={tp.lastUpdated}
            value={<span style={{ direction: "ltr" }}>{record.lastUpdated}</span>}
          />
        </div>

        {/* Col 3: Amount */}
        <div
          className="flex flex-col gap-3 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={Coins}>{tp.amount}</SectionTitle>
          <div
            className="flex items-center justify-between rounded-lg p-3"
            style={{
              backgroundColor: "rgba(18,60,74,0.04)",
              border: `1px solid ${palette.border}`,
            }}
          >
            <span style={{ fontSize: 13, color: palette.muted }}>{tp.amount}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: palette.primary }}>
              {record.amount.toLocaleString()}{" "}
              <span style={{ fontSize: 13, fontWeight: 600, color: palette.muted }}>{cur}</span>
            </span>
          </div>

          {record.paymentMethod === "later" && (
            <div
              className="flex items-start gap-2 rounded-lg p-2.5"
              style={{
                backgroundColor: "rgba(180,106,102,0.08)",
                border: `1px solid rgba(180,106,102,0.2)`,
                fontSize: 12,
                color: "#b46a66",
              }}
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{t.alerts.laterDue}</span>
            </div>
          )}

          {record.isRecurring && (
            <div
              className="flex items-start gap-2 rounded-lg p-2.5"
              style={{
                backgroundColor: "rgba(138,110,160,0.08)",
                border: `1px solid rgba(138,110,160,0.2)`,
                fontSize: 12,
                color: "#8a6ea0",
              }}
            >
              <RefreshCw size={14} className="mt-0.5 shrink-0" />
              <span>{t.alerts.recurringDue}</span>
            </div>
          )}
        </div>

        {/* Col 4: Notes */}
        <div className="flex flex-col gap-2">
          <SectionTitle icon={FileText}>
            {tp.notes}
          </SectionTitle>
          {record.notes[lang] ? (
            <div
              style={{
                backgroundColor: palette.bg,
                borderRadius: 10,
                border: `1px solid ${palette.border}`,
                padding: "10px 12px",
                fontSize: 12.5,
                color: palette.text,
                lineHeight: 1.6,
              }}
            >
              {record.notes[lang]}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: palette.muted }}>
              {lang === "ar" ? "لا توجد ملاحظات" : "Aucune note"}
            </div>
          )}

          <div
            className="mt-2 rounded-lg p-3"
            style={{
              backgroundColor: palette.bg,
              border: `1px solid ${palette.border}`,
              fontSize: 12,
            }}
          >
            <div style={{ color: palette.muted, marginBottom: 6 }}>{tp.linkedTo}</div>
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                backgroundColor: `${palette.primary}12`,
                color: palette.primary,
                borderRadius: 999,
                padding: "3px 10px",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {linkLabels[record.linkedTo][lang]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
