import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { CalendarDays, CircleDollarSign, ReceiptText, Truck, Wallet } from "lucide-react";
import { PageHeading, StatePanel, StatCard, formatDate, formatMoney } from "../components/commerce-ui";
import { Badge } from "../components/kit";
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
  }, [supplierId]);

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

  return (
    <PageBackground>
      <PageHeading
        title={profile?.supplier.name ?? text.title}
        subtitle={text.subtitle}
        backTo="/suppliers"
      />
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
                  <Badge bg="rgba(77,138,106,0.12)" fg="#4d8a6a">{profile.supplier.status}</Badge>
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
            <DataCard title={text.payments}>
              <PaymentsTable rows={profile.payments} lang={lang} />
            </DataCard>
            <DataCard title={text.advances}>
              <AdvancesTable rows={profile.advances} lang={lang} />
            </DataCard>
          </section>
        </>
      ) : null}
    </PageBackground>
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

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <h2 style={{ fontSize: 16, fontWeight: 900 }}>{title}</h2>
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
