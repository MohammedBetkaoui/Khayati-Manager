import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { CalendarDays, CircleDollarSign, Eye, Plus, ReceiptText, Truck, Wallet } from "lucide-react";
import { PageHeading, StatePanel, StatCard, formatDate, formatMoney } from "../components/commerce-ui";
import { Badge, Button, Field, TextInput } from "../components/kit";
import { ModalShell, Textarea } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { MaterialPurchase, Supplier } from "../lib/commerce";

type SupplierPayment = {
  id: number;
  purchaseId: number | null;
  amount: number;
  paymentMethod: string;
  date: string;
  reference: string | null;
  notes: string | null;
};

type SupplierAdvance = {
  id: number;
  amount: number;
  appliedAmount: number;
  remainingAmount: number;
  debtBefore: number | null;
  debtAfter: number | null;
  status: string;
  date: string;
  notes: string | null;
};

type SupplierProfile = {
  supplier: Supplier;
  statistics: {
    totalPurchases: number;
    totalPaid: number;
    totalDebt: number;
    totalAdvances: number;
    purchaseCount: number;
    lastPurchase: string | null;
    lastPayment: string | null;
    averagePurchase: number;
  };
  purchases: MaterialPurchase[];
  payments: SupplierPayment[];
  advances: SupplierAdvance[];
};

export function SupplierProfilePage() {
  const { supplierId } = useParams();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [paymentHistoryModalOpen, setPaymentHistoryModalOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchJson<SupplierProfile>(`/inventory/suppliers/${supplierId}/profile`, {
      signal: controller.signal,
    })
      .then(setProfile)
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load supplier profile",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [supplierId, refreshKey]);

  const text =
    lang === "ar"
      ? {
          title: "ملف المورد",
          subtitle: "ملف مالي وتجاري كامل للمورد.",
          purchases: "تاريخ المشتريات",
          payments: "تاريخ المدفوعات",
          advances: "الدفعات المسبقة",
          totalPurchases: "إجمالي المشتريات",
          totalPaid: "إجمالي المدفوع",
          debt: "الدين الحالي",
          average: "متوسط الشراء",
        }
      : {
          title: "Profil fournisseur",
          subtitle: "Dossier financier et commercial complet du fournisseur.",
          purchases: "Historique des achats",
          payments: "Historique des paiements",
          advances: "Avances",
          totalPurchases: "Total achats",
          totalPaid: "Total payé",
          debt: "Dette actuelle",
          average: "Achat moyen",
        };
  const archived = profile?.supplier.statusCode === "ARCHIVED";

  return (
    <PageBackground>
      <PageHeading
        title={profile?.supplier.name ?? text.title}
        subtitle={text.subtitle}
        backTo={archived ? "/suppliers/archives" : "/suppliers"}
        actions={
          profile ? (
            <Button
              variant="primary"
              onClick={() => setAdvanceModalOpen(true)}
              disabled={profile.statistics.totalDebt <= 0}
            >
              <Plus size={16} />{" "}
              {lang === "ar" ? "تسجيل دفعة مسبقة" : "Nouvelle avance"}
            </Button>
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
            ? "هذا المورد مؤرشف. يبقى ملفه المالي وكل مشترياته ومدفوعاته قابلة للاستشارة، ويمكن تسديد ديونه القديمة، لكنه غير متاح للمشتريات الجديدة حتى تتم إعادته من صفحة الأرشيف."
            : "Ce fournisseur est archivé. Son dossier financier, ses achats et paiements restent consultables et ses anciennes dettes peuvent être réglées, mais aucun nouvel achat ne peut lui être associé avant sa restauration."}
        </div>
      ) : null}
      <StatePanel
        loading={loading}
        error={error}
        empty={!loading && !error && !profile}
        emptyTitle={lang === "ar" ? "المورد غير موجود" : "Fournisseur introuvable"}
      />
      {profile ? (
        <>
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ReceiptText} label={text.totalPurchases} value={formatMoney(profile.statistics.totalPurchases, lang)} />
            <StatCard icon={Wallet} label={text.totalPaid} value={formatMoney(profile.statistics.totalPaid, lang)} color="#4d8a6a" tint="rgba(77,138,106,0.12)" />
            <StatCard icon={CircleDollarSign} label={text.debt} value={formatMoney(profile.statistics.totalDebt, lang)} color="#b46a66" tint="rgba(201,138,134,0.13)" />
            <StatCard icon={CalendarDays} label={text.average} value={formatMoney(profile.statistics.averagePurchase, lang)} color="#a87d3c" tint="rgba(195,154,91,0.15)" />
          </section>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.accentSoft, color: palette.accent }}>
                  <Truck size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 900 }}>{profile.supplier.name}</h2>
                  <Badge
                    bg={archived ? "rgba(107,106,98,.14)" : "rgba(77,138,106,0.12)"}
                    fg={archived ? "#6b6a62" : "#4d8a6a"}
                  >
                    {profile.supplier.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm" style={{ color: palette.text }}>
                <Info label={lang === "ar" ? "الهاتف" : "Téléphone"} value={profile.supplier.phone} />
                <Info label={lang === "ar" ? "المدينة" : "Ville"} value={profile.supplier.city} />
                <Info label={lang === "ar" ? "العنوان" : "Adresse"} value={profile.supplier.address} />
                <Info label={lang === "ar" ? "آخر شراء" : "Dernier achat"} value={formatDate(profile.supplier.lastPurchaseDate, lang)} />
                <Info label={lang === "ar" ? "ملاحظات" : "Notes"} value={profile.supplier.notes} />
              </div>
            </div>
            <DataCard title={text.purchases}>
              <PurchasesTable rows={profile.purchases} lang={lang} />
            </DataCard>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataCard
              title={text.payments}
              actions={
                <Button onClick={() => setPaymentHistoryModalOpen(true)}>
                  <Eye size={15} /> {lang === "ar" ? "عرض" : "Voir"}
                </Button>
              }
            >
              <PaymentHistoryTable
                payments={profile.payments}
                advances={profile.advances}
                lang={lang}
              />
            </DataCard>
            <DataCard
              title={text.advances}
              actions={
                <Button
                  onClick={() => setAdvanceModalOpen(true)}
                  disabled={profile.statistics.totalDebt <= 0}
                >
                  <Plus size={15} />{" "}
                  {lang === "ar" ? "تسجيل دفعة" : "Nouvelle avance"}
                </Button>
              }
            >
              <AdvancesDebtTable rows={profile.advances} lang={lang} />
            </DataCard>
          </section>
          <SupplierAdvanceModal
            open={advanceModalOpen}
            supplierId={profile.supplier.id}
            currentDebt={profile.statistics.totalDebt}
            onClose={() => setAdvanceModalOpen(false)}
            onSaved={() => {
              setAdvanceModalOpen(false);
              setRefreshKey((value) => value + 1);
            }}
          />
          <PaymentHistoryModal
            open={paymentHistoryModalOpen}
            payments={profile.payments}
            advances={profile.advances}
            lang={lang}
            onClose={() => setPaymentHistoryModalOpen(false)}
          />
        </>
      ) : null}
    </PageBackground>
  );
}

