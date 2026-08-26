import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import {
  CircleDollarSign,
  CreditCard,
  Eye,
  FileText,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import {
  PageHeading,
  Pager,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { InvoicePdfModal } from "../components/invoices/invoice-preview-modal";
import { Badge, Button, Field, Select, TextInput } from "../components/kit";
import { ModalShell, Textarea } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { ApiInvoice, Pagination } from "../lib/commerce";

type SalesStats = {
  todaySales: number;
  monthSales: number;
  unpaidInvoices: number;
  totalInvoices: number;
  totalDebt: number;
  averageSale: number;
};

const emptyStats: SalesStats = {
  todaySales: 0,
  monthSales: 0,
  unpaidInvoices: 0,
  totalInvoices: 0,
  totalDebt: 0,
  averageSale: 0,
};
const emptyPagination: Pagination = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

function paymentColors(status: ApiInvoice["paymentStatusCode"]) {
  if (status === "PAID") return { bg: "rgba(77,138,106,0.12)", fg: "#4d8a6a" };
  if (status === "PARTIAL")
    return { bg: "rgba(195,154,91,0.15)", fg: "#946b2f" };
  return { bg: "rgba(201,138,134,0.13)", fg: "#b46a66" };
}

function statusLabel(
  status: ApiInvoice["paymentStatusCode"],
  lang: "ar" | "fr",
) {
  const labels = {
    PAID: { ar: "مدفوعة", fr: "Payée" },
    PARTIAL: { ar: "مدفوعة جزئيا", fr: "Partielle" },
    UNPAID: { ar: "غير مدفوعة", fr: "Impayée" },
  };
  return labels[status][lang];
}

function InvoicePaymentModal({
  open,
  invoice,
  onClose,
  onSaved,
}: {
  open: boolean;
  invoice: ApiInvoice | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(invoice ? String(invoice.remainingAmount) : "");
    setMethod("CASH");
    setReference("");
    setNotes("");
    setError(null);
  }, [invoice, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    const numericAmount = Number(amount);
    if (numericAmount <= 0 || numericAmount > invoice.remainingAmount) {
      setError(
        lang === "ar"
          ? "المبلغ غير صالح أو يتجاوز المتبقي."
          : "Le montant est invalide ou dépasse le reste dû.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/sales/payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          amount: numericAmount,
          paymentMethod: method,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to register payment",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={lang === "ar" ? "تسجيل دفعة" : "Enregistrer un paiement"}
      maxWidth={560}
    >
      <form onSubmit={submit} className="p-6">
        {invoice ? (
          <div
            className="mb-5 rounded-2xl p-4"
            style={{ backgroundColor: palette.bg }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div style={{ fontWeight: 900 }}>
                  {invoice.invoiceNumber} · {invoice.customerName}
                </div>
                <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                  {lang === "ar" ? "المتبقي الحالي" : "Reste actuel"}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#b46a66" }}>
                {formatMoney(invoice.remainingAmount, lang)}
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "المبلغ" : "Montant"}>
            <TextInput
              required
              min="0.01"
              max={invoice?.remainingAmount}
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "طريقة الدفع" : "Mode de paiement"}>
            <Select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option value="CASH">{lang === "ar" ? "نقدا" : "Espèces"}</option>
              <option value="TRANSFER">
                {lang === "ar" ? "تحويل" : "Virement"}
              </option>
              <option value="OTHER">{lang === "ar" ? "أخرى" : "Autre"}</option>
            </Select>
          </Field>
          <Field label={lang === "ar" ? "المرجع" : "Référence"}>
            <TextInput
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
        {error ? (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(201,138,134,0.12)",
              color: "#a94f4a",
            }}
          >
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving
              ? lang === "ar"
                ? "جاري التسجيل..."
                : "Enregistrement..."
              : lang === "ar"
                ? "تسجيل الدفعة"
                : "Enregistrer"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function SalesPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedInvoiceId = Number(searchParams.get("invoice")) || null;
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [selected, setSelected] = useState<ApiInvoice | null>(null);
  const [stats, setStats] = useState<SalesStats>(emptyStats);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [payInvoice, setPayInvoice] = useState<ApiInvoice | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<ApiInvoice | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("created")
      ? lang === "ar"
        ? "تم إنشاء البيع والفاتورة وتحديث المخزون بنجاح."
        : "Vente créée, facture générée et stock mis à jour."
      : null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: "12" });
    if (deferredSearch.trim()) query.set("search", deferredSearch.trim());
    if (paymentStatus) query.set("paymentStatus", paymentStatus);
    const today = new Date();
    if (period === "today") query.set("date", today.toISOString().slice(0, 10));
    if (period === "month") {
      query.set(
        "startDate",
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
      );
      query.set("endDate", today.toISOString().slice(0, 10));
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const requests: [
          Promise<{ data: ApiInvoice[]; pagination: Pagination }>,
          Promise<SalesStats>,
          Promise<ApiInvoice> | null,
        ] = [
          fetchJson(`/sales/invoices?${query}`, { signal: controller.signal }),
          fetchJson("/sales/stats", { signal: controller.signal }),
          requestedInvoiceId
            ? fetchJson(`/sales/invoices/${requestedInvoiceId}`, {
                signal: controller.signal,
              })
            : null,
        ];
        const [list, summary, requested] = await Promise.all([
          requests[0],
          requests[1],
          requests[2],
        ]);
        setInvoices(list.data);
        setPagination(list.pagination);
        setStats(summary);
        if (requested) setSelected(requested);
        else
          setSelected((current) =>
            current
              ? (list.data.find((invoice) => invoice.id === current.id) ?? null)
              : null,
          );
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error ? caught.message : "Unable to load sales",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [
    deferredSearch,
    page,
    paymentStatus,
    period,
    refreshKey,
    requestedInvoiceId,
  ]);

  const reload = () => setRefreshKey((value) => value + 1);
  function openInvoice(invoice: ApiInvoice) {
    setSelected(invoice);
    const next = new URLSearchParams(searchParams);
    next.set("invoice", String(invoice.id));
    next.delete("created");
    setSearchParams(next, { replace: true });
  }
  function closeDetails() {
    setSelected(null);
    const next = new URLSearchParams(searchParams);
    next.delete("invoice");
    next.delete("created");
    setSearchParams(next, { replace: true });
  }
  async function deleteInvoice(invoice: ApiInvoice) {
    if (
      !window.confirm(
        lang === "ar"
          ? `حذف الفاتورة ${invoice.invoiceNumber} وإرجاع المنتجات إلى المخزون؟`
          : `Supprimer ${invoice.invoiceNumber} et remettre les produits en stock ?`,
      )
    )
      return;
    try {
      await fetchJson(`/sales/invoices/${invoice.id}`, { method: "DELETE" });
      setNotice(
        lang === "ar"
          ? "تم حذف الفاتورة وإرجاع المخزون."
          : "Facture supprimée et stock restauré.",
      );
      closeDetails();
      reload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete invoice",
      );
    }
  }

  const text =
    lang === "ar"
      ? {
          title: "المبيعات والفواتير",
          subtitle:
            "بيع المنتجات الجاهزة، إصدار الفواتير، وتتبّع المدفوعات والديون في مكان واحد.",
          newSale: "بيع جديد",
          clients: "الزبائن",
          today: "مبيعات اليوم",
          month: "مبيعات هذا الشهر",
          invoices: "عدد الفواتير",
          unpaid: "فواتير غير مسددة",
          debt: "المبالغ المتبقية",
          search: "البحث برقم الفاتورة أو الزبون...",
          allStatus: "كل حالات الدفع",
          allDates: "كل التواريخ",
          todayFilter: "اليوم",
          monthFilter: "هذا الشهر",
          list: "قائمة المبيعات والفواتير",
          empty: "لا توجد مبيعات",
          emptyDesc: "أنشئ أول عملية بيع أو غيّر معايير البحث.",
          number: "الفاتورة",
          customer: "الزبون",
          products: "المنتجات",
          date: "التاريخ",
          total: "الإجمالي",
          paid: "المدفوع",
          remaining: "المتبقي",
          status: "الحالة",
          actions: "الإجراءات",
        }
      : {
          title: "Ventes et factures",
          subtitle:
            "Vendez les produits finis, générez les factures et suivez paiements et créances au même endroit.",
          newSale: "Nouvelle vente",
          clients: "Clients",
          today: "Ventes du jour",
          month: "Ventes du mois",
          invoices: "Factures",
          unpaid: "Factures non soldées",
          debt: "Créances restantes",
          search: "Rechercher facture ou client...",
          allStatus: "Tous les statuts",
          allDates: "Toutes les dates",
          todayFilter: "Aujourd'hui",
          monthFilter: "Ce mois",
          list: "Ventes et factures",
          empty: "Aucune vente",
          emptyDesc: "Créez une première vente ou modifiez les filtres.",
          number: "Facture",
          customer: "Client",
          products: "Produits",
          date: "Date",
          total: "Total",
          paid: "Payé",
          remaining: "Reste",
          status: "Statut",
          actions: "Actions",
        };

  return (
    <PageBackground>
      <PageHeading
        title={text.title}
        subtitle={text.subtitle}
        actions={
          <>
            <Button onClick={() => navigate("/clients")}>
              <Users size={16} /> {text.clients}
            </Button>
            <Button variant="primary" onClick={() => navigate("/sales/new")}>
              <Plus size={17} /> {text.newSale}
            </Button>
          </>
        }
      />
      {notice ? (
        <div
          className="mt-5 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(77,138,106,0.11)", color: "#3f765a" }}
        >
          {notice}
        </div>
      ) : null}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={ShoppingBag}
          label={text.today}
          value={formatMoney(stats.todaySales, lang)}
        />
        <StatCard
          icon={Receipt}
          label={text.month}
          value={formatMoney(stats.monthSales, lang)}
          color="#4d8a6a"
          tint="rgba(77,138,106,0.12)"
        />
        <StatCard
          icon={FileText}
          label={text.invoices}
          value={stats.totalInvoices}
          color="#6b8aa0"
          tint="rgba(107,138,160,0.13)"
        />
        <StatCard
          icon={CreditCard}
          label={text.unpaid}
          value={stats.unpaidInvoices}
          color="#a87d3c"
          tint="rgba(195,154,91,0.15)"
        />
        <StatCard
          icon={CircleDollarSign}
          label={text.debt}
          value={formatMoney(stats.totalDebt, lang)}
          color="#b46a66"
          tint="rgba(201,138,134,0.13)"
        />
      </section>

      <section
        className="mt-5"
        style={{
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 22,
          padding: 20,
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[250px] flex-1">
            <Search
              size={17}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ insetInlineStart: 14, color: palette.muted }}
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={text.search}
              className="h-10 w-full rounded-xl border outline-none"
              style={{
                borderColor: palette.border,
                paddingInlineStart: 42,
                paddingInlineEnd: 14,
                fontSize: 13.5,
              }}
            />
          </div>
          <div className="min-w-[180px]">
            <Select
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{text.allStatus}</option>
              <option value="PAID">{statusLabel("PAID", lang)}</option>
              <option value="PARTIAL">{statusLabel("PARTIAL", lang)}</option>
              <option value="UNPAID">{statusLabel("UNPAID", lang)}</option>
            </Select>
          </div>
          <div className="min-w-[170px]">
            <Select
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{text.allDates}</option>
              <option value="today">{text.todayFilter}</option>
              <option value="month">{text.monthFilter}</option>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h2 style={{ fontSize: 17, fontWeight: 900 }}>{text.list}</h2>
          <span style={{ fontSize: 12, color: palette.muted }}>
            {pagination.total}
          </span>
        </div>
        <div className="mt-4">
          <StatePanel
            loading={loading}
            error={error}
            empty={!loading && !error && invoices.length === 0}
            emptyTitle={text.empty}
            emptyDescription={text.emptyDesc}
            onRetry={reload}
          />
          {!loading && !error && invoices.length ? (
            <InvoicesTable
              invoices={invoices}
              lang={lang}
              labels={text}
              selectedId={selected?.id ?? null}
              onOpen={openInvoice}
              onPdf={setPdfInvoice}
              onPay={setPayInvoice}
              onDelete={(invoice) => void deleteInvoice(invoice)}
            />
          ) : null}
        </div>
        <Pager
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </section>

      {selected ? (
        <InvoiceDetails
          invoice={selected}
          lang={lang}
          onClose={closeDetails}
          onPay={() => setPayInvoice(selected)}
          onPdf={() => setPdfInvoice(selected)}
          onCustomer={() =>
            navigate(`/customer-profile/${selected.customerId}`)
          }
        />
      ) : null}
      <InvoicePaymentModal
        open={Boolean(payInvoice)}
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onSaved={() => {
          setNotice(
            lang === "ar"
              ? "تم تسجيل الدفعة وتحديث رصيد الزبون."
              : "Paiement enregistré et compte client mis à jour.",
          );
          reload();
        }}
      />
      <InvoicePdfModal
        invoice={pdfInvoice}
        lang={lang}
        onClose={() => setPdfInvoice(null)}
      />
    </PageBackground>
  );
}

const headStyle: React.CSSProperties = {
  padding: "0 12px 12px",
  fontSize: 12,
  fontWeight: 700,
  color: palette.muted,
  textAlign: "start",
  whiteSpace: "nowrap",
};
const cellStyle: React.CSSProperties = {
  padding: "14px 12px",
  fontSize: 13,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

function InvoicesTable({
  invoices,
  lang,
  labels,
  selectedId,
  onOpen,
  onPdf,
  onPay,
  onDelete,
}: {
  invoices: ApiInvoice[];
  lang: "ar" | "fr";
  labels: Record<string, string>;
  selectedId: number | null;
  onOpen: (invoice: ApiInvoice) => void;
  onPdf: (invoice: ApiInvoice) => void;
  onPay: (invoice: ApiInvoice) => void;
  onDelete: (invoice: ApiInvoice) => void;
}) {
  const headers = [
    labels.number,
    labels.customer,
    labels.products,
    labels.date,
    labels.total,
    labels.paid,
    labels.remaining,
    labels.status,
    labels.actions,
  ];
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 1050, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => (
              <th key={header} style={headStyle}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const colors = paymentColors(invoice.paymentStatusCode);
            return (
              <tr
                key={invoice.id}
                style={{
                  borderBottom: `1px solid ${palette.border}`,
                  backgroundColor:
                    selectedId === invoice.id
                      ? "rgba(18,60,74,0.035)"
                      : undefined,
                }}
              >
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => onOpen(invoice)}
                    style={{
                      color: palette.primary,
                      fontWeight: 900,
                      direction: "ltr",
                    }}
                  >
                    {invoice.invoiceNumber}
                  </button>
                </td>
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => onOpen(invoice)}
                    className="text-start"
                  >
                    <div style={{ fontWeight: 800 }}>
                      {invoice.customerName}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: palette.muted,
                        direction: "ltr",
                      }}
                    >
                      {invoice.customerPhone}
                    </div>
                  </button>
                </td>
                <td
                  style={{
                    ...cellStyle,
                    maxWidth: 230,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {invoice.items
                    .map((item) => `${item.productName} × ${item.quantity}`)
                    .join("، ")}
                </td>
                <td style={{ ...cellStyle, color: palette.muted }}>
                  {formatDate(invoice.date, lang)}
                </td>
                <td style={{ ...cellStyle, fontWeight: 900 }}>
                  {formatMoney(invoice.totalAmount, lang)}
                </td>
                <td style={{ ...cellStyle, color: "#4d8a6a" }}>
                  {formatMoney(invoice.paidAmount, lang)}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    color: invoice.remainingAmount ? "#b46a66" : palette.muted,
                    fontWeight: 800,
                  }}
                >
                  {formatMoney(invoice.remainingAmount, lang)}
                </td>
                <td style={cellStyle}>
                  <Badge bg={colors.bg} fg={colors.fg}>
                    {statusLabel(invoice.paymentStatusCode, lang)}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="View"
                      onClick={() => onOpen(invoice)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                      style={{ color: palette.primary }}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={
                        lang === "ar" ? "معاينة ملف PDF" : "Aperçu PDF"
                      }
                      onClick={() => onPdf(invoice)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50"
                      style={{ color: "#a87d3c" }}
                    >
                      <FileText size={15} />
                    </button>
                    {invoice.remainingAmount > 0 ? (
                      <button
                        type="button"
                        aria-label="Payment"
                        onClick={() => onPay(invoice)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50"
                        style={{ color: "#4d8a6a" }}
                      >
                        <CreditCard size={15} />
                      </button>
                    ) : null}
                    {invoice.paidAmount === 0 ? (
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => onDelete(invoice)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                        style={{ color: "#b46a66" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceDetails({
  invoice,
  lang,
  onClose,
  onPay,
  onPdf,
  onCustomer,
}: {
  invoice: ApiInvoice;
  lang: "ar" | "fr";
  onClose: () => void;
  onPay: () => void;
  onPdf: () => void;
  onCustomer: () => void;
}) {
  const colors = paymentColors(invoice.paymentStatusCode);
  return (
    <ModalShell
      open
      onClose={onClose}
      title={`${lang === "ar" ? "تفاصيل البيع" : "Détail de la vente"} · ${invoice.invoiceNumber}`}
      maxWidth={1180}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: "rgba(18,60,74,0.08)",
                  color: palette.primary,
                }}
              >
                <Receipt size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 900 }}>
                  {invoice.invoiceNumber}
                </h2>
                <p style={{ fontSize: 12, color: palette.muted }}>
                  {formatDate(invoice.date, lang)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {invoice.remainingAmount > 0 ? (
              <Button variant="primary" onClick={onPay}>
                <CreditCard size={16} />{" "}
                {lang === "ar" ? "تسجيل دفعة" : "Paiement"}
              </Button>
            ) : null}
            <Button onClick={onPdf}>
              <Printer size={16} />{" "}
              {lang === "ar" ? "PDF / طباعة" : "PDF / Imprimer"}
            </Button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: palette.bg }}
          >
            <div style={{ fontSize: 11.5, color: palette.muted }}>
              {lang === "ar" ? "الزبون" : "Client"}
            </div>
            <button
              type="button"
              onClick={onCustomer}
              className="mt-1 text-start"
              style={{ fontSize: 15, fontWeight: 900, color: palette.primary }}
            >
              {invoice.customerName}
            </button>
            <div style={{ fontSize: 12, direction: "ltr", textAlign: "start" }}>
              {invoice.customerPhone}
            </div>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: palette.bg }}
          >
            <div style={{ fontSize: 11.5, color: palette.muted }}>
              {lang === "ar" ? "حالة الدفع" : "Statut du paiement"}
            </div>
            <div className="mt-2">
              <Badge bg={colors.bg} fg={colors.fg}>
                {statusLabel(invoice.paymentStatusCode, lang)}
              </Badge>
            </div>
            {invoice.dueDate ? (
              <div className="mt-2 text-xs" style={{ color: palette.muted }}>
                {lang === "ar" ? "الاستحقاق" : "Échéance"}:{" "}
                {formatDate(invoice.dueDate, lang)}
              </div>
            ) : null}
          </div>
          <div
            className="rounded-2xl p-4"
            style={{
              background:
                "linear-gradient(120deg, rgba(18,60,74,0.08), rgba(195,154,91,0.12))",
            }}
          >
            <div style={{ fontSize: 11.5, color: palette.muted }}>
              {lang === "ar" ? "الإجمالي النهائي" : "Total final"}
            </div>
            <div
              className="mt-1"
              style={{ fontSize: 23, fontWeight: 900, color: palette.primary }}
            >
              {formatMoney(invoice.totalAmount, lang)}
            </div>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table
            className="w-full"
            style={{ minWidth: 650, borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                {(lang === "ar"
                  ? [
                      "المنتج",
                      "المرجع",
                      "التنويعة",
                      "الكمية",
                      "سعر الوحدة",
                      "المجموع",
                    ]
                  : [
                      "Produit",
                      "Référence",
                      "Variante",
                      "Quantité",
                      "Prix unitaire",
                      "Total",
                    ]
                ).map((label) => (
                  <th key={label} style={headStyle}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: `1px solid ${palette.border}` }}
                >
                  <td style={{ ...cellStyle, fontWeight: 800 }}>
                    {item.productName}
                  </td>
                  <td style={cellStyle}>{item.productSku || "-"}</td>
                  <td style={cellStyle}>{item.variant || "-"}</td>
                  <td style={{ ...cellStyle, fontWeight: 800 }}>
                    {item.quantity}
                  </td>
                  <td style={cellStyle}>{formatMoney(item.unitPrice, lang)}</td>
                  <td style={{ ...cellStyle, fontWeight: 900 }}>
                    {formatMoney(item.total, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="mt-5 ms-auto flex max-w-md flex-col gap-2 rounded-2xl p-5"
          style={{ backgroundColor: palette.bg }}
        >
          <AmountLine
            label={lang === "ar" ? "المجموع الفرعي" : "Sous-total"}
            value={formatMoney(invoice.subtotal, lang)}
          />
          <AmountLine
            label={lang === "ar" ? "التخفيض" : "Remise"}
            value={formatMoney(invoice.discount, lang)}
          />
          <AmountLine
            label={lang === "ar" ? "الإجمالي" : "Total"}
            value={formatMoney(invoice.totalAmount, lang)}
            strong
          />
          <AmountLine
            label={lang === "ar" ? "المدفوع" : "Payé"}
            value={formatMoney(invoice.paidAmount, lang)}
            green
          />
          <AmountLine
            label={lang === "ar" ? "المتبقي" : "Reste"}
            value={formatMoney(invoice.remainingAmount, lang)}
            danger={invoice.remainingAmount > 0}
          />
        </div>
        {invoice.payments.length ? (
          <div className="mt-5">
            <h3 style={{ fontSize: 14, fontWeight: 900 }}>
              {lang === "ar" ? "سجل المدفوعات" : "Paiements"}
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {invoice.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: palette.border }}
                >
                  <div
                    style={{ fontSize: 13, fontWeight: 900, color: "#4d8a6a" }}
                  >
                    {formatMoney(payment.amount, lang)}
                  </div>
                  <div style={{ fontSize: 11.5, color: palette.muted }}>
                    {formatDate(payment.date, lang)} · {payment.paymentMethod}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {invoice.notes ? (
          <div
            className="mt-5 rounded-xl p-4 text-sm"
            style={{ backgroundColor: palette.bg }}
          >
            <strong>{lang === "ar" ? "ملاحظات: " : "Notes : "}</strong>
            {invoice.notes}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function AmountLine({
  label,
  value,
  strong = false,
  green = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  green?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        style={{
          fontSize: strong ? 14 : 12.5,
          fontWeight: strong ? 800 : 500,
          color: strong ? palette.text : palette.muted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: strong ? 18 : 14,
          fontWeight: strong ? 900 : 800,
          color: green
            ? "#4d8a6a"
            : danger
              ? "#b46a66"
              : strong
                ? palette.primary
                : palette.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}
