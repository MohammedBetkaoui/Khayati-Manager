import { useDeferredValue, useEffect, useState } from "react";
import {
  Archive,
  CircleDollarSign,
  Eye,
  ReceiptText,
  RotateCcw,
  Search,
  UserRoundCheck,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  PageHeading,
  Pager,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { Badge, Button } from "../components/kit";
import { ModalShell } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { ApiCustomer, Pagination } from "../lib/commerce";

const emptyPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

export function CustomerArchivesPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restoreTarget, setRestoreTarget] = useState<ApiCustomer | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          status: "ARCHIVED",
          page: String(page),
          limit: "20",
          sortBy: "fullName",
          sortOrder: "ASC",
        });
        if (deferredSearch) params.set("search", deferredSearch);

        const response = await fetchJson<{
          data: ApiCustomer[];
          pagination: Pagination;
        }>(`/sales/customers?${params.toString()}`, {
          signal: controller.signal,
        });
        setCustomers(response.data);
        setPagination(response.pagination);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load archived customers",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [deferredSearch, page, refreshKey]);

  const pageSales = customers.reduce(
    (total, customer) => total + customer.salesCount,
    0,
  );
  const pageDebt = customers.reduce(
    (total, customer) => total + customer.totalDebt,
    0,
  );

  async function restoreCustomer(customer: ApiCustomer) {
    setRestoring(true);
    setError(null);
    try {
      await fetchJson(`/sales/customers/${customer.id}/restore`, {
        method: "PATCH",
      });
      setRestoreTarget(null);
      setNotice(
        lang === "ar"
          ? "تم إرجاع الزبون إلى القائمة الرئيسية وأصبح نشطاً من جديد."
          : "Le client a été restauré dans la liste principale.",
      );
      if (customers.length === 1 && page > 1) {
        setPage((value) => Math.max(1, value - 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to restore customer",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <PageBackground>
      <PageHeading
        title={lang === "ar" ? "أرشيف الزبائن" : "Archives des clients"}
        subtitle={
          lang === "ar"
            ? "ملفات الزبائن المؤرشفين محفوظة مع الفواتير والمدفوعات والديون، ولا تظهر في قائمة الزبائن أو المبيعات الجديدة."
            : "Les clients archivés conservent leur profil, leurs factures, paiements et créances, mais sont exclus de la liste principale et des nouvelles ventes."
        }
        backTo="/clients"
      />

      {notice ? (
        <div
          className="mt-5 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(77,138,106,0.11)", color: "#3f765a" }}
        >
          {notice}
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Archive}
          label={lang === "ar" ? "الزبائن المؤرشفون" : "Clients archivés"}
          value={pagination.total}
        />
        <StatCard
          icon={ReceiptText}
          label={
            lang === "ar" ? "مبيعات هذه الصفحة" : "Ventes sur cette page"
          }
          value={pageSales}
          color="#a87d3c"
          tint="rgba(195,154,91,0.15)"
        />
        <StatCard
          icon={CircleDollarSign}
          label={
            lang === "ar" ? "ديون هذه الصفحة" : "Créances sur cette page"
          }
          value={formatMoney(pageDebt, lang)}
          color="#b46a66"
          tint="rgba(201,138,134,0.13)"
        />
      </section>

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
          ? "معلومة: يمكن فتح الملف التجاري للزبون المؤرشف ومتابعة تاريخه. عند إرجاعه سيصبح نشطاً ومتاحاً في المبيعات الجديدة."
          : "Information : le dossier commercial reste consultable. Après restauration, le client redevient actif et disponible dans les nouvelles ventes."}
      </div>

      <section
        className="mt-5"
        style={{
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 22,
          padding: 20,
        }}
      >
        <div className="relative mb-5 min-w-[260px] max-w-[560px]">
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
            placeholder={
              lang === "ar"
                ? "البحث بالاسم أو الهاتف أو المدينة..."
                : "Rechercher un client archivé..."
            }
            className="h-10 w-full rounded-xl border outline-none"
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
              color: palette.text,
              paddingInlineStart: 42,
              paddingInlineEnd: 14,
              fontSize: 13.5,
            }}
          />
        </div>

        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && !error && customers.length === 0}
          emptyTitle={
            lang === "ar" ? "لا يوجد زبائن مؤرشفون" : "Aucun client archivé"
          }
          emptyDescription={
            lang === "ar"
              ? "الزبائن الذين تقوم بأرشفتهم سيظهرون هنا."
              : "Les clients archivés depuis la liste principale apparaîtront ici."
          }
          onRetry={() => setRefreshKey((value) => value + 1)}
        />

        {!loading && !error && customers.length > 0 ? (
          <ArchivedCustomersTable
            customers={customers}
            lang={lang}
            onView={(customer) =>
              navigate(`/customer-profile/${customer.id}`)
            }
            onRestore={setRestoreTarget}
          />
        ) : null}

        <Pager
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </section>

      <RestoreCustomerModal
        customer={restoreTarget}
        lang={lang}
        saving={restoring}
        onClose={() => {
          if (!restoring) setRestoreTarget(null);
        }}
        onConfirm={() => {
          if (restoreTarget) void restoreCustomer(restoreTarget);
        }}
      />
    </PageBackground>
  );
}

