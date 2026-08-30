import {
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useParams } from "react-router";
import {
  CalendarDays,
  CircleDollarSign,
  Eye,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  StickyNote,
  Truck,
  Wallet,
} from "lucide-react";
import { PageHeading, StatePanel, StatCard, formatDate, formatMoney } from "../components/commerce-ui";
import {
  LegacyDebtBalanceSummary,
  LegacyDebtSection,
} from "../components/legacy-debt-section";
import { Badge, Button, Field, TextInput } from "../components/kit";
import { ModalShell, Textarea } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { LegacyDebt, MaterialPurchase, Supplier } from "../lib/commerce";

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
    purchasesDebt: number;
    legacyDebtOriginal: number;
    legacyDebtPaid: number;
    legacyDebtRemaining: number;
    totalPayable: number;
    totalAdvances: number;
    purchaseCount: number;
    lastPurchase: string | null;
    lastPayment: string | null;
    averagePurchase: number;
  };
  purchases: MaterialPurchase[];
  payments: SupplierPayment[];
  advances: SupplierAdvance[];
  legacyDebts: LegacyDebt[];
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
          debt: "إجمالي المستحق للمورد",
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
          debt: "Total dû au fournisseur",
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
              disabled={profile.statistics.purchasesDebt <= 0}
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

          <LegacyDebtBalanceSummary
            ownerType="supplier"
            currentDebt={profile.statistics.purchasesDebt}
            legacyDebt={profile.statistics.legacyDebtRemaining}
            totalDebt={profile.statistics.totalPayable}
          />

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <SupplierIdentityCard
              profile={profile}
              archived={archived}
              lang={lang}
            />
            <SupplierFinanceCard
              profile={profile}
              lang={lang}
              onAdvance={() => setAdvanceModalOpen(true)}
            />
          </section>

          <section className="mt-5">
            <DataCard
              title={text.purchases}
              subtitle={
                lang === "ar"
                  ? "كل عمليات شراء المواد من هذا المورد مع حالة التسديد."
                  : "Tous les achats de matières liés à ce fournisseur avec leur règlement."
              }
            >
              <PurchasesTable rows={profile.purchases} lang={lang} />
            </DataCard>
          </section>

          <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DataCard
              title={text.payments}
              subtitle={
                lang === "ar"
                  ? "المدفوعات والدفعات المسبقة المرتبطة بوضعية المورد."
                  : "Paiements et avances liés à la situation du fournisseur."
              }
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
              subtitle={
                lang === "ar"
                  ? "دفعات تخصم من الدين الحالي وتحافظ على أثر الدين قبل وبعد."
                  : "Avances déduites de la dette actuelle avec historique avant/après."
              }
              actions={
                <Button
                  onClick={() => setAdvanceModalOpen(true)}
                  disabled={profile.statistics.purchasesDebt <= 0}
                >
                  <Plus size={15} />{" "}
                  {lang === "ar" ? "تسجيل دفعة" : "Nouvelle avance"}
                </Button>
              }
            >
              <AdvancesDebtTable rows={profile.advances} lang={lang} />
            </DataCard>
          </section>
          <LegacyDebtSection
            ownerType="supplier"
            ownerId={profile.supplier.id}
            debts={profile.legacyDebts}
            onChanged={() => setRefreshKey((value) => value + 1)}
          />
          <SupplierAdvanceModal
            open={advanceModalOpen}
            supplierId={profile.supplier.id}
            currentDebt={profile.statistics.purchasesDebt}
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