function SupplierAdvanceModal({
  open,
  supplierId,
  currentDebt,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplierId: number;
  currentDebt: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(currentDebt > 0 ? String(currentDebt) : "");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setError(null);
  }, [currentDebt, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(
        lang === "ar"
          ? "أدخل مبلغاً صحيحاً."
          : "Saisissez un montant valide.",
      );
      return;
    }
    if (numericAmount > currentDebt) {
      setError(
        lang === "ar"
          ? "لا يمكن أن تتجاوز الدفعة الدين الحالي."
          : "Le montant ne peut pas dépasser la dette actuelle.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/inventory/suppliers/${supplierId}/advances`, {
        method: "POST",
        body: JSON.stringify({
          amount: numericAmount,
          date,
          notes: notes || undefined,
        }),
      });
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create supplier advance",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={
        lang === "ar"
          ? "تسجيل دفعة مسبقة للمورد"
          : "Nouvelle avance fournisseur"
      }
      maxWidth={560}
    >
      <form onSubmit={submit} className="p-6">
        <div
          className="mb-5 rounded-2xl p-4"
          style={{
            backgroundColor:
              currentDebt > 0
                ? "rgba(201,138,134,0.1)"
                : "rgba(77,138,106,0.1)",
            color: currentDebt > 0 ? "#9b4d49" : "#3f765a",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>
            {lang === "ar" ? "الدين الحالي" : "Dette actuelle"}
          </div>
          <div className="mt-1" style={{ fontSize: 22, fontWeight: 900 }}>
            {formatMoney(currentDebt, lang)}
          </div>
          <p className="mt-1 text-xs">
            {lang === "ar"
              ? "سيتم خصم هذه الدفعة من الدين الحالي للمورد."
              : "Cette avance sera déduite de la dette actuelle du fournisseur."}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "المبلغ *" : "Montant *"}>
            <TextInput
              required
              min="0.01"
              max={currentDebt || undefined}
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "التاريخ" : "Date"}>
            <TextInput
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظة" : "Note"}>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                lang === "ar"
                  ? "مثال: دفعة على حساب الدين الحالي"
                  : "Exemple : avance sur dette actuelle"
              }
            />
          </Field>
        </div>
        {error ? (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{ color: "#a94f4a", backgroundColor: "rgba(201,138,134,0.12)" }}
          >
            {error}
          </div>
        ) : null}
        <div
          className="mt-6 flex justify-end gap-2"
          style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 18 }}
        >
          <Button onClick={onClose} disabled={saving}>
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving || currentDebt <= 0}
          >
            {saving
              ? lang === "ar"
                ? "جاري الحفظ..."
                : "Enregistrement..."
              : lang === "ar"
                ? "تسجيل الدفعة"
                : "Enregistrer l'avance"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 rounded-xl px-3 py-2" style={{ backgroundColor: palette.bg }}>
      <span style={{ color: palette.muted }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value || "-"}</span>
    </div>
  );
}

function DataCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 style={{ fontSize: 16, fontWeight: 900 }}>{title}</h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PurchasesTable({ rows, lang }: { rows: MaterialPurchase[]; lang: "ar" | "fr" }) {
  if (!rows.length) return <Empty lang={lang} />;
  return (
    <SimpleTable
      headers={lang === "ar" ? ["التاريخ", "المادة", "الكمية", "المبلغ", "الباقي"] : ["Date", "Matière", "Quantité", "Total", "Reste"]}
      rows={rows.map((row) => [
        formatDate(row.purchaseDate, lang),
        row.materialName,
        `${row.quantityPurchased} ${row.unit}`,
        formatMoney(row.totalAmount, lang),
        formatMoney(row.remainingAmount, lang),
      ])}
    />
  );
}

function PaymentsTable({ rows, lang }: { rows: SupplierPayment[]; lang: "ar" | "fr" }) {
  if (!rows.length) return <Empty lang={lang} />;
  return (
    <SimpleTable
      headers={lang === "ar" ? ["التاريخ", "المبلغ", "الطريقة", "المرجع"] : ["Date", "Montant", "Méthode", "Référence"]}
      rows={rows.map((row) => [
        formatDate(row.date, lang),
        formatMoney(row.amount, lang),
        row.paymentMethod,
        row.reference || "-",
      ])}
    />
  );
}

type PaymentHistoryRow =
  | {
      id: string;
      date: string;
      kind: "payment";
      amount: number;
      method: string;
      purchaseId: number | null;
      reference: string | null;
      notes: string | null;
      debtBefore: null;
      debtAfter: null;
      status: string;
    }
  | {
      id: string;
      date: string;
      kind: "advance";
      amount: number;
      method: string;
      purchaseId: null;
      reference: string | null;
      notes: string | null;
      debtBefore: number | null;
      debtAfter: number;
      status: string;
    };

