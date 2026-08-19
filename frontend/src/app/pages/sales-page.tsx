import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";


import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";

import { palette, salesText, mockInvoices } from "./sales-data";
import type { Invoice } from "./sales-data";

import { SummaryCards } from "../components/sales/summary-cards";
import { InvoicesTable } from "../components/sales/invoices-table";
import { InvoiceDetailsBar } from "../components/sales/invoice-details-bar";
import { AddInvoiceModal } from "../components/sales/add-invoice-modal";
import { RegisterPaymentModal } from "../components/sales/register-payment-modal";

export function SalesPage() {
  const { lang, dir } = useLanguage();
  const t = salesText[lang];
  const cur = t.currency;
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<string | null>(mockInvoices[0]?.id || null);
  const [tab, setTab] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  // Derive summary metrics
  const todaySales = "42,500 " + cur; // Mocked
  const monthSales = "384,000 " + cur; // Mocked
  const unpaidCount = mockInvoices.filter(inv => inv.remaining > 0).length;
  const remainingAmount = mockInvoices.reduce((sum, inv) => sum + inv.remaining, 0).toLocaleString() + " " + cur;
  const invoiceCount = mockInvoices.length;

  const filteredInvoices = useMemo(() => {
    return mockInvoices.filter((inv) => {
      if (tab === "paid" && inv.status !== "paid") return false;
      if (tab === "partial" && inv.status !== "partial") return false;
      if (tab === "unpaid" && inv.status !== "unpaid") return false;
      return true;
    });
  }, [tab]);

  const selectedInvoice = mockInvoices.find((inv) => inv.id === selectedId) || null;

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
      {/* Breadcrumb + back + title */}
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

      {/* Summary Cards */}
      <div className="mt-6">
        <SummaryCards
          todaySales={todaySales}
          monthSales={monthSales}
          unpaidCount={unpaidCount}
          remainingAmount={remainingAmount}
          invoiceCount={invoiceCount}
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

      {/* Invoice details bar — shown when an invoice is selected */}
      {selectedInvoice && (
        <div className="mt-5">
          <InvoiceDetailsBar
            invoice={selectedInvoice}
            onClose={() => setSelectedId(null)}
            onRecordPayment={() => setPayOpen(true)}
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
          <InvoicesTable invoices={filteredInvoices} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

          {/* Mini trend chart */}
          <div className="mt-5 flex gap-4">
            <div
              className="flex-1 flex flex-col justify-center"
              style={{
                backgroundColor: palette.surface,
                borderRadius: 20,
                border: `1px solid ${palette.border}`,
                padding: "16px 20px",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} style={{ color: palette.primary }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{t.trend.title}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                <div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.today}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>42,500 {cur}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.week}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>112,000 {cur}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.month}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>384,000 {cur}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: palette.muted }}>{t.trend.avg}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>18,400 {cur}</div>
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
