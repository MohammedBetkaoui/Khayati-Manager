import {
  Phone,
  CalendarDays,
  User,
  FileText,
  CreditCard,
  Printer,
  Edit,
  ExternalLink,
  X,
  Coins,
  AlertCircle,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  palette,
  salesText,
  paymentStatusColors,
  paymentStatusLabels,
  paymentMethodLabels,
} from "../../pages/sales-data";
import type { Invoice } from "../../pages/sales-data";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";
import { useNavigate } from "react-router";

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

export function InvoiceDetailsBar({
  invoice,
  onClose,
  onRecordPayment,
}: {
  invoice: Invoice;
  onClose: () => void;
  onRecordPayment: () => void;
}) {
  const { lang } = useLanguage();
  const t = salesText[lang];
  const tp = t.preview;
  const cur = t.currency;
  const navigate = useNavigate();

  const statusColor = paymentStatusColors[invoice.status];

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
            <span
              style={{ direction: "ltr", fontSize: 18, fontWeight: 800, color: palette.primary }}
            >
              #{invoice.number}
            </span>
          </div>
          <span
            style={{ width: 1, height: 22, backgroundColor: palette.border }}
            className="hidden sm:block"
          />
          <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>
            {invoice.customerName[lang]}
          </span>
          <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
            {paymentStatusLabels[invoice.status][lang]}
          </Badge>
          {invoice.methods.map((m) => (
            <Badge key={m} bg={`${palette.accent}1f`} fg={palette.accent}>
              {paymentMethodLabels[m][lang]}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={onRecordPayment} disabled={invoice.remaining === 0}>
            <CreditCard size={15} />
            {tp.actions.pay}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Printer size={15} />
            {tp.actions.print}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Edit size={15} />
            {tp.actions.edit}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <ExternalLink size={15} />
            {tp.actions.viewOrder}
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
        {/* Col 1: Customer + order info */}
        <div
          className="flex flex-col gap-2.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={User}>{t.customerInfo.title}</SectionTitle>
          <InfoRow
            icon={User}
            label={tp.customer}
            value={invoice.customerName[lang]}
          />
          <InfoRow
            icon={Phone}
            label={tp.phone}
            value={<span style={{ direction: "ltr" }}>{invoice.customerPhone}</span>}
          />
          <InfoRow
            icon={CalendarDays}
            label={tp.date}
            value={<span style={{ direction: "ltr" }}>{invoice.date}</span>}
          />
          {invoice.orderId && (
            <InfoRow
              icon={ExternalLink}
              label={tp.orderLink}
              value={<span style={{ direction: "ltr" }}>#{invoice.orderId}</span>}
            />
          )}
          {invoice.notes[lang] ? (
            <div className="mt-1">
              <div style={{ fontSize: 11, color: palette.muted, marginBottom: 4 }}>
                {tp.notes}
              </div>
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
                {invoice.notes[lang]}
              </div>
            </div>
          ) : null}
        </div>

        {/* Col 2: Items list */}
        <div
          className="flex flex-col gap-2 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={FileText}>{tp.itemDesc}</SectionTitle>
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ color: palette.muted, borderBottom: `1px dashed ${palette.border}` }}>
                <th className="pb-2 font-semibold text-start">{tp.itemDesc}</th>
                <th className="pb-2 font-semibold text-center">{tp.qty}</th>
                <th className="pb-2 font-semibold text-end">{tp.tot}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="pt-1.5 font-medium" style={{ color: palette.text }}>
                    {item.description[lang]}
                  </td>
                  <td className="pt-1.5 text-center" style={{ color: palette.muted }}>
                    {item.quantity}
                  </td>
                  <td className="pt-1.5 text-end font-semibold" style={{ color: palette.text }}>
                    {item.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Col 3: Financial summary */}
        <div
          className="flex flex-col gap-1.5 xl:border-e xl:pe-5"
          style={{ borderColor: palette.border }}
        >
          <SectionTitle icon={Coins}>{tp.netTotal}</SectionTitle>

          {invoice.discount > 0 && (
            <>
              <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
                <span style={{ color: palette.muted }}>{tp.subtotal}</span>
                <span style={{ fontWeight: 600, color: palette.text }}>
                  {invoice.subtotal.toLocaleString()}{" "}
                  <span style={{ fontSize: 10.5, color: palette.muted }}>{cur}</span>
                </span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
                <span style={{ color: "#b46a66" }}>{tp.discount}</span>
                <span style={{ fontWeight: 600, color: "#b46a66" }}>
                  − {invoice.discount.toLocaleString()}{" "}
                  <span style={{ fontSize: 10.5 }}>{cur}</span>
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
            <span style={{ fontWeight: 700, color: palette.text }}>{tp.netTotal}</span>
            <span style={{ fontWeight: 800, color: palette.primary }}>
              {invoice.total.toLocaleString()}{" "}
              <span style={{ fontSize: 10.5, fontWeight: 600, color: palette.muted }}>{cur}</span>
            </span>
          </div>
          <div style={{ height: 1, backgroundColor: palette.border, margin: "3px 0" }} />
          <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
            <span style={{ color: palette.muted }}>{tp.paidAmount}</span>
            <span style={{ fontWeight: 600, color: "#4d8a6a" }}>
              {invoice.paid.toLocaleString()}{" "}
              <span style={{ fontSize: 10.5, color: palette.muted }}>{cur}</span>
            </span>
          </div>
          <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
            <span style={{ fontWeight: 600 }}>{tp.remainingAmount}</span>
            <span
              style={{
                fontWeight: 800,
                color: invoice.remaining > 0 ? "#b46a66" : palette.muted,
              }}
            >
              {invoice.remaining.toLocaleString()}{" "}
              <span style={{ fontSize: 10.5, fontWeight: 600, color: palette.muted }}>{cur}</span>
            </span>
          </div>

          <div className="mt-2">
            <div style={{ fontSize: 11, color: palette.muted, marginBottom: 6 }}>
              {tp.method}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {invoice.methods.map((m) => (
                <Badge key={m} bg={`${palette.primary}1a`} fg={palette.primary}>
                  {paymentMethodLabels[m][lang]}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Col 4: Payment history + customer debt */}
        <div className="flex flex-col gap-4">
          <div>
            <SectionTitle icon={History}>
              {lang === "ar" ? "سجل المدفوعات" : "Historique des paiements"}
            </SectionTitle>
            <div className="flex flex-col gap-2">
              {invoice.payments.length === 0 ? (
                <div style={{ fontSize: 12, color: palette.muted }}>
                  {lang === "ar" ? "لا توجد دفعات مسجلة" : "Aucun paiement enregistré"}
                </div>
              ) : (
                invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2"
                    style={{ fontSize: 12 }}
                  >
                    <span style={{ color: palette.muted, direction: "ltr" }}>{p.date}</span>
                    <span style={{ fontWeight: 600, color: palette.text }}>
                      {p.amount.toLocaleString()} {cur}
                    </span>
                    <Badge bg={`${palette.primary}1a`} fg={palette.primary}>
                      {paymentMethodLabels[p.method][lang]}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <SectionTitle icon={AlertCircle}>{t.customerInfo.title}</SectionTitle>
            <div className="flex flex-col gap-1.5" style={{ fontSize: 12 }}>
              <div className="flex items-center justify-between">
                <span style={{ color: palette.muted }}>{t.customerInfo.totalBought}</span>
                <span style={{ fontWeight: 600 }}>
                  {invoice.customerDebt.totalAmount.toLocaleString()} {cur}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: palette.muted }}>{t.customerInfo.totalDebt}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      invoice.customerDebt.remainingAmount > 0 ? "#b46a66" : palette.text,
                  }}
                >
                  {invoice.customerDebt.remainingAmount.toLocaleString()} {cur}
                </span>
              </div>
            </div>
            {invoice.customerDebt.remainingAmount > 0 && (
              <div
                className="mt-2 flex items-start gap-2 rounded-lg p-2"
                style={{
                  backgroundColor: "rgba(180,106,102,0.08)",
                  fontSize: 11.5,
                  color: "#b46a66",
                }}
              >
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{t.warnings.unpaidInv}</span>
              </div>
            )}
            <div className="mt-3">
              <Button variant="secondary" full onClick={() => navigate("/customer-profile")}>
                <ExternalLink size={15} />
                {t.customerInfo.viewProfile}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