function SupplierIdentityCard({
  profile,
  archived,
  lang,
}: {
  profile: SupplierProfile;
  archived: boolean;
  lang: "ar" | "fr";
}) {
  const supplier = profile.supplier;
  return (
    <section
      className="rounded-3xl border p-5"
      style={{ borderColor: palette.border, backgroundColor: palette.surface }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
          >
            <Truck size={22} />
          </div>
          <div>
            <h2 style={{ color: palette.text, fontSize: 20, fontWeight: 900 }}>
              {supplier.name}
            </h2>
            <div className="mt-2">
              <Badge
                bg={archived ? "rgba(107,106,98,.14)" : "rgba(77,138,106,0.12)"}
                fg={archived ? "#6b6a62" : "#4d8a6a"}
              >
                {supplier.status}
              </Badge>
            </div>
          </div>
        </div>
        <div
          className="rounded-2xl px-4 py-3 text-end"
          style={{ backgroundColor: palette.bg }}
        >
          <div style={{ color: palette.muted, fontSize: 12, fontWeight: 700 }}>
            {lang === "ar" ? "عدد المشتريات" : "Achats"}
          </div>
          <div style={{ color: palette.text, fontSize: 22, fontWeight: 900 }}>
            {profile.statistics.purchaseCount}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <Info
          icon={Phone}
          label={lang === "ar" ? "الهاتف" : "Téléphone"}
          value={supplier.phone}
        />
        <Info
          icon={MapPin}
          label={lang === "ar" ? "العنوان" : "Adresse"}
          value={[supplier.address, supplier.city].filter(Boolean).join(" · ")}
        />
        <Info
          icon={CalendarDays}
          label={lang === "ar" ? "آخر شراء" : "Dernier achat"}
          value={formatDate(supplier.lastPurchaseDate, lang)}
        />
        <Info
          icon={Wallet}
          label={lang === "ar" ? "آخر دفع" : "Dernier paiement"}
          value={formatDate(profile.statistics.lastPayment, lang)}
        />
      </div>

      {supplier.notes ? (
        <div
          className="mt-5 rounded-2xl border p-4"
          style={{ borderColor: palette.border, backgroundColor: palette.bg }}
        >
          <div
            className="mb-2 flex items-center gap-2 text-sm font-bold"
            style={{ color: palette.muted }}
          >
            <StickyNote size={15} />
            {lang === "ar" ? "ملاحظات" : "Notes"}
          </div>
          <p style={{ color: palette.text, fontSize: 13.5, lineHeight: 1.8 }}>
            {supplier.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SupplierFinanceCard({
  profile,
  lang,
  onAdvance,
}: {
  profile: SupplierProfile;
  lang: "ar" | "fr";
  onAdvance: () => void;
}) {
  const hasDebt = profile.statistics.totalPayable > 0;
  return (
    <section
      className="rounded-3xl border p-5"
      style={{ borderColor: palette.border, backgroundColor: palette.surface }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div style={{ color: palette.muted, fontSize: 12.5, fontWeight: 800 }}>
            {lang === "ar" ? "الوضعية المالية" : "Situation financière"}
          </div>
          <h2 className="mt-1" style={{ color: palette.text, fontSize: 24, fontWeight: 950 }}>
            {formatMoney(profile.statistics.totalPayable, lang)}
          </h2>
          <p className="mt-1 text-sm" style={{ color: palette.muted }}>
            {lang === "ar"
              ? "إجمالي المبلغ المستحق للمورد حالياً."
              : "Montant total actuellement dû au fournisseur."}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onAdvance}
          disabled={profile.statistics.purchasesDebt <= 0}
        >
          <Plus size={15} />
          {lang === "ar" ? "دفعة" : "Avance"}
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FinanceMiniCard
          label={lang === "ar" ? "المدفوع" : "Payé"}
          value={formatMoney(profile.statistics.totalPaid, lang)}
          tone="paid"
        />
        <FinanceMiniCard
          label={lang === "ar" ? "دفعات مسبقة" : "Avances"}
          value={formatMoney(profile.statistics.totalAdvances, lang)}
          tone="advance"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: palette.border }}>
        <MoneyLine
          label={lang === "ar" ? "ديون المشتريات داخل النظام" : "Dette achats dans le système"}
          value={profile.statistics.purchasesDebt}
          lang={lang}
          danger={profile.statistics.purchasesDebt > 0}
        />
        <MoneyLine
          label={lang === "ar" ? "ديون سابقة" : "Dettes antérieures"}
          value={profile.statistics.legacyDebtRemaining}
          lang={lang}
          danger={profile.statistics.legacyDebtRemaining > 0}
        />
        <MoneyLine
          label={lang === "ar" ? "الإجمالي المستحق للمورد" : "Total dû au fournisseur"}
          value={profile.statistics.totalPayable}
          lang={lang}
          danger={hasDebt}
          strong
        />
      </div>
    </section>
  );
}

function FinanceMiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "paid" | "advance";
}) {
  const color = tone === "paid" ? "#4d8a6a" : "#a87d3c";
  const bg = tone === "paid" ? "rgba(77,138,106,0.11)" : "rgba(195,154,91,0.14)";
  return (
    <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: bg }}>
      <div style={{ color, fontSize: 12, fontWeight: 800 }}>{label}</div>
      <div className="mt-1" style={{ color: palette.text, fontSize: 19, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function MoneyLine({
  label,
  value,
  lang,
  danger = false,
  strong = false,
}: {
  label: string;
  value: number;
  lang: "ar" | "fr";
  danger?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{
        backgroundColor: strong ? palette.bg : palette.surface,
        borderBottom: strong ? "none" : `1px solid ${palette.border}`,
      }}
    >
      <span style={{ color: palette.muted, fontSize: 13, fontWeight: 700 }}>
        {label}
      </span>
      <span
        style={{
          color: danger ? "#b46a66" : "#4d8a6a",
          fontSize: strong ? 16 : 14,
          fontWeight: strong ? 950 : 850,
          whiteSpace: "nowrap",
        }}
      >
        {formatMoney(value, lang)}
      </span>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon?: ComponentType<{ size?: number; style?: CSSProperties }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-2xl px-3 py-3"
      style={{ backgroundColor: palette.bg }}
    >
      <span className="flex items-center gap-2" style={{ color: palette.muted, fontSize: 13 }}>
        {Icon ? <Icon size={15} /> : null}
        {label}
      </span>
      <span
        className="text-end"
        style={{ color: palette.text, fontSize: 13.5, fontWeight: 850 }}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function DataCard({
  title,
  children,
  actions,
  subtitle,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 style={{ color: palette.text, fontSize: 16, fontWeight: 900 }}>{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm" style={{ color: palette.muted }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PurchasesTable({ rows, lang }: { rows: MaterialPurchase[]; lang: "ar" | "fr" }) {
  if (!rows.length) return <Empty lang={lang} />;
  const headers =
    lang === "ar"
      ? ["التاريخ", "المادة", "اللون", "الكمية", "الإجمالي", "المدفوع", "الباقي", "الحالة"]
      : ["Date", "Matière", "Couleur", "Quantité", "Total", "Payé", "Reste", "État"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 920, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => (
              <th key={header} style={headStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasDebt = row.remainingAmount > 0;
            return (
              <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                <td style={cellStyle}>{formatDate(row.purchaseDate, lang)}</td>
                <td style={{ ...cellStyle, fontWeight: 900 }}>
                  <div>{row.materialName}</div>
                  {row.notes ? (
                    <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                      {row.notes}
                    </div>
                  ) : null}
                </td>
                <td style={cellStyle}>{row.color || "-"}</td>
                <td style={cellStyle}>{`${row.quantityPurchased} ${row.unit}`}</td>
                <td style={{ ...cellStyle, fontWeight: 900 }}>{formatMoney(row.totalAmount, lang)}</td>
                <td style={{ ...cellStyle, color: "#4d8a6a", fontWeight: 800 }}>
                  {formatMoney(row.paidAmount, lang)}
                </td>
                <td style={{ ...cellStyle, color: hasDebt ? "#b46a66" : "#4d8a6a", fontWeight: 900 }}>
                  {formatMoney(row.remainingAmount, lang)}
                </td>
                <td style={cellStyle}>
                  <Badge
                    bg={hasDebt ? "rgba(195,154,91,0.16)" : "rgba(77,138,106,0.12)"}
                    fg={hasDebt ? "#a87d3c" : "#4d8a6a"}
                  >
                    {row.paymentStatus || row.status}
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

  return (
    <div className="grid gap-3">
      {rows.slice(0, 6).map((row) => {
        const isAdvance = row.kind === "advance";
        return (
          <article
            key={row.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: palette.border,
              backgroundColor: isAdvance ? "rgba(195,154,91,0.08)" : palette.bg,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    bg={isAdvance ? "rgba(195,154,91,0.16)" : "rgba(77,138,106,0.12)"}
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
                  <span style={{ color: palette.muted, fontSize: 12.5 }}>
                    {formatDate(row.date, lang)}
                  </span>
                </div>
                <div className="mt-2" style={{ color: palette.text, fontSize: 18, fontWeight: 950 }}>
                  {formatMoney(row.amount, lang)}
                </div>
                <div className="mt-1 text-sm" style={{ color: palette.muted }}>
                  {row.method}
                  {row.purchaseId
                    ? lang === "ar"
                      ? ` · شراء #${row.purchaseId}`
                      : ` · Achat #${row.purchaseId}`
                    : ""}
                </div>
              </div>
              {isAdvance ? (
                <div className="rounded-2xl px-3 py-2 text-end" style={{ backgroundColor: palette.surface }}>
                  <div style={{ color: palette.muted, fontSize: 11.5, fontWeight: 800 }}>
                    {lang === "ar" ? "الدين بعد" : "Dette après"}
                  </div>
                  <div style={{ color: row.debtAfter > 0 ? "#b46a66" : "#4d8a6a", fontWeight: 900 }}>
                    {formatMoney(row.debtAfter, lang)}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
      {rows.length > 6 ? (
        <div className="text-sm" style={{ color: palette.muted }}>
          {lang === "ar"
            ? `+ ${rows.length - 6} عملية أخرى في التفاصيل`
            : `+ ${rows.length - 6} autre(s) opération(s) dans les détails`}
        </div>
      ) : null}
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
      ? ["التاريخ", "المبلغ", "باقي الدين", "قبل / بعد", "الحالة"]
      : ["Date", "Montant", "Reste dette", "Avant / après", "État"];
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

const headStyle: CSSProperties = {
  padding: "12px 10px",
  textAlign: "start",
  fontSize: 12,
  color: palette.muted,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const cellStyle: CSSProperties = {
  padding: "13px 10px",
  fontSize: 13,
  color: palette.text,
  verticalAlign: "middle",
};
