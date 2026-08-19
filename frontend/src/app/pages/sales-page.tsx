import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";
import { palette, salesText, type Invoice, type InvoiceItem, type InvoicePayment, type PaymentMethod, type PaymentStatus } from "./sales-data";
import { SummaryCards } from "../components/sales/summary-cards";
import { InvoicesTable } from "../components/sales/invoices-table";
import { InvoiceDetailsBar } from "../components/sales/invoice-details-bar";
import { AddInvoiceModal } from "../components/sales/add-invoice-modal";
import { RegisterPaymentModal } from "../components/sales/register-payment-modal";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";

const statusMap: Record<string, PaymentStatus> = {
  paid: "paid",
  partial: "partial",
  unpaid: "unpaid",
  PAID: "paid",
  PARTIAL: "partial",
  UNPAID: "unpaid",
};

const methodMap: Record<string, PaymentMethod> = {
  cash: "cash",
  transfer: "transfer",
  check: "check",
  CASH: "cash",
  TRANSFER: "transfer",
  CHECK: "check",
};

function mapInvoiceItem(raw: unknown, index: number): InvoiceItem {
  const record = asRecord(raw);
  const description = getText(record?.description) || getText(record?.name) || `Item ${index + 1}`;
  const quantity = getNumber(record?.quantity, 1);
  const unitPrice = getNumber(record?.unitPrice);

  return {
    id: getText(record?.id) || `${index + 1}`,
    description: { ar: description, fr: description },
    quantity,
    unitPrice,
    total: getNumber(record?.total, quantity * unitPrice),
  };
}

function mapInvoicePayment(raw: unknown, index: number): InvoicePayment {
  const record = asRecord(raw);
  return {
    id: getText(record?.id) || `${index + 1}`,
    date: getText(record?.date) || "-",
    amount: getNumber(record?.amount),
    method: methodMap[getText(record?.method)] ?? "cash",
  };
}

function mapInvoice(raw: unknown): Invoice {
  const record = asRecord(raw);
  const customerName = getText(record?.customerName) || getText(record?.customer) || "Client";
  const items = getArrayFromPayload(record?.items).map(mapInvoiceItem);
  const payments = getArrayFromPayload(record?.payments).map(mapInvoicePayment);
  const methods = Array.from(new Set(payments.map((payment) => payment.method)));
  const total = getNumber(record?.total);
  const paid = getNumber(record?.paid);
  const remaining = getNumber(record?.remaining, Math.max(0, total - paid));
  const notes = getText(record?.notes);

  return {
    id: getText(record?.id) || crypto.randomUUID(),
    number: getText(record?.number) || getText(record?.invoiceNumber) || "-",
    customerName: { ar: customerName, fr: customerName },
    customerPhone: getText(record?.customerPhone) || getText(record?.phone),
    date: getText(record?.date) || getText(record?.createdAt) || "-",
    orderId: getText(record?.orderId) || undefined,
    items,
    subtotal: getNumber(record?.subtotal, total),
    discount: getNumber(record?.discount),
    total,
    paid,
    remaining,
    status: statusMap[getText(record?.status)] ?? "unpaid",
    methods,
    payments,
    notes: { ar: notes, fr: notes },
    customerDebt: {
      totalInvoices: getNumber(record?.customerDebtTotalInvoices, 0),
      totalAmount: getNumber(record?.customerDebtTotalAmount, total),
      remainingAmount: getNumber(record?.customerDebtRemainingAmount, remaining),
      lastPurchase: getText(record?.customerDebtLastPurchase) || getText(record?.date) || "-",
    },
  };
}

export function SalesPage() {
  const { lang, dir } = useLanguage();
  const t = salesText[lang];
  const cur = t.currency;
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/sales");
        if (cancelled) return;

        const nextInvoices = getArrayFromPayload(payload).map(mapInvoice);
        setInvoices(nextInvoices);
        setSelectedId((current) => current ?? nextInvoices[0]?.id ?? null);
      } catch (err) {
        if (cancelled) return;
        setInvoices([]);
        setSelectedId(null);
        setError(err instanceof Error ? err.message : "Unable to load sales.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentMonth = todayKey.slice(0, 7);
  const todaySalesValue = invoices.filter((invoice) => invoice.date.slice(0, 10) === todayKey).reduce((sum, invoice) => sum + invoice.total, 0);
  const monthSalesValue = invoices.filter((invoice) => invoice.date.startsWith(currentMonth)).reduce((sum, invoice) => sum + invoice.total, 0);
  const unpaidCount = invoices.filter((invoice) => invoice.remaining > 0).length;
  const remainingAmount = `${invoices.reduce((sum, invoice) => sum + invoice.remaining, 0).toLocaleString()} ${cur}`;
  const invoiceCount = invoices.length;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (tab === "paid" && invoice.status !== "paid") return false;
      if (tab === "partial" && invoice.status !== "partial") return false;
      if (tab === "unpaid" && invoice.status !== "unpaid") return false;
      return true;
    });
  }, [invoices, tab]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedId) ?? null;
  const averageInvoice = invoiceCount ? `${Math.round(monthSalesValue / invoiceCount).toLocaleString()} ${cur}` : `0 ${cur}`;
  const todaySales = `${todaySalesValue.toLocaleString()} ${cur}`;
  const monthSales = `${monthSalesValue.toLocaleString()} ${cur}`;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs = [
    { id: "all", label: t.tabs.all },
    { id: "paid", label: t.tabs.paid },
    { id: "partial", label: t.tabs.partial },
    { id: "unpaid", label: t.tabs.unpaid },
    { id: "customers", label: t.tabs.customers },
    { id: "reports", label: t.tabs.reports },
  ];

  return (
    <PageBackground>
      <div className="flex items-center gap-4 pt-7">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.primary,
          }}
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

      <div className="mt-6">
        <SummaryCards
          todaySales={todaySales}
          monthSales={monthSales}
          unpaidCount={unpaidCount}
          remainingAmount={remainingAmount}
          invoiceCount={invoiceCount}
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

      {selectedInvoice ? (
        <div className="mt-5">
          <InvoiceDetailsBar
            invoice={selectedInvoice}
            onClose={() => setSelectedId(null)}
            onRecordPayment={() => setPayOpen(true)}
          />
        </div>
      ) : null}

      <div className="mt-5 pb-10">
        {loading ? (
          <div className="mb-4 text-sm" style={{ color: palette.muted }}>
            {lang === "ar" ? "جاري تحميل الفواتير..." : "Chargement des factures..."}
          </div>
        ) : null}
        {!loading && error ? (
          <div className="mb-4 text-sm" style={{ color: "#b46a66" }}>
            {lang === "ar" ? "تعذر تحميل المبيعات من الواجهة الخلفية." : "Impossible de charger les ventes depuis l'API."}
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
          <InvoicesTable invoices={filteredInvoices} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="mt-5 flex gap-4">
          <div
            className="flex flex-1 flex-col justify-center"
            style={{
              backgroundColor: palette.surface,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              padding: "16px 20px",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={16} style={{ color: palette.primary }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{t.trend.title}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.today}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{todaySales}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.week}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{todaySales}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.month}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{monthSales}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.avg}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{averageInvoice}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddInvoiceModal open={addOpen} onClose={() => setAddOpen(false)} />
      <RegisterPaymentModal open={payOpen} onClose={() => setPayOpen(false)} invoice={selectedInvoice} />
    </PageBackground>
  );
}
