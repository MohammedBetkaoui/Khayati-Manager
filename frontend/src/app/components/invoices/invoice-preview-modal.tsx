import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Printer,
  ReceiptText,
} from "lucide-react";
import { formatDate, formatMoney } from "../commerce-ui";
import { Button } from "../kit";
import { ModalShell } from "../modal-shell";
import { palette } from "../../content";
import { API_BASE_URL } from "../../lib/api";
import type {
  ApiCustomer,
  ApiInvoice,
  WorkshopSettings,
} from "../../lib/commerce";

export type InvoicePreviewLine = {
  key: string;
  productName: string;
  reference: string;
  variant: string;
  quantity: number;
  unitPrice: number;
};

export type InvoicePreviewData = {
  customer: ApiCustomer;
  workshop: WorkshopSettings | null;
  issueDate: string;
  dueDate: string | null;
  lines: InvoicePreviewLine[];
  subtotal: number;
  discount: number;
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
};

export function InvoiceDraftPreviewModal({
  open,
  data,
  lang,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  data: InvoicePreviewData | null;
  lang: "ar" | "fr";
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!data) return null;
  const isArabic = lang === "ar";
  const paymentLabel = paymentMethodLabel(data.paymentMethod, lang);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={
        isArabic ? "معاينة الفاتورة قبل التأكيد" : "Aperçu avant validation"
      }
      maxWidth={1080}
    >
      <div className="p-4 sm:p-6" style={{ backgroundColor: palette.bg }}>
        <article
          dir="rtl"
          className="mx-auto overflow-hidden bg-white"
          style={{
            maxWidth: 820,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 22px 55px -35px rgba(18,60,74,0.45)",
          }}
        >
          <header className="grid gap-5 p-6 sm:grid-cols-[1fr_1.25fr_170px] sm:p-8">
            <div className="order-2 sm:order-1">
              <div
                className="mb-3 h-1.5 w-14 rounded-full"
                style={{ backgroundColor: palette.accent }}
              />
              <h2
                style={{
                  color: palette.primary,
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                {data.workshop?.workshopName ||
                  data.workshop?.commercialName ||
                  (isArabic ? "الورشة" : "Atelier")}
              </h2>
              {data.workshop?.commercialName ? (
                <div
                  dir="ltr"
                  className="mt-1 text-start text-xs font-bold tracking-[0.14em]"
                  style={{ color: palette.accent }}
                >
                  {data.workshop.commercialName}
                </div>
              ) : null}
            </div>
            <div
              className="order-3 space-y-1.5 text-xs sm:order-2"
              style={{ color: palette.muted }}
            >
              <div>{data.workshop?.address || "—"}</div>
              <div dir="ltr" className="text-end">
                {data.workshop?.phone || "—"}
              </div>
              <div dir="ltr" className="text-end">
                {data.workshop?.email || "—"}
              </div>
            </div>
            <div className="order-1 overflow-hidden rounded-2xl sm:order-3">
              <div
                className="px-4 py-3 text-center text-lg font-black text-white"
                style={{ backgroundColor: palette.primary }}
              >
                {isArabic ? "فاتورة" : "FACTURE"}
              </div>
              <div
                dir="ltr"
                className="px-3 py-4 text-center text-sm font-black"
                style={{ backgroundColor: palette.accentSoft }}
              >
                INV-YYYY-XXXX
              </div>
            </div>
          </header>

          <div className="grid gap-4 px-6 sm:grid-cols-2 sm:px-8">
            <PreviewCard title={isArabic ? "معلومات الزبون" : "Client"}>
              <PreviewValue
                label={isArabic ? "الاسم" : "Nom"}
                value={data.customer.fullName}
              />
              <PreviewValue
                label={isArabic ? "الهاتف" : "Téléphone"}
                value={data.customer.phone}
                ltr
              />
              <PreviewValue
                label={isArabic ? "العنوان" : "Adresse"}
                value={data.customer.address || "—"}
              />
            </PreviewCard>
            <PreviewCard title={isArabic ? "معلومات الفاتورة" : "Facturation"}>
              <PreviewValue
                label={isArabic ? "التاريخ" : "Date"}
                value={formatDate(data.issueDate, lang)}
              />
              <PreviewValue
                label={isArabic ? "الاستحقاق" : "Échéance"}
                value={data.dueDate ? formatDate(data.dueDate, lang) : "—"}
              />
              <PreviewValue
                label={isArabic ? "طريقة الدفع" : "Paiement"}
                value={paymentLabel}
              />
            </PreviewCard>
          </div>

          <div className="mt-5 overflow-x-auto px-6 sm:px-8">
            <table
              className="w-full"
              style={{ minWidth: 650, borderCollapse: "collapse" }}
            >
              <thead>
                <tr
                  style={{ backgroundColor: palette.primary, color: "white" }}
                >
                  {(isArabic
                    ? [
                        "#",
                        "المنتج",
                        "المرجع",
                        "التنويعة",
                        "الكمية",
                        "سعر الوحدة",
                        "المجموع",
                      ]
                    : [
                        "#",
                        "Produit",
                        "Référence",
                        "Variante",
                        "Qté",
                        "Prix",
                        "Total",
                      ]
                  ).map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3 text-start text-xs font-bold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line, index) => (
                  <tr
                    key={line.key}
                    style={{ borderBottom: `1px solid ${palette.border}` }}
                  >
                    <td className="px-3 py-3 text-xs">{index + 1}</td>
                    <td className="px-3 py-3 text-xs font-bold">
                      {line.productName}
                    </td>
                    <td dir="ltr" className="px-3 py-3 text-start text-xs">
                      {line.reference || "—"}
                    </td>
                    <td className="px-3 py-3 text-xs">{line.variant || "—"}</td>
                    <td className="px-3 py-3 text-xs font-bold">
                      {line.quantity}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {formatMoney(line.unitPrice, lang)}
                    </td>
                    <td className="px-3 py-3 text-xs font-black">
                      {formatMoney(line.quantity * line.unitPrice, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <PreviewCard title={isArabic ? "ملخص الفاتورة" : "Résumé"}>
              <MoneyRow
                label={isArabic ? "المجموع الفرعي" : "Sous-total"}
                value={data.subtotal}
                lang={lang}
              />
              <MoneyRow
                label={isArabic ? "الخصم" : "Remise"}
                value={data.discount}
                lang={lang}
              />
              <MoneyRow
                label={
                  data.taxEnabled
                    ? `${isArabic ? "الضريبة" : "Taxe"} (${data.taxRate}%)`
                    : isArabic
                      ? "الضريبة"
                      : "Taxe"
                }
                value={data.taxAmount}
                lang={lang}
              />
              <MoneyRow
                label={isArabic ? "الإجمالي" : "Total"}
                value={data.totalAmount}
                lang={lang}
                strong
              />
            </PreviewCard>
            <PreviewCard title={isArabic ? "ملخص الدفع" : "Paiement"}>
              <MoneyRow
                label={isArabic ? "المبلغ الإجمالي" : "Total"}
                value={data.totalAmount}
                lang={lang}
              />
              <MoneyRow
                label={isArabic ? "المبلغ المدفوع" : "Payé"}
                value={data.paidAmount}
                lang={lang}
                green
              />
              <MoneyRow
                label={isArabic ? "المبلغ المتبقي" : "Reste"}
                value={data.remainingAmount}
                lang={lang}
                danger
              />
              {data.paymentReference ? (
                <PreviewValue
                  label={isArabic ? "المرجع" : "Référence"}
                  value={data.paymentReference}
                  ltr
                />
              ) : null}
            </PreviewCard>
          </div>

          {data.notes ? (
            <div
              className="mx-6 mb-7 rounded-2xl border border-dashed p-4 text-sm sm:mx-8"
              style={{ borderColor: palette.borderStrong }}
            >
              <strong style={{ color: palette.primary }}>
                {isArabic ? "ملاحظات: " : "Notes : "}
              </strong>
              {data.notes}
            </div>
          ) : null}
          <footer
            className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs text-white sm:px-8"
            style={{ backgroundColor: palette.primary }}
          >
            <span>
              {data.workshop?.address || data.workshop?.invoiceFooter || ""}
            </span>
            <span dir="ltr">{data.workshop?.phone || ""}</span>
          </footer>
        </article>

        <div className="mx-auto mt-5 flex max-w-[820px] flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: palette.muted }}
          >
            <FileText size={16} />
            {isArabic
              ? "سيتم حساب الأرقام النهائية وتوليد رقم الفاتورة من الخادم."
              : "Les montants et le numéro définitifs seront recalculés par le serveur."}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={saving}>
              {isArabic ? "العودة للتعديل" : "Modifier"}
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={saving}>
              <CheckCircle2 size={16} />
              {saving
                ? isArabic
                  ? "جاري الإنشاء..."
                  : "Création..."
                : isArabic
                  ? "تأكيد وإنشاء الفاتورة"
                  : "Confirmer et créer"}
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function InvoicePdfModal({
  invoice,
  lang,
  onClose,
}: {
  invoice: ApiInvoice | null;
  lang: "ar" | "fr";
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!invoice) return null;
  const pdfUrl = `${API_BASE_URL}/invoices/${invoice.id}/pdf`;

  function openPdf() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `Invoice_${invoice.invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "PDF unavailable");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title={`${lang === "ar" ? "معاينة الفاتورة" : "Aperçu de la facture"} ${invoice.invoiceNumber}`}
      maxWidth={1120}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: palette.border }}
      >
        <div
          className="flex items-center gap-2"
          style={{ color: palette.primary }}
        >
          <ReceiptText size={18} />
          <span className="text-sm font-bold">
            {lang === "ar"
              ? "النسخة الرسمية من قاعدة البيانات"
              : "Document officiel généré depuis SQLite"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openPdf}>
            <ExternalLink size={15} /> {lang === "ar" ? "فتح" : "Ouvrir"}
          </Button>
          <Button onClick={openPdf}>
            <Printer size={15} /> {lang === "ar" ? "طباعة" : "Imprimer"}
          </Button>
          <Button
            variant="primary"
            onClick={() => void downloadPdf()}
            disabled={downloading}
          >
            <Download size={15} />
            {downloading
              ? lang === "ar"
                ? "جاري الحفظ..."
                : "Téléchargement..."
              : lang === "ar"
                ? "حفظ PDF"
                : "Enregistrer PDF"}
          </Button>
        </div>
      </div>
      {error ? (
        <div
          className="mx-5 mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(201,138,134,0.12)",
            color: "#a94f4a",
          }}
        >
          {error}
        </div>
      ) : null}
      <div className="p-4" style={{ backgroundColor: palette.bg }}>
        <iframe
          title={`${lang === "ar" ? "فاتورة" : "Facture"} ${invoice.invoiceNumber}`}
          src={`${pdfUrl}#toolbar=1&navpanes=0`}
          className="w-full rounded-xl bg-white"
          style={{ height: "72vh", border: `1px solid ${palette.border}` }}
        />
      </div>
    </ModalShell>
  );
}

function PreviewCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: palette.border }}
    >
      <h3
        className="px-4 py-3 text-sm font-black"
        style={{
          backgroundColor: "rgba(18,60,74,0.07)",
          color: palette.primary,
        }}
      >
        {title}
      </h3>
      <div className="space-y-2.5 p-4">{children}</div>
    </section>
  );
}

function PreviewValue({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span style={{ color: palette.muted }}>{label}</span>
      <strong
        dir={ltr ? "ltr" : undefined}
        className="text-end"
        style={{ color: palette.text }}
      >
        {value}
      </strong>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  lang,
  strong = false,
  green = false,
  danger = false,
}: {
  label: string;
  value: number;
  lang: "ar" | "fr";
  strong?: boolean;
  green?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span
        style={{
          color: strong ? palette.text : palette.muted,
          fontWeight: strong ? 800 : 500,
        }}
      >
        {label}
      </span>
      <strong
        dir="ltr"
        style={{
          color: danger
            ? "#b46a66"
            : green
              ? "#4d8a6a"
              : strong
                ? palette.primary
                : palette.text,
          fontSize: strong ? 16 : 13,
        }}
      >
        {formatMoney(value, lang)}
      </strong>
    </div>
  );
}

function paymentMethodLabel(method: string | null, lang: "ar" | "fr") {
  if (!method) return lang === "ar" ? "دفع لاحق" : "Paiement ultérieur";
  const labels: Record<string, { ar: string; fr: string }> = {
    CASH: { ar: "نقداً", fr: "Espèces" },
    TRANSFER: { ar: "تحويل", fr: "Virement" },
    OTHER: { ar: "أخرى", fr: "Autre" },
  };
  return labels[method]?.[lang] ?? method;
}
