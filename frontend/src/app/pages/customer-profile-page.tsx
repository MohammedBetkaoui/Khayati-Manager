import { useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  BadgeDollarSign,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  CreditCard,
  FileText,
  History,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  ShoppingBag,
  StickyNote,
  UserRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { CustomerFormModal } from "../components/customer-form-modal";
import {
  PageHeading,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { Badge, Button, Field, Select, TextInput } from "../components/kit";
import { ModalShell, Textarea } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { ApiCustomer, ApiInvoice, ApiPayment } from "../lib/commerce";

type CustomerProfile = {
  customer: ApiCustomer;
  statistics: {
    totalInvoices: number;
    totalSales: number;
    totalPurchases: number;
    totalPaid: number;
    totalDebt: number;
    averageSale: number;
    lastPurchase: string | null;
    purchaseFrequencyDays: number | null;
  };
  invoices: ApiInvoice[];
  payments: ApiPayment[];
  debts: Array<{
    invoiceId: number;
    invoiceNumber: string;
    date: string;
    dueDate: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatusCode: string;
  }>;
  analytics: {
    purchaseTrend: Array<{ month: string; amount: number; sales: number }>;
    topProducts: Array<{ name: string; quantity: number; amount: number }>;
    purchaseFrequencyDays: number | null;
    lastActivity: string | null;
  };
  notes: Array<{ id: number; content: string; date: string }>;
};

type ProfileTab = "sales" | "payments" | "debts" | "analytics";

const paymentStatusColors = {
  PAID: { bg: "rgba(77,138,106,0.12)", fg: "#4d8a6a" },
  PARTIAL: { bg: "rgba(195,154,91,0.15)", fg: "#946b2f" },
  UNPAID: { bg: "rgba(201,138,134,0.13)", fg: "#b46a66" },
};

function PaymentModal({
  open,
  profile,
  onClose,
  onSaved,
}: {
  open: boolean;
  profile: CustomerProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const firstDebt = profile.debts[0];
  const [invoiceId, setInvoiceId] = useState(
    firstDebt ? String(firstDebt.invoiceId) : "",
  );
  const [amount, setAmount] = useState(
    firstDebt ? String(firstDebt.remainingAmount) : "",
  );
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDebt = profile.debts.find(
    (debt) => debt.invoiceId === Number(invoiceId),
  );

  useEffect(() => {
    if (!open) return;
    const debt = profile.debts[0];
    setInvoiceId(debt ? String(debt.invoiceId) : "");
    setAmount(debt ? String(debt.remainingAmount) : "");
    setMethod("CASH");
    setReference("");
    setNotes("");
    setError(null);
  }, [open, profile.debts]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (
      !selectedDebt ||
      numericAmount <= 0 ||
      numericAmount > selectedDebt.remainingAmount
    ) {
      setError(
        lang === "ar"
          ? "يجب أن يكون المبلغ أكبر من صفر ولا يتجاوز الدين المتبقي."
          : "Le montant doit être positif et ne pas dépasser le reste dû.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await fetchJson("/sales/payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: profile.customer.id,
          invoiceId: selectedDebt.invoiceId,
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
      title={lang === "ar" ? "تسجيل دفعة جديدة" : "Enregistrer un règlement"}
      maxWidth={560}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "الفاتورة" : "Facture"}>
            <Select
              value={invoiceId}
              onChange={(event) => {
                setInvoiceId(event.target.value);
                const debt = profile.debts.find(
                  (item) => item.invoiceId === Number(event.target.value),
                );
                setAmount(debt ? String(debt.remainingAmount) : "");
              }}
            >
              {profile.debts.map((debt) => (
                <option key={debt.invoiceId} value={debt.invoiceId}>
                  {debt.invoiceNumber} -{" "}
                  {formatMoney(debt.remainingAmount, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "مبلغ الدفعة" : "Montant"}>
            <TextInput
              required
              min="0.01"
              step="0.01"
              max={selectedDebt?.remainingAmount}
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
          <Field label={lang === "ar" ? "ملاحظة" : "Note"}>
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
              color: "#a94f4a",
              backgroundColor: "rgba(201,138,134,0.12)",
            }}
          >
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving || profile.debts.length === 0}
          >
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

export function CustomerProfilePage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<ProfileTab>("sales");
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      navigate("/clients", { replace: true });
      return;
    }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchJson<CustomerProfile>(
          `/sales/customers/${customerId}/profile`,
          { signal: controller.signal },
        );
        setProfile(result);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load customer profile",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [customerId, navigate, refreshKey]);

  const reload = () => setRefreshKey((value) => value + 1);
  const archived = profile?.customer.statusCode === "ARCHIVED";
  const text =
    lang === "ar"
      ? {
          title: "ملف الزبون",
          subtitle: "سجل تجاري شامل للمبيعات والمدفوعات والديون ونشاط الزبون.",
          edit: "تعديل البيانات",
          newSale: "بيع جديد",
          revenue: "إجمالي المشتريات",
          sales: "عدد المبيعات",
          paid: "إجمالي المدفوع",
          debt: "المتبقي للدفع",
          average: "متوسط البيع",
          last: "آخر شراء",
          info: "المعلومات العامة",
          salesTab: "المبيعات",
          paymentsTab: "المدفوعات",
          debtsTab: "الديون",
          analyticsTab: "الإحصائيات",
          empty: "لا توجد بيانات في هذا القسم",
        }
      : {
          title: "Profil client",
          subtitle:
            "Dossier commercial complet des ventes, paiements, créances et activités du client.",
          edit: "Modifier",
          newSale: "Nouvelle vente",
          revenue: "Total des achats",
          sales: "Nombre de ventes",
          paid: "Total payé",
          debt: "Reste à payer",
          average: "Panier moyen",
          last: "Dernier achat",
          info: "Informations générales",
          salesTab: "Ventes",
          paymentsTab: "Paiements",
          debtsTab: "Créances",
          analyticsTab: "Statistiques",
          empty: "Aucune donnée dans cette section",
        };

  return (
    <PageBackground>
      <PageHeading
        title={profile?.customer.fullName || text.title}
        subtitle={text.subtitle}
        backTo={archived ? "/clients/archives" : "/clients"}
        actions={
          profile ? (
            <>
              <Button onClick={() => setEditOpen(true)}>
                <Pencil size={16} /> {text.edit}
              </Button>
              {!archived ? (
                <Button
                  variant="primary"
                  onClick={() =>
                    navigate(`/sales/new?customerId=${profile.customer.id}`)
                  }
                >
                  <Plus size={17} /> {text.newSale}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {archived ? (
        <div
          className="mt-5 rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(195,154,91,0.28)",
            backgroundColor: "rgba(195,154,91,0.1)",
            color: "#a87d3c",
            lineHeight: 1.7,
          }}
        >
          {lang === "ar"
            ? "هذا الزبون مؤرشف. يبقى ملفه التجاري وتاريخه المالي قابلين للاستشارة، لكنه غير متاح لتسجيل مبيعات جديدة حتى تتم إعادته من صفحة الأرشيف."
            : "Ce client est archivé. Son dossier commercial et son historique financier restent consultables, mais aucune nouvelle vente ne peut être enregistrée avant sa restauration depuis les archives."}
        </div>
      ) : null}

      <div className="mt-6">
        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && !error && !profile}
          emptyTitle={lang === "ar" ? "الزبون غير موجود" : "Client introuvable"}
          onRetry={reload}
        />
      </div>

      {notice ? (
        <div
          className="mt-5 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(77,138,106,0.11)", color: "#3f765a" }}
        >
          {notice}
        </div>
      ) : null}

      {profile ? (
        <>
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              icon={ShoppingBag}
              label={text.revenue}
              value={formatMoney(profile.statistics.totalPurchases, lang)}
            />
            <StatCard
              icon={Receipt}
              label={text.sales}
              value={profile.statistics.totalSales}
              color="#6b8aa0"
              tint="rgba(107,138,160,0.13)"
            />
            <StatCard
              icon={BadgeDollarSign}
              label={text.paid}
              value={formatMoney(profile.statistics.totalPaid, lang)}
              color="#4d8a6a"
              tint="rgba(77,138,106,0.12)"
            />
            <StatCard
              icon={CircleDollarSign}
              label={text.debt}
              value={formatMoney(profile.statistics.totalDebt, lang)}
              color="#b46a66"
              tint="rgba(201,138,134,0.13)"
            />
            <StatCard
              icon={ChartNoAxesColumnIncreasing}
              label={text.average}
              value={formatMoney(profile.statistics.averageSale, lang)}
              color="#a87d3c"
              tint="rgba(195,154,91,0.15)"
            />
            <StatCard
              icon={CalendarClock}
              label={text.last}
              value={formatDate(profile.statistics.lastPurchase, lang)}
            />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-4">
              <section
                style={{
                  backgroundColor: palette.surface,
                  border: `1px solid ${palette.border}`,
                  borderRadius: 22,
                  padding: 20,
                }}
              >
                <div className="mb-5 flex items-center gap-2">
                  <UserRound size={18} style={{ color: palette.primary }} />
                  <h2 style={{ fontSize: 15, fontWeight: 800 }}>{text.info}</h2>
                </div>
                <div className="flex flex-col gap-4">
                  <InfoLine
                    icon={Phone}
                    label={lang === "ar" ? "الهاتف" : "Téléphone"}
                    value={profile.customer.phone}
                    ltr
                  />
                  {profile.customer.secondPhone ? (
                    <InfoLine
                      icon={Phone}
                      label={lang === "ar" ? "هاتف ثان" : "Deuxième téléphone"}
                      value={profile.customer.secondPhone}
                      ltr
                    />
                  ) : null}
                  <InfoLine
                    icon={MapPin}
                    label={lang === "ar" ? "العنوان" : "Adresse"}
                    value={
                      [
                        profile.customer.address,
                        profile.customer.city,
                        profile.customer.wilaya,
                      ]
                        .filter(Boolean)
                        .join("، ") || "-"
                    }
                  />
                  <InfoLine
                    icon={History}
                    label={lang === "ar" ? "تاريخ الإضافة" : "Date d'ajout"}
                    value={formatDate(profile.customer.createdAt, lang)}
                  />
                  <InfoLine
                    icon={Activity}
                    label={lang === "ar" ? "الحالة" : "Statut"}
                    value={`${profile.customer.type} · ${profile.customer.status}`}
                  />
                </div>
                {profile.customer.notes ? (
                  <div
                    className="mt-5 rounded-xl p-3"
                    style={{ backgroundColor: palette.bg }}
                  >
                    <div
                      className="mb-1 flex items-center gap-1.5"
                      style={{ color: palette.muted, fontSize: 12 }}
                    >
                      <StickyNote size={14} />{" "}
                      {lang === "ar" ? "ملاحظات" : "Notes"}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.7 }}>
                      {profile.customer.notes}
                    </p>
                  </div>
                ) : null}
              </section>
              {profile.statistics.totalDebt > 0 ? (
                <section
                  style={{
                    background: "var(--app-danger-surface)",
                    border: "1px solid rgba(201,138,134,0.28)",
                    borderRadius: 22,
                    padding: 20,
                  }}
                >
                  <div style={{ color: "#b46a66", fontSize: 12.5 }}>
                    {lang === "ar" ? "الدين الحالي" : "Créance actuelle"}
                  </div>
                  <div
                    className="mt-1"
                    style={{
                      fontSize: 25,
                      fontWeight: 900,
                      color: palette.text,
                    }}
                  >
                    {formatMoney(profile.statistics.totalDebt, lang)}
                  </div>
                  <Button
                    full
                    variant="primary"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <CreditCard size={16} />{" "}
                    {lang === "ar" ? "تسجيل تسديد" : "Enregistrer un règlement"}
                  </Button>
                </section>
              ) : null}
            </aside>

            <main
              style={{
                backgroundColor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 22,
                padding: 20,
                minWidth: 0,
              }}
            >
              <div className="flex flex-wrap gap-2" role="tablist">
                {(
                  [
                    ["sales", text.salesTab, FileText],
                    ["payments", text.paymentsTab, CreditCard],
                    ["debts", text.debtsTab, CircleDollarSign],
                    [
                      "analytics",
                      text.analyticsTab,
                      ChartNoAxesColumnIncreasing,
                    ],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                    style={{
                      backgroundColor:
                        tab === id ? palette.primary : palette.bg,
                      color: tab === id ? "#fff" : palette.muted,
                    }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
              <div className="mt-5">
                {tab === "sales" ? (
                  <SalesTable
                    invoices={profile.invoices}
                    lang={lang}
                    onOpen={(id) => navigate(`/sales?invoice=${id}`)}
                    empty={text.empty}
                  />
                ) : null}
                {tab === "payments" ? (
                  <PaymentsTable
                    payments={profile.payments}
                    lang={lang}
                    empty={text.empty}
                  />
                ) : null}
                {tab === "debts" ? (
                  <DebtsTable
                    debts={profile.debts}
                    lang={lang}
                    empty={text.empty}
                    onPay={() => setPaymentOpen(true)}
                  />
                ) : null}
                {tab === "analytics" ? (
                  <CustomerAnalytics
                    profile={profile}
                    lang={lang}
                    empty={text.empty}
                  />
                ) : null}
              </div>
            </main>
          </div>
        </>
      ) : null}

      {profile ? (
        <>
          <CustomerFormModal
            open={editOpen}
            customer={profile.customer}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setNotice(
                lang === "ar"
                  ? "تم تحديث بيانات الزبون."
                  : "Informations client mises à jour.",
              );
              reload();
            }}
          />
          <PaymentModal
            open={paymentOpen}
            profile={profile}
            onClose={() => setPaymentOpen(false)}
            onSaved={() => {
              setNotice(
                lang === "ar"
                  ? "تم تسجيل الدفعة وتحديث الدين."
                  : "Paiement enregistré et créance mise à jour.",
              );
              reload();
            }}
          />
        </>
      ) : null}
    </PageBackground>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
  ltr = false,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: "rgba(18,60,74,0.07)",
          color: palette.primary,
        }}
      >
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div style={{ fontSize: 11.5, color: palette.muted }}>{label}</div>
        <div
          className="mt-0.5 break-words"
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            direction: ltr ? "ltr" : undefined,
            textAlign: "start",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  padding: "0 12px 11px",
  fontSize: 12,
  color: palette.muted,
  fontWeight: 700,
  textAlign: "start",
  whiteSpace: "nowrap",
};
const cellStyle: React.CSSProperties = {
  padding: "13px 12px",
  fontSize: 13,
  verticalAlign: "middle",
};

function SalesTable({
  invoices,
  lang,
  onOpen,
  empty,
}: {
  invoices: ApiInvoice[];
  lang: "ar" | "fr";
  onOpen: (id: number) => void;
  empty: string;
}) {
  if (!invoices.length) return <EmptyRow text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 760, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {[
              lang === "ar" ? "الفاتورة" : "Facture",
              lang === "ar" ? "المنتجات" : "Produits",
              lang === "ar" ? "التاريخ" : "Date",
              lang === "ar" ? "الإجمالي" : "Total",
              lang === "ar" ? "المدفوع" : "Payé",
              lang === "ar" ? "المتبقي" : "Reste",
              lang === "ar" ? "الحالة" : "Statut",
            ].map((label) => (
              <th key={label} style={headStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const colors = paymentStatusColors[invoice.paymentStatusCode];
            return (
              <tr
                key={invoice.id}
                style={{ borderBottom: `1px solid ${palette.border}` }}
              >
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => onOpen(invoice.id)}
                    style={{ fontWeight: 800, color: palette.primary }}
                  >
                    {invoice.invoiceNumber}
                  </button>
                </td>
                <td
                  style={{ ...cellStyle, maxWidth: 220, whiteSpace: "normal" }}
                >
                  {invoice.items
                    .map((item) => `${item.productName} × ${item.quantity}`)
                    .join("، ")}
                </td>
                <td style={{ ...cellStyle, color: palette.muted }}>
                  {formatDate(invoice.date, lang)}
                </td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>
                  {formatMoney(invoice.totalAmount, lang)}
                </td>
                <td style={{ ...cellStyle, color: "#4d8a6a" }}>
                  {formatMoney(invoice.paidAmount, lang)}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    color: invoice.remainingAmount ? "#b46a66" : palette.muted,
                  }}
                >
                  {formatMoney(invoice.remainingAmount, lang)}
                </td>
                <td style={cellStyle}>
                  <Badge bg={colors.bg} fg={colors.fg}>
                    {invoice.paymentStatus}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({
  payments,
  lang,
  empty,
}: {
  payments: ApiPayment[];
  lang: "ar" | "fr";
  empty: string;
}) {
  if (!payments.length) return <EmptyRow text={empty} />;
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 650, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {[
              lang === "ar" ? "التاريخ" : "Date",
              lang === "ar" ? "المبلغ" : "Montant",
              lang === "ar" ? "الفاتورة" : "Facture",
              lang === "ar" ? "الطريقة" : "Mode",
              lang === "ar" ? "المرجع" : "Référence",
              lang === "ar" ? "ملاحظة" : "Note",
            ].map((label) => (
              <th key={label} style={headStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr
              key={payment.id}
              style={{ borderBottom: `1px solid ${palette.border}` }}
            >
              <td style={cellStyle}>{formatDate(payment.date, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 800, color: "#4d8a6a" }}>
                {formatMoney(payment.amount, lang)}
              </td>
              <td style={cellStyle}>{payment.invoiceNumber || "-"}</td>
              <td style={cellStyle}>{payment.paymentMethod}</td>
              <td style={cellStyle}>{payment.reference || "-"}</td>
              <td style={{ ...cellStyle, color: palette.muted }}>
                {payment.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DebtsTable({
  debts,
  lang,
  empty,
  onPay,
}: {
  debts: CustomerProfile["debts"];
  lang: "ar" | "fr";
  empty: string;
  onPay: () => void;
}) {
  if (!debts.length)
    return (
      <EmptyRow
        text={
          lang === "ar"
            ? "لا توجد ديون حالية. حساب الزبون مسدد."
            : "Aucune créance. Le compte client est soldé."
        }
      />
    );
  return (
    <div>
      <div className="overflow-x-auto">
        <table
          className="w-full"
          style={{ minWidth: 650, borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              {[
                lang === "ar" ? "الفاتورة" : "Facture",
                lang === "ar" ? "تاريخ البيع" : "Date de vente",
                lang === "ar" ? "الاستحقاق" : "Échéance",
                lang === "ar" ? "الإجمالي" : "Total",
                lang === "ar" ? "المدفوع" : "Payé",
                lang === "ar" ? "الدين" : "Créance",
              ].map((label) => (
                <th key={label} style={headStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {debts.map((debt) => (
              <tr
                key={debt.invoiceId}
                style={{ borderBottom: `1px solid ${palette.border}` }}
              >
                <td
                  style={{
                    ...cellStyle,
                    fontWeight: 800,
                    color: palette.primary,
                  }}
                >
                  {debt.invoiceNumber}
                </td>
                <td style={cellStyle}>{formatDate(debt.date, lang)}</td>
                <td
                  style={{
                    ...cellStyle,
                    color:
                      debt.dueDate &&
                      debt.dueDate < new Date().toISOString().slice(0, 10)
                        ? "#b46a66"
                        : palette.muted,
                  }}
                >
                  {formatDate(debt.dueDate, lang)}
                </td>
                <td style={cellStyle}>{formatMoney(debt.totalAmount, lang)}</td>
                <td style={{ ...cellStyle, color: "#4d8a6a" }}>
                  {formatMoney(debt.paidAmount, lang)}
                </td>
                <td style={{ ...cellStyle, color: "#b46a66", fontWeight: 800 }}>
                  {formatMoney(debt.remainingAmount, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={onPay}>
          <CreditCard size={16} />{" "}
          {lang === "ar" ? "تسجيل دفعة" : "Enregistrer un règlement"}
        </Button>
      </div>
    </div>
  );
}

function CustomerAnalytics({
  profile,
  lang,
  empty,
}: {
  profile: CustomerProfile;
  lang: "ar" | "fr";
  empty: string;
}) {
  const maxAmount = Math.max(
    ...profile.analytics.purchaseTrend.map((item) => item.amount),
    1,
  );
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: palette.border }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>
          {lang === "ar" ? "تطور المشتريات" : "Évolution des achats"}
        </h3>
        {profile.analytics.purchaseTrend.length ? (
          <div className="mt-5 flex h-48 items-end gap-3">
            {profile.analytics.purchaseTrend.map((item) => (
              <div
                key={item.month}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span style={{ fontSize: 10.5, color: palette.muted }}>
                  {formatMoney(item.amount, lang)}
                </span>
                <div
                  className="w-full max-w-12 rounded-t-lg"
                  style={{
                    height: `${Math.max(8, (item.amount / maxAmount) * 135)}px`,
                    background:
                      "linear-gradient(180deg, var(--app-accent), var(--app-primary))",
                  }}
                />
                <span style={{ fontSize: 11, color: palette.muted }}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyRow text={empty} />
        )}
      </section>
      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: palette.border }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>
          {lang === "ar" ? "المنتجات الأكثر شراء" : "Produits les plus achetés"}
        </h3>
        {profile.analytics.topProducts.length ? (
          <div className="mt-4 flex flex-col gap-3">
            {profile.analytics.topProducts.map((product, index) => (
              <div
                key={`${product.name}-${index}`}
                className="flex items-center justify-between gap-4 rounded-xl p-3"
                style={{ backgroundColor: palette.bg }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: palette.muted }}>
                    {product.quantity} {lang === "ar" ? "قطعة" : "pièces"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: palette.primary,
                  }}
                >
                  {formatMoney(product.amount, lang)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyRow text={empty} />
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: "rgba(18,60,74,0.07)" }}
          >
            <div style={{ fontSize: 11.5, color: palette.muted }}>
              {lang === "ar" ? "معدل تكرار الشراء" : "Fréquence moyenne"}
            </div>
            <div className="mt-1" style={{ fontSize: 15, fontWeight: 800 }}>
              {profile.analytics.purchaseFrequencyDays
                ? `${profile.analytics.purchaseFrequencyDays} ${lang === "ar" ? "يوم" : "jours"}`
                : "-"}
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: "rgba(195,154,91,0.12)" }}
          >
            <div style={{ fontSize: 11.5, color: palette.muted }}>
              {lang === "ar" ? "آخر نشاط" : "Dernière activité"}
            </div>
            <div className="mt-1" style={{ fontSize: 15, fontWeight: 800 }}>
              {formatDate(profile.analytics.lastActivity, lang)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed px-6 text-center"
      style={{
        borderColor: palette.borderStrong,
        color: palette.muted,
        fontSize: 13.5,
      }}
    >
      {text}
    </div>
  );
}
