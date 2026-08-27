import { useDeferredValue, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CircleDollarSign,
  ContactRound,
  Crown,
  Eye,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router";
import { CustomerFormModal } from "../components/customer-form-modal";
import {
  PageHeading,
  Pager,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { Badge, Button, Select } from "../components/kit";
import { ModalShell } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { ApiCustomer, Pagination } from "../lib/commerce";

type CustomerStats = {
  totalCustomers: number;
  activeCustomers: number;
  importantCustomers: number;
  customersWithDebt: number;
  totalDebt: number;
};

const emptyStats: CustomerStats = {
  totalCustomers: 0,
  activeCustomers: 0,
  importantCustomers: 0,
  customersWithDebt: 0,
  totalDebt: 0,
};

const emptyPagination: Pagination = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

const typeColors: Record<ApiCustomer["typeCode"], { bg: string; fg: string }> =
  {
    REGULAR: { bg: "rgba(18,60,74,0.09)", fg: palette.primary },
    NEW: { bg: "rgba(107,138,160,0.14)", fg: "#587c92" },
    VIP: { bg: "rgba(195,154,91,0.16)", fg: "#946b2f" },
    OCCASIONAL: { bg: "rgba(138,136,127,0.12)", fg: "#6f6d65" },
  };

export function ClientsPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [stats, setStats] = useState<CustomerStats>(emptyStats);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCustomer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ApiCustomer | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: "12" });
    if (deferredSearch.trim()) query.set("search", deferredSearch.trim());
    if (type) query.set("type", type);
    if (status) query.set("status", status);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [list, summary] = await Promise.all([
          fetchJson<{ data: ApiCustomer[]; pagination: Pagination }>(
            `/sales/customers?${query}`,
            { signal: controller.signal },
          ),
          fetchJson<CustomerStats>("/sales/customers/stats", {
            signal: controller.signal,
          }),
        ]);
        setCustomers(list.data);
        setPagination(list.pagination);
        setStats(summary);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error ? caught.message : "Unable to load customers",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [deferredSearch, page, refreshKey, status, type]);

  const reload = () => setRefreshKey((value) => value + 1);

  async function archiveCustomer(customer: ApiCustomer) {
    setArchiving(true);
    setError(null);
    try {
      await fetchJson(`/sales/customers/${customer.id}/archive`, {
        method: "PATCH",
      });
      setArchiveTarget(null);
      setNotice(
        lang === "ar"
          ? "تمت أرشفة الزبون مع الاحتفاظ بسجله التجاري."
          : "Client archivé, historique commercial conservé.",
      );
      if (customers.length === 1 && page > 1) {
        setPage((value) => Math.max(1, value - 1));
      } else {
        reload();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to archive customer",
      );
    } finally {
      setArchiving(false);
    }
  }

  const text =
    lang === "ar"
      ? {
          title: "تسيير الزبائن",
          subtitle:
            "إدارة الزبائن الدائمين والعرضيين، متابعة المبيعات والمدفوعات والديون من ملف تجاري موحد.",
          add: "إضافة زبون",
          search: "البحث بالاسم أو الهاتف أو المدينة...",
          allTypes: "كل أنواع الزبائن",
          allStatuses: "كل الحالات",
          total: "إجمالي الزبائن",
          active: "الزبائن النشطون",
          vip: "الزبائن المهمون",
          debt: "إجمالي ديون الزبائن",
          list: "قائمة الزبائن",
          name: "الزبون",
          contact: "الاتصال",
          type: "النوع",
          purchases: "إجمالي المشتريات",
          debtCol: "المتبقي",
          sales: "المبيعات",
          last: "آخر شراء",
          status: "الحالة",
          actions: "الإجراءات",
          empty: "لا يوجد زبائن",
          emptyDesc: "أضف أول زبون أو غيّر معايير البحث.",
        }
      : {
          title: "Gestion des clients",
          subtitle:
            "Gérez les clients réguliers et occasionnels, leurs ventes, paiements et créances dans un dossier commercial unique.",
          add: "Ajouter un client",
          search: "Rechercher par nom, téléphone ou ville...",
          allTypes: "Tous les types",
          allStatuses: "Tous les statuts",
          total: "Total clients",
          active: "Clients actifs",
          vip: "Clients importants",
          debt: "Créances clients",
          list: "Liste des clients",
          name: "Client",
          contact: "Contact",
          type: "Type",
          purchases: "Total achats",
          debtCol: "Reste dû",
          sales: "Ventes",
          last: "Dernier achat",
          status: "Statut",
          actions: "Actions",
          empty: "Aucun client",
          emptyDesc: "Ajoutez votre premier client ou modifiez les filtres.",
        };

  return (
    <PageBackground>
      <PageHeading
        title={text.title}
        subtitle={text.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate("/clients/archives")}>
              <Archive size={16} />
              {lang === "ar" ? "أرشيف الزبائن" : "Archives"}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus size={17} /> {text.add}
            </Button>
          </div>
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

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ContactRound}
          label={text.total}
          value={stats.totalCustomers}
        />
        <StatCard
          icon={ShieldCheck}
          label={text.active}
          value={stats.activeCustomers}
          color="#4d8a6a"
          tint="rgba(77,138,106,0.12)"
        />
        <StatCard
          icon={Crown}
          label={text.vip}
          value={stats.importantCustomers}
          color="#a87d3c"
          tint="rgba(195,154,91,0.15)"
        />
        <StatCard
          icon={CircleDollarSign}
          label={text.debt}
          value={formatMoney(stats.totalDebt, lang)}
          helper={`${stats.customersWithDebt} ${lang === "ar" ? "زبائن" : "clients"}`}
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
          <div className="relative min-w-[240px] flex-1">
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
                backgroundColor: palette.surface,
                color: palette.text,
                paddingInlineStart: 42,
                paddingInlineEnd: 14,
                fontSize: 13.5,
              }}
            />
          </div>
          <div className="min-w-[190px]">
            <Select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{text.allTypes}</option>
              <option value="REGULAR">
                {lang === "ar" ? "زبون دائم" : "Régulier"}
              </option>
              <option value="NEW">
                {lang === "ar" ? "زبون جديد" : "Nouveau"}
              </option>
              <option value="VIP">
                {lang === "ar" ? "زبون مهم" : "Important"}
              </option>
              <option value="OCCASIONAL">
                {lang === "ar" ? "زبون عرضي" : "Occasionnel"}
              </option>
            </Select>
          </div>
          <div className="min-w-[170px]">
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{text.allStatuses}</option>
              <option value="ACTIVE">{lang === "ar" ? "نشط" : "Actif"}</option>
              <option value="INACTIVE">
                {lang === "ar" ? "غير نشط" : "Inactif"}
              </option>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>
            {text.list}
          </h2>
          <span style={{ fontSize: 12.5, color: palette.muted }}>
            {pagination.total} {lang === "ar" ? "زبون" : "clients"}
          </span>
        </div>

        <div className="mt-4">
          <StatePanel
            loading={loading}
            error={error}
            empty={!loading && !error && customers.length === 0}
            emptyTitle={text.empty}
            emptyDescription={text.emptyDesc}
            onRetry={reload}
          />
          {!loading && !error && customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table
                className="w-full"
                style={{ minWidth: 1040, borderCollapse: "collapse" }}
              >
                <thead>
                  <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                    {[
                      text.name,
                      text.contact,
                      text.type,
                      text.purchases,
                      text.debtCol,
                      text.sales,
                      text.last,
                      text.status,
                      text.actions,
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-3 pb-3 text-start"
                        style={{
                          fontSize: 12,
                          color: palette.muted,
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const typeColor = typeColors[customer.typeCode];
                    return (
                      <tr
                        key={customer.id}
                        style={{ borderBottom: `1px solid ${palette.border}` }}
                      >
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/customer-profile/${customer.id}`)
                            }
                            className="text-start hover:underline"
                            style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              color: palette.primary,
                            }}
                          >
                            {customer.fullName}
                          </button>
                          <div
                            className="mt-0.5"
                            style={{ fontSize: 11.5, color: palette.muted }}
                          >
                            {customer.city || customer.wilaya || "-"}
                          </div>
                        </td>
                        <td
                          className="px-3 py-4"
                          style={{
                            fontSize: 13,
                            direction: "ltr",
                            textAlign: "start",
                          }}
                        >
                          {customer.phone}
                        </td>
                        <td className="px-3 py-4">
                          <Badge bg={typeColor.bg} fg={typeColor.fg}>
                            {customer.type}
                          </Badge>
                        </td>
                        <td
                          className="px-3 py-4"
                          style={{ fontSize: 13.5, fontWeight: 700 }}
                        >
                          {formatMoney(customer.totalPurchases, lang)}
                        </td>
                        <td
                          className="px-3 py-4"
                          style={{
                            fontSize: 13.5,
                            fontWeight: 800,
                            color:
                              customer.totalDebt > 0 ? "#b46a66" : "#4d8a6a",
                          }}
                        >
                          {formatMoney(customer.totalDebt, lang)}
                        </td>
                        <td className="px-3 py-4" style={{ fontSize: 13.5 }}>
                          {customer.salesCount}
                        </td>
                        <td
                          className="px-3 py-4"
                          style={{ fontSize: 12.5, color: palette.muted }}
                        >
                          {formatDate(customer.lastVisitDate, lang)}
                        </td>
                        <td className="px-3 py-4">
                          <Badge
                            bg={
                              customer.statusCode === "ACTIVE"
                                ? "rgba(77,138,106,0.12)"
                                : "rgba(138,136,127,0.12)"
                            }
                            fg={
                              customer.statusCode === "ACTIVE"
                                ? "#4d8a6a"
                                : "#6f6d65"
                            }
                          >
                            {customer.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="View customer"
                              onClick={() =>
                                navigate(`/customer-profile/${customer.id}`)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                              style={{ color: palette.primary }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label="Edit customer"
                              onClick={() => {
                                setEditing(customer);
                                setModalOpen(true);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                              style={{ color: "#6b8aa0" }}
                            >
                              <Pencil size={15} />
                            </button>
                            {customer.statusCode !== "ARCHIVED" ? (
                              <button
                                type="button"
                                aria-label={
                                  lang === "ar"
                                    ? "أرشفة الزبون"
                                    : "Archiver le client"
                                }
                                onClick={() => setArchiveTarget(customer)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                                style={{ color: "#b46a66" }}
                              >
                                <Archive size={15} />
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
          ) : null}
        </div>
        <Pager
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </section>

      <CustomerFormModal
        open={modalOpen}
        customer={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setNotice(
            lang === "ar"
              ? "تم حفظ بيانات الزبون بنجاح."
              : "Client enregistré avec succès.",
          );
          reload();
        }}
      />
      <ArchiveCustomerModal
        customer={archiveTarget}
        lang={lang}
        saving={archiving}
        onClose={() => {
          if (!archiving) setArchiveTarget(null);
        }}
        onConfirm={() => {
          if (archiveTarget) void archiveCustomer(archiveTarget);
        }}
      />
    </PageBackground>
  );
}

function ArchiveCustomerModal({
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
  const hasDebt = Boolean(customer && customer.totalDebt > 0);

  return (
    <ModalShell
      open={Boolean(customer)}
      onClose={onClose}
      title={lang === "ar" ? "تأكيد أرشفة الزبون" : "Confirmer l'archivage"}
      maxWidth={590}
    >
      {customer ? (
        <div className="p-6">
          <div
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: hasDebt
                ? "rgba(201,138,134,0.13)"
                : "rgba(195,154,91,0.12)",
              border: `1px solid ${hasDebt ? "rgba(180,106,102,0.28)" : "rgba(195,154,91,0.3)"}`,
            }}
          >
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                color: hasDebt ? "#b46a66" : "#a87d3c",
                backgroundColor: hasDebt
                  ? "rgba(180,106,102,0.14)"
                  : "rgba(195,154,91,0.16)",
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: palette.text }}>
                {lang === "ar"
                  ? `هل تريد أرشفة الزبون «${customer.fullName}»؟`
                  : `Voulez-vous archiver « ${customer.fullName} » ?`}
              </div>
              <p
                className="mt-1 text-sm"
                style={{ color: palette.muted, lineHeight: 1.75 }}
              >
                {lang === "ar"
                  ? "سيختفي من قائمة الزبائن الرئيسية ولن يكون متاحاً في المبيعات الجديدة. سيبقى ملفه وكل فواتيره ومدفوعاته محفوظة في الأرشيف."
                  : "Il disparaîtra de la liste principale et ne pourra plus être sélectionné dans une nouvelle vente. Son profil, ses factures et ses paiements resteront conservés dans les archives."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ArchiveCustomerInfo
              label={lang === "ar" ? "عدد المبيعات" : "Ventes"}
              value={String(customer.salesCount)}
            />
            <ArchiveCustomerInfo
              label={lang === "ar" ? "إجمالي المشتريات" : "Total achats"}
              value={formatMoney(customer.totalPurchases, lang)}
            />
            <ArchiveCustomerInfo
              label={lang === "ar" ? "الدين الحالي" : "Dette actuelle"}
              value={formatMoney(customer.totalDebt, lang)}
              danger={hasDebt}
            />
          </div>

          {hasDebt ? (
            <p
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{
                color: "#a94f4a",
                backgroundColor: "rgba(201,138,134,0.11)",
              }}
            >
              {lang === "ar"
                ? "تنبيه: لدى هذا الزبون دين مفتوح. ستبقى قيمة الدين محفوظة وقابلة للمتابعة من ملفه المؤرشف."
                : "Attention : ce client possède une créance ouverte. Elle restera conservée et consultable depuis son profil archivé."}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>
              {lang === "ar" ? "إلغاء" : "Annuler"}
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={saving}>
              <Archive size={15} />
              {saving
                ? lang === "ar"
                  ? "جاري الأرشفة..."
                  : "Archivage..."
                : lang === "ar"
                  ? "تأكيد الأرشفة"
                  : "Confirmer l'archivage"}
            </Button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}

function ArchiveCustomerInfo({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
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
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: danger ? "#b46a66" : palette.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