function ArchivedCustomersTable({
  customers,
  lang,
  onView,
  onRestore,
}: {
  customers: ApiCustomer[];
  lang: "ar" | "fr";
  onView: (customer: ApiCustomer) => void;
  onRestore: (customer: ApiCustomer) => void;
}) {
  const headers =
    lang === "ar"
      ? [
          "الزبون",
          "الهاتف",
          "تاريخ الأرشفة",
          "إجمالي المشتريات",
          "الدين الحالي",
          "المبيعات",
          "الحالة",
          "الإجراءات",
        ]
      : [
          "Client",
          "Téléphone",
          "Date d'archivage",
          "Total achats",
          "Dette actuelle",
          "Ventes",
          "Statut",
          "Actions",
        ];

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 980, borderCollapse: "collapse" }}
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
          {customers.map((customer) => (
            <tr
              key={customer.id}
              style={{ borderBottom: `1px solid ${palette.border}` }}
            >
              <td style={cellStyle}>
                <button
                  type="button"
                  onClick={() => onView(customer)}
                  className="text-start hover:underline"
                  style={{ fontWeight: 900, color: palette.primary }}
                >
                  {customer.fullName}
                </button>
                <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                  {customer.city || customer.wilaya || "-"}
                </div>
              </td>
              <td style={{ ...cellStyle, direction: "ltr" }}>{customer.phone}</td>
              <td style={cellStyle}>
                {formatDate(customer.archivedAt ?? customer.updatedAt, lang)}
              </td>
              <td style={{ ...cellStyle, fontWeight: 800 }}>
                {formatMoney(customer.totalPurchases, lang)}
              </td>
              <td
                style={{
                  ...cellStyle,
                  fontWeight: 900,
                  color: customer.totalDebt > 0 ? "#b46a66" : "#4d8a6a",
                }}
              >
                {formatMoney(customer.totalDebt, lang)}
              </td>
              <td style={cellStyle}>{customer.salesCount}</td>
              <td style={cellStyle}>
                <Badge bg="rgba(107,106,98,.14)" fg="#6b6a62">
                  {lang === "ar" ? "مؤرشف" : "Archivé"}
                </Badge>
              </td>
              <td style={cellStyle}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onView(customer)}
                    aria-label={lang === "ar" ? "فتح الملف" : "Voir le profil"}
                    className="flex size-9 items-center justify-center rounded-xl transition-opacity hover:opacity-75"
                    style={{
                      color: palette.primary,
                      backgroundColor: "rgba(18,60,74,0.09)",
                    }}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestore(customer)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80"
                    style={{
                      color: "#4d8a6a",
                      backgroundColor: "rgba(77,138,106,0.11)",
                      border: "1px solid rgba(77,138,106,0.22)",
                    }}
                  >
                    <RotateCcw size={14} />
                    {lang === "ar" ? "إرجاع" : "Restaurer"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RestoreCustomerModal({
  customer,
  lang,
  saving,
  onClose,
  onConfirm,
}: {
  customer: ApiCustomer | null;
  lang: "ar" | "fr";
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      open={Boolean(customer)}
      onClose={onClose}
      title={lang === "ar" ? "إرجاع الزبون للقائمة الرئيسية" : "Restaurer le client"}
      maxWidth={580}
    >
      {customer ? (
        <div className="p-6">
          <div
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(77,138,106,0.12)",
              border: "1px solid rgba(77,138,106,0.25)",
            }}
          >
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                color: "#4d8a6a",
                backgroundColor: "rgba(77,138,106,0.16)",
              }}
            >
              <UserRoundCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: palette.text }}>
                {lang === "ar"
                  ? `سيتم إرجاع «${customer.fullName}» إلى قائمة الزبائن.`
                  : `Le client « ${customer.fullName} » sera renvoyé vers la liste principale.`}
              </div>
              <p
                className="mt-1 text-sm"
                style={{ color: palette.muted, lineHeight: 1.75 }}
              >
                {lang === "ar"
                  ? "بعد التأكيد سيصبح الزبون نشطاً من جديد ويمكن اختياره عند تسجيل مبيعات جديدة. سيبقى سجله التجاري السابق دون تغيير."
                  : "Après confirmation, il redeviendra actif et pourra être sélectionné dans les nouvelles ventes. Son historique restera inchangé."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RestoreCustomerInfo
              label={lang === "ar" ? "الهاتف" : "Téléphone"}
              value={customer.phone || "-"}
            />
            <RestoreCustomerInfo
              label={lang === "ar" ? "المبيعات" : "Ventes"}
              value={String(customer.salesCount)}
            />
            <RestoreCustomerInfo
              label={lang === "ar" ? "الدين الحالي" : "Dette actuelle"}
              value={formatMoney(customer.totalDebt, lang)}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>
              {lang === "ar" ? "إلغاء" : "Annuler"}
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={saving}>
              <RotateCcw size={15} />
              {saving
                ? lang === "ar"
                  ? "جاري الإرجاع..."
                  : "Restauration..."
                : lang === "ar"
                  ? "تأكيد الإرجاع"
                  : "Confirmer la restauration"}
            </Button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}

function RestoreCustomerInfo({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ fontSize: 11.5, color: palette.muted, fontWeight: 700 }}>
        {label}
      </div>
      <div
        className="mt-1"
        style={{ fontSize: 14, fontWeight: 900, color: palette.text }}
      >
        {value}
      </div>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "start",
  color: palette.muted,
  fontSize: 12.5,
  fontWeight: 800,
};

const cellStyle: React.CSSProperties = {
  padding: "14px 10px",
  textAlign: "start",
  color: palette.text,
  fontSize: 13.5,
  verticalAlign: "middle",
};
