import { Printer, Edit, Send, ExternalLink, CreditCard, User, AlertCircle, FileText } from "lucide-react";
import { palette, salesText, paymentStatusColors, paymentStatusLabels, paymentMethodLabels } from "../../pages/sales-data";
import type { Invoice } from "../../pages/sales-data";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";

export function InvoicePreview({
  invoice,
  onRecordPayment,
}: {
  invoice: Invoice | null;
  onRecordPayment: () => void;
}) {
  const { lang, dir } = useLanguage();
  const t = salesText[lang].preview;
  const cur = salesText[lang].currency;

  if (!invoice) {
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

  const statusColor = paymentStatusColors[invoice.status];
  const debt = invoice.customerDebt;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Official Print-like Preview Box */}
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
        {/* Decorative corner cut (simulate receipt style) */}
        <div className="absolute top-0 end-0" style={{ width: 0, height: 0, borderTop: "30px solid #f9f9f9", borderInlineStart: "30px solid transparent" }} />

        <div className="flex items-start justify-between">
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: palette.primary }}>{t.workshopName}</div>
            <div style={{ fontSize: 12, color: palette.muted, marginTop: 4 }}>{invoice.date}</div>
          </div>
          <div style={{ textAlign: "end" }}>
            <div style={{ fontSize: 12, color: palette.muted }}>{t.invoiceNumber}</div>
            <div style={{ direction: "ltr", fontSize: 16, fontWeight: 800, color: palette.text }}>#{invoice.number}</div>
            <div className="mt-2 flex justify-end">
              <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                {paymentStatusLabels[invoice.status][lang]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-black/5 p-3">
          <div style={{ fontSize: 11, color: palette.muted, marginBottom: 2 }}>{t.customer}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{invoice.customerName[lang]}</div>
          <div style={{ fontSize: 12, color: palette.muted, direction: "ltr", textAlign: dir === "rtl" ? "right" : "left" }}>
            {invoice.customerPhone}
          </div>
        </div>

        <div className="mt-6 border-b pb-4" style={{ borderColor: palette.border }}>
          <table className="w-full text-start" style={{ fontSize: 12 }}>
            <thead>
              <tr style={{ color: palette.muted, borderBottom: `1px dashed ${palette.border}` }}>
                <th className="pb-2 font-semibold text-start">{t.itemDesc}</th>
                <th className="pb-2 font-semibold text-center">{t.qty}</th>
                <th className="pb-2 font-semibold text-end">{t.tot}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td className="pt-2 font-medium" style={{ color: palette.text }}>{item.description[lang]}</td>
                  <td className="pt-2 text-center" style={{ color: palette.muted }}>{item.quantity}</td>
                  <td className="pt-2 text-end font-semibold" style={{ color: palette.text }}>{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-2" style={{ fontSize: 13 }}>
          {invoice.discount > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.subtotal}</span>
                <span>{invoice.subtotal.toLocaleString()} {cur}</span>
              </div>
              <div className="flex justify-between" style={{ color: "#b46a66" }}>
                <span>{t.discount}</span>
                <span>- {invoice.discount.toLocaleString()} {cur}</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-1" style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>
            <span>{t.netTotal}</span>
            <span>{invoice.total.toLocaleString()} {cur}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t.paidAmount}</span>
            <span style={{ color: palette.primary, fontWeight: 600 }}>{invoice.paid.toLocaleString()} {cur}</span>
          </div>
          <div className="flex justify-between border-t pt-2" style={{ borderColor: palette.border }}>
            <span style={{ fontWeight: 600 }}>{t.remainingAmount}</span>
            <span style={{ fontWeight: 800, color: invoice.remaining > 0 ? "#b46a66" : palette.muted }}>
              {invoice.remaining.toLocaleString()} {cur}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Actions Grid */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={onRecordPayment} disabled={invoice.remaining === 0}>
          <CreditCard size={15} />
          {t.actions.pay}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Printer size={15} />
          {t.actions.print}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Edit size={15} />
          {t.actions.edit}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <ExternalLink size={15} />
          {t.actions.viewOrder}
        </Button>
      </div>

      {/* 3. Customer Info Mini Card */}
      <div
        style={{
          backgroundColor: palette.surface,
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <User size={16} style={{ color: palette.primary }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{salesText[lang].customerInfo.title}</span>
        </div>
        <div className="flex flex-col gap-2" style={{ fontSize: 12.5 }}>
          <div className="flex justify-between">
            <span style={{ color: palette.muted }}>{salesText[lang].customerInfo.totalBought}</span>
            <span style={{ fontWeight: 600 }}>{debt.totalAmount.toLocaleString()} {cur}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: palette.muted }}>{salesText[lang].customerInfo.totalDebt}</span>
            <span style={{ fontWeight: 700, color: debt.remainingAmount > 0 ? "#b46a66" : palette.text }}>
              {debt.remainingAmount.toLocaleString()} {cur}
            </span>
          </div>
        </div>
        {debt.remainingAmount > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-800" style={{ fontSize: 11.5 }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{salesText[lang].warnings.unpaidInv}</span>
          </div>
        )}
      </div>
    </div>
  );
}