function PaymentHistoryTable({
  payments,
  advances,
  lang,
}: {
  payments: SupplierPayment[];
  advances: SupplierAdvance[];
  lang: "ar" | "fr";
}) {
  const rows: PaymentHistoryRow[] = [
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.date,
      kind: "payment" as const,
      amount: payment.amount,
      method: payment.paymentMethod,
      purchaseId: payment.purchaseId,
      reference: payment.reference,
      notes: payment.notes,
      debtBefore: null,
      debtAfter: null,
      status: lang === "ar" ? "دفع مورد" : "Paiement",
    })),
    ...advances.map((advance) => ({
      id: `advance-${advance.id}`,
      date: advance.date,
      kind: "advance" as const,
      amount: advance.amount,
      method: lang === "ar" ? "دفعة مسبقة على الدين" : "Avance sur dette",
      purchaseId: null,
      reference: null,
      notes: advance.notes,
      debtBefore: advance.debtBefore ?? null,
      debtAfter: advance.debtAfter ?? advance.remainingAmount,
      status: advance.status,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  if (!rows.length) return <Empty lang={lang} />;

  const headers =
    lang === "ar"
      ? [
          "التاريخ",
          "النوع",
          "المبلغ",
          "الطريقة / المصدر",
          "الشراء",
          "الدين قبل",
          "الدين بعد",
          "المرجع",
          "ملاحظة",
        ]
      : [
          "Date",
          "Type",
          "Montant",
          "Méthode / source",
          "Achat",
          "Dette avant",
          "Dette après",
          "Référence",
          "Note",
        ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 1120, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => (
              <th key={header} style={headStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isAdvance = row.kind === "advance";
            return (
              <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                <td style={cellStyle}>{formatDate(row.date, lang)}</td>
                <td style={cellStyle}>
                  <Badge
                    bg={isAdvance ? "rgba(195,154,91,0.15)" : "rgba(77,138,106,0.12)"}
                    fg={isAdvance ? "#a87d3c" : "#4d8a6a"}
                  >
                    {isAdvance
                      ? lang === "ar"
                        ? "دفعة مسبقة"
                        : "Avance"
                      : lang === "ar"
                        ? "دفع"
                        : "Paiement"}
                  </Badge>
                </td>
                <td style={{ ...cellStyle, fontWeight: 900 }}>
                  {formatMoney(row.amount, lang)}
                </td>
                <td style={cellStyle}>{row.method}</td>
                <td style={cellStyle}>
                  {row.purchaseId
                    ? lang === "ar"
                      ? `شراء #${row.purchaseId}`
                      : `Achat #${row.purchaseId}`
                    : "-"}
                </td>
                <td style={cellStyle}>
                  {row.debtBefore === null ? "-" : formatMoney(row.debtBefore, lang)}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    fontWeight: isAdvance ? 900 : 700,
                    color: isAdvance
                      ? row.debtAfter > 0
                        ? "#b46a66"
                        : "#4d8a6a"
                      : palette.muted,
                  }}
                >
                  {isAdvance ? formatMoney(row.debtAfter, lang) : "-"}
                </td>
                <td style={cellStyle}>{row.reference || "-"}</td>
                <td style={{ ...cellStyle, maxWidth: 220, whiteSpace: "normal", color: palette.muted }}>
                  {row.notes || row.status || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaymentHistoryModal({
  open,
  payments,
  advances,
  lang,
  onClose,
}: {
  open: boolean;
  payments: SupplierPayment[];
  advances: SupplierAdvance[];
  lang: "ar" | "fr";
  onClose: () => void;
}) {
  const rows: PaymentHistoryRow[] = [
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      date: payment.date,
      kind: "payment" as const,
      amount: payment.amount,
      method: payment.paymentMethod,
      purchaseId: payment.purchaseId,
      reference: payment.reference,
      notes: payment.notes,
      debtBefore: null,
      debtAfter: null,
      status: lang === "ar" ? "دفع مورد" : "Paiement fournisseur",
    })),
    ...advances.map((advance) => ({
      id: `advance-${advance.id}`,
      date: advance.date,
      kind: "advance" as const,
      amount: advance.amount,
      method: lang === "ar" ? "دفعة مسبقة مرتبطة بالدين" : "Avance liée à la dette",
      purchaseId: null,
      reference: null,
      notes: advance.notes,
      debtBefore: advance.debtBefore ?? null,
      debtAfter: advance.debtAfter ?? advance.remainingAmount,
      status: advance.status,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date));

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={lang === "ar" ? "تفاصيل تاريخ المدفوعات" : "Détail de l'historique des paiements"}
      maxWidth={920}
    >
      <div className="p-6">
        {rows.length ? (
          <div className="grid grid-cols-1 gap-4">
            {rows.map((row) => {
              const isAdvance = row.kind === "advance";
              return (
                <article
                  key={row.id}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: isAdvance
                      ? "rgba(195,154,91,0.08)"
                      : palette.surface,
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor: isAdvance
                            ? "rgba(195,154,91,0.16)"
                            : "rgba(77,138,106,0.12)",
                          color: isAdvance ? "#a87d3c" : "#4d8a6a",
                        }}
                      >
                        {isAdvance ? <CircleDollarSign size={20} /> : <Wallet size={20} />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            bg={
                              isAdvance
                                ? "rgba(195,154,91,0.16)"
                                : "rgba(77,138,106,0.12)"
                            }
                            fg={isAdvance ? "#a87d3c" : "#4d8a6a"}
                          >
                            {isAdvance
                              ? lang === "ar"
                                ? "دفعة مسبقة"
                                : "Avance"
                              : lang === "ar"
                                ? "دفع"
                                : "Paiement"}
                          </Badge>
                          <span style={{ fontSize: 12.5, color: palette.muted }}>
                            {formatDate(row.date, lang)}
                          </span>
                        </div>
                        <h3 className="mt-2" style={{ fontSize: 20, fontWeight: 900, color: palette.text }}>
                          {formatMoney(row.amount, lang)}
                        </h3>
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: palette.muted }}>
                      {row.method}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <DetailPill
                      label={lang === "ar" ? "الشراء المرتبط" : "Achat lié"}
                      value={
                        row.purchaseId
                          ? lang === "ar"
                            ? `شراء #${row.purchaseId}`
                            : `Achat #${row.purchaseId}`
                          : "-"
                      }
                    />
                    <DetailPill
                      label={lang === "ar" ? "المرجع" : "Référence"}
                      value={row.reference || "-"}
                    />
                    <DetailPill
                      label={lang === "ar" ? "الحالة" : "État"}
                      value={row.status || "-"}
                    />
                  </div>

                  {isAdvance ? (
                    <div
                      className="mt-4 rounded-2xl p-4"
                      style={{ backgroundColor: palette.bg }}
                    >
                      <div className="text-xs font-bold" style={{ color: palette.muted }}>
                        {lang === "ar" ? "تأثير الدفعة على الدين" : "Impact sur la dette"}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <DebtBox
                          label={lang === "ar" ? "قبل" : "Avant"}
                          value={
                            row.debtBefore === null
                              ? "-"
                              : formatMoney(row.debtBefore, lang)
                          }
                        />
                        <span style={{ color: palette.muted, fontWeight: 900 }}>→</span>
                        <DebtBox
                          label={lang === "ar" ? "بعد" : "Après"}
                          value={formatMoney(row.debtAfter, lang)}
                          highlight={row.debtAfter <= 0}
                        />
                      </div>
                    </div>
                  ) : null}

                  {row.notes ? (
                    <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: palette.bg, color: palette.muted }}>
                      {row.notes}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty lang={lang} />
        )}
      </div>
    </ModalShell>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: palette.bg }}>
      <div style={{ fontSize: 11.5, color: palette.muted }}>{label}</div>
      <div className="mt-1 truncate" style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>
        {value}
      </div>
    </div>
  );
}

function DebtBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-2"
      style={{
        backgroundColor: highlight ? "rgba(77,138,106,0.12)" : palette.surface,
        border: `1px solid ${palette.border}`,
        minWidth: 150,
      }}
    >
      <div style={{ fontSize: 11.5, color: palette.muted }}>{label}</div>
      <div
        className="mt-1"
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: highlight ? "#4d8a6a" : palette.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AdvancesDebtTable({ rows, lang }: { rows: SupplierAdvance[]; lang: "ar" | "fr" }) {
  if (!rows.length) return <Empty lang={lang} />;
  const headers =
    lang === "ar"
      ? ["التاريخ", "المبلغ", "باقي الدين", "التاريخ", "الحالة"]
      : ["Date", "Montant", "Reste dette", "Historique", "État"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 720, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => (
              <th key={header} style={headStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const debtBefore = row.debtBefore ?? null;
            const debtAfter = row.debtAfter ?? row.remainingAmount;
            return (
              <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                <td style={cellStyle}>{formatDate(row.date, lang)}</td>
                <td style={{ ...cellStyle, fontWeight: 900 }}>
                  {formatMoney(row.amount, lang)}
                </td>
                <td style={{ ...cellStyle, fontWeight: 900, color: debtAfter > 0 ? "#b46a66" : "#4d8a6a" }}>
                  {formatMoney(debtAfter, lang)}
                </td>
                <td style={cellStyle}>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs" style={{ backgroundColor: palette.bg, color: palette.muted }}>
                    <span>{debtBefore === null ? "-" : formatMoney(debtBefore, lang)}</span>
                    <span>→</span>
                    <span style={{ color: debtAfter > 0 ? "#b46a66" : "#4d8a6a", fontWeight: 800 }}>
                      {formatMoney(debtAfter, lang)}
                    </span>
                  </div>
                </td>
                <td style={cellStyle}>{row.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdvancesTable({ rows, lang }: { rows: SupplierAdvance[]; lang: "ar" | "fr" }) {
  if (!rows.length) return <Empty lang={lang} />;
  return (
    <SimpleTable
      headers={lang === "ar" ? ["التاريخ", "المبلغ", "المتبقي", "الحالة"] : ["Date", "Montant", "Reste", "État"]}
      rows={rows.map((row) => [
        formatDate(row.date, lang),
        formatMoney(row.amount, lang),
        formatMoney(row.remainingAmount, lang),
        row.status,
      ])}
    />
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 560, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => (
              <th key={header} style={headStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} style={{ borderBottom: `1px solid ${palette.border}` }}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} style={cellStyle}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ lang }: { lang: "ar" | "fr" }) {
  return (
    <div className="rounded-2xl p-5 text-sm" style={{ backgroundColor: palette.bg, color: palette.muted }}>
      {lang === "ar" ? "لا توجد بيانات بعد" : "Aucune donnée pour le moment"}
    </div>
  );
}

const headStyle: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "start",
  fontSize: 12,
  color: palette.muted,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  padding: "13px 10px",
  fontSize: 13,
  color: palette.text,
  verticalAlign: "middle",
};
