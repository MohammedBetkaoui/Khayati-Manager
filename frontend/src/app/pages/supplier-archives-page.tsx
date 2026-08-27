import { useDeferredValue, useEffect, useState } from "react";
import {
  Archive,
  CircleDollarSign,
  Eye,
  ReceiptText,
  RotateCcw,
  Search,
  Truck,
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
import type { Pagination, Supplier } from "../lib/commerce";

const emptyPagination: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

export function SupplierArchivesPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restoreTarget, setRestoreTarget] = useState<Supplier | null>(null);
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
          sortBy: "name",
          sortOrder: "ASC",
        });
        if (deferredSearch) params.set("search", deferredSearch);

        const response = await fetchJson<{
          data: Supplier[];
          pagination: Pagination;
        }>(`/inventory/suppliers?${params.toString()}`, {
          signal: controller.signal,
        });
        setSuppliers(response.data);
        setPagination(response.pagination);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load archived suppliers",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [deferredSearch, page, refreshKey]);

  const pagePurchases = suppliers.reduce(
    (total, supplier) => total + supplier.totalPurchases,
    0,
  );
  const pageDebt = suppliers.reduce(
    (total, supplier) => total + supplier.totalDebt,
    0,
  );

  async function restoreSupplier(supplier: Supplier) {
    setRestoring(true);
    setError(null);
    try {
      await fetchJson(`/inventory/suppliers/${supplier.id}/restore`, {
        method: "PATCH",
      });
      setRestoreTarget(null);
      setNotice(
        lang === "ar"
          ? "تم إرجاع المورد إلى القائمة الرئيسية وأصبح نشطاً من جديد."
          : "Le fournisseur a été restauré dans la liste principale.",
      );
      if (suppliers.length === 1 && page > 1) {
        setPage((value) => Math.max(1, value - 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to restore supplier",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <PageBackground>
      <PageHeading
        title={lang === "ar" ? "أرشيف الموردين" : "Archives des fournisseurs"}
        subtitle={
          lang === "ar"
            ? "ملفات الموردين المؤرشفين محفوظة مع المشتريات والمدفوعات والديون، ولا تظهر في القائمة الرئيسية أو المشتريات الجديدة."
            : "Les fournisseurs archivés conservent leurs achats, paiements et dettes, mais sont exclus de la liste principale et des nouveaux achats."
        }
        backTo="/suppliers"
      />

      {notice ? (
        <div className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "rgba(77,138,106,0.11)", color: "#3f765a" }}>
          {notice}
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Archive} label={lang === "ar" ? "الموردون المؤرشفون" : "Fournisseurs archivés"} value={pagination.total} />
        <StatCard icon={ReceiptText} label={lang === "ar" ? "مشتريات هذه الصفحة" : "Achats sur cette page"} value={formatMoney(pagePurchases, lang)} color="#a87d3c" tint="rgba(195,154,91,0.15)" />
        <StatCard icon={CircleDollarSign} label={lang === "ar" ? "ديون هذه الصفحة" : "Dettes sur cette page"} value={formatMoney(pageDebt, lang)} color="#b46a66" tint="rgba(201,138,134,0.13)" />
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
          ? "معلومة: يمكن متابعة وتسديد الديون القديمة من ملف المورد المؤرشف. بعد إرجاعه سيصبح متاحاً أيضاً لتسجيل مشتريات جديدة."
          : "Information : les anciennes dettes restent consultables et réglables. Après restauration, le fournisseur redevient également disponible pour les nouveaux achats."}
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
          <Search size={17} className="absolute top-1/2 -translate-y-1/2" style={{ insetInlineStart: 14, color: palette.muted }} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={lang === "ar" ? "البحث بالاسم أو الهاتف أو المدينة..." : "Rechercher un fournisseur archivé..."}
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
          empty={!loading && !error && suppliers.length === 0}
          emptyTitle={lang === "ar" ? "لا يوجد موردون مؤرشفون" : "Aucun fournisseur archivé"}
          emptyDescription={lang === "ar" ? "الموردون الذين تقوم بأرشفتهم سيظهرون هنا." : "Les fournisseurs archivés depuis la liste principale apparaîtront ici."}
          onRetry={() => setRefreshKey((value) => value + 1)}
        />

        {!loading && !error && suppliers.length > 0 ? (
          <ArchivedSuppliersTable
            suppliers={suppliers}
            lang={lang}
            onView={(supplier) => navigate(`/suppliers/${supplier.id}`)}
            onRestore={setRestoreTarget}
          />
        ) : null}

        <Pager page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
      </section>

      <RestoreSupplierModal
        supplier={restoreTarget}
        lang={lang}
        saving={restoring}
        onClose={() => {
          if (!restoring) setRestoreTarget(null);
        }}
        onConfirm={() => {
          if (restoreTarget) void restoreSupplier(restoreTarget);
        }}
      />
    </PageBackground>
  );
}

function ArchivedSuppliersTable({
  suppliers,
  lang,
  onView,
  onRestore,
}: {
  suppliers: Supplier[];
  lang: "ar" | "fr";
  onView: (supplier: Supplier) => void;
  onRestore: (supplier: Supplier) => void;
}) {
  const headers = lang === "ar"
    ? ["المورد", "الهاتف", "تاريخ الأرشفة", "المشتريات", "المدفوع", "الدين", "الحالة", "الإجراءات"]
    : ["Fournisseur", "Téléphone", "Date d'archivage", "Achats", "Payé", "Dette", "Statut", "Actions"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 980, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => <th key={header} style={headStyle}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
              <td style={cellStyle}>
                <button type="button" onClick={() => onView(supplier)} className="text-start hover:underline" style={{ fontWeight: 900, color: palette.primary }}>
                  {supplier.name}
                </button>
                <div className="mt-1 text-xs" style={{ color: palette.muted }}>{supplier.city || supplier.address || "-"}</div>
              </td>
              <td style={{ ...cellStyle, direction: "ltr" }}>{supplier.phone || "-"}</td>
              <td style={cellStyle}>{formatDate(supplier.archivedAt, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 800 }}>{formatMoney(supplier.totalPurchases, lang)}</td>
              <td style={cellStyle}>{formatMoney(supplier.totalPaid, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 900, color: supplier.totalDebt > 0 ? "#b46a66" : "#4d8a6a" }}>{formatMoney(supplier.totalDebt, lang)}</td>
              <td style={cellStyle}><Badge bg="rgba(107,106,98,.14)" fg="#6b6a62">{lang === "ar" ? "مؤرشف" : "Archivé"}</Badge></td>
              <td style={cellStyle}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onView(supplier)} aria-label={lang === "ar" ? "فتح الملف" : "Voir le profil"} className="flex size-9 items-center justify-center rounded-xl transition-opacity hover:opacity-75" style={{ color: palette.primary, backgroundColor: "rgba(18,60,74,0.09)" }}>
                    <Eye size={15} />
                  </button>
                  <button type="button" onClick={() => onRestore(supplier)} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-opacity hover:opacity-80" style={{ color: "#4d8a6a", backgroundColor: "rgba(77,138,106,0.11)", border: "1px solid rgba(77,138,106,0.22)" }}>
                    <RotateCcw size={14} /> {lang === "ar" ? "إرجاع" : "Restaurer"}
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

function RestoreSupplierModal({
  supplier,
  lang,
  saving,
  onClose,
  onConfirm,
}: {
  supplier: Supplier | null;
  lang: "ar" | "fr";
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell open={Boolean(supplier)} onClose={onClose} title={lang === "ar" ? "إرجاع المورد للقائمة الرئيسية" : "Restaurer le fournisseur"} maxWidth={590}>
      {supplier ? (
        <div className="p-6">
          <div className="flex items-start gap-3 rounded-2xl p-4" style={{ backgroundColor: "rgba(77,138,106,0.12)", border: "1px solid rgba(77,138,106,0.25)" }}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ color: "#4d8a6a", backgroundColor: "rgba(77,138,106,0.16)" }}>
              <Truck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: palette.text }}>
                {lang === "ar" ? `سيتم إرجاع «${supplier.name}» إلى قائمة الموردين.` : `Le fournisseur « ${supplier.name} » sera renvoyé vers la liste principale.`}
              </div>
              <p className="mt-1 text-sm" style={{ color: palette.muted, lineHeight: 1.75 }}>
                {lang === "ar"
                  ? "بعد التأكيد سيصبح المورد نشطاً من جديد ويمكن اختياره عند تسجيل مشتريات جديدة. سيبقى سجله المالي السابق دون تغيير."
                  : "Après confirmation, il redeviendra actif et pourra être sélectionné dans les nouveaux achats. Son historique financier restera inchangé."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RestoreSupplierInfo label={lang === "ar" ? "الهاتف" : "Téléphone"} value={supplier.phone || "-"} />
            <RestoreSupplierInfo label={lang === "ar" ? "المشتريات" : "Achats"} value={formatMoney(supplier.totalPurchases, lang)} />
            <RestoreSupplierInfo label={lang === "ar" ? "الدين الحالي" : "Dette actuelle"} value={formatMoney(supplier.totalDebt, lang)} />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button>
            <Button variant="primary" onClick={onConfirm} disabled={saving}>
              <RotateCcw size={15} />
              {saving
                ? lang === "ar" ? "جاري الإرجاع..." : "Restauration..."
                : lang === "ar" ? "تأكيد الإرجاع" : "Confirmer la restauration"}
            </Button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}

function RestoreSupplierInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
      <div style={{ fontSize: 11.5, color: palette.muted, fontWeight: 700 }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 14, fontWeight: 900, color: palette.text }}>{value}</div>
    </div>
  );
}

const headStyle: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "start",
  color: palette.muted,
  fontSize: 12.5,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  padding: "14px 10px",
  textAlign: "start",
  color: palette.text,
  fontSize: 13.5,
  verticalAlign: "middle",
};
