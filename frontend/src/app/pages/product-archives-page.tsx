import { useDeferredValue, useEffect, useState } from "react";
import {
  Archive,
  PackageCheck,
  PackageX,
  ReceiptText,
  RotateCcw,
  Search,
} from "lucide-react";
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
import type { FinishedProduct } from "../lib/commerce";

type ProductArchiveResponse = {
  data: FinishedProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const emptyPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

export function ProductArchivesPage() {
  const { lang } = useLanguage();
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [restoreTarget, setRestoreTarget] = useState<FinishedProduct | null>(
    null,
  );
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

        const response = await fetchJson<ProductArchiveResponse>(
          `/inventory/products?${params.toString()}`,
          { signal: controller.signal },
        );
        setProducts(response.data);
        setPagination(response.pagination);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load archived products",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [deferredSearch, page, refreshKey]);

  const remainingPieces = products.reduce(
    (total, product) => total + product.quantityAvailable,
    0,
  );
  const soldPieces = products.reduce(
    (total, product) => total + product.quantitySold,
    0,
  );

  async function restoreProduct(product: FinishedProduct) {
    setRestoring(true);
    setError(null);
    try {
      await fetchJson(`/inventory/products/${product.id}/restore`, {
        method: "PATCH",
      });
      setRestoreTarget(null);
      setNotice(
        lang === "ar"
          ? "\u062a\u0645 \u0625\u0631\u062c\u0627\u0639 \u0627\u0644\u0645\u0646\u062a\u062c \u0625\u0644\u0649 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629."
          : "Produit renvoy\u00e9 vers la liste principale.",
      );
      if (products.length === 1 && page > 1) {
        setPage((value) => Math.max(1, value - 1));
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to restore product",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <PageBackground>
      <PageHeading
        title={lang === "ar" ? "أرشيف المنتجات" : "Archives des produits"}
        subtitle={
          lang === "ar"
            ? "المنتجات المؤرشفة محفوظة مع كمياتها وسجل مبيعاتها، لكنها غير متاحة في المخزون الرئيسي أو المبيعات الجديدة."
            : "Les produits archivés conservent leurs quantités et leur historique, mais sont exclus du stock principal et des nouvelles ventes."
        }
        backTo="/stock"
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
          label={lang === "ar" ? "المنتجات المؤرشفة" : "Produits archivés"}
          value={pagination.total}
        />
        <StatCard
          icon={PackageX}
          label={
            lang === "ar"
              ? "قطع مسجلة في هذه الصفحة"
              : "Pièces enregistrées sur cette page"
          }
          value={remainingPieces}
          color="#b46a66"
          tint="rgba(201,138,134,0.13)"
        />
        <StatCard
          icon={ReceiptText}
          label={
            lang === "ar"
              ? "قطع مباعة في هذه الصفحة"
              : "Pièces vendues sur cette page"
          }
          value={soldPieces}
          color="#a87d3c"
          tint="rgba(195,154,91,0.15)"
        />
      </section>

      <div
        className="mt-5 rounded-2xl border px-4 py-3 text-sm"
        style={{
          borderColor: "rgba(195,154,91,0.28)",
          backgroundColor: "rgba(195,154,91,0.1)",
          color: "#80602f",
          lineHeight: 1.7,
        }}
      >
        {lang === "ar"
          ? "معلومة: الكمية الظاهرة محفوظة للتاريخ فقط. لا يمكن بيع أو إضافة إنتاج لمنتج مؤرشف."
          : "Information : la quantité affichée est conservée pour l'historique. Un produit archivé ne peut être ni vendu ni alimenté par une nouvelle production."}
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
                ? "البحث باسم المنتج أو الملاحظة..."
                : "Rechercher un produit archivé..."
            }
            className="h-10 w-full rounded-xl border outline-none"
            style={{
              borderColor: palette.border,
              paddingInlineStart: 42,
              paddingInlineEnd: 14,
              fontSize: 13.5,
            }}
          />
        </div>

        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && !error && products.length === 0}
          emptyTitle={
            lang === "ar"
              ? "لا توجد منتجات مؤرشفة"
              : "Aucun produit archivé"
          }
          emptyDescription={
            lang === "ar"
              ? "المنتجات التي تقوم بأرشفتها ستظهر هنا."
              : "Les produits archivés depuis la gestion du stock apparaîtront ici."
          }
          onRetry={() => setRefreshKey((value) => value + 1)}
        />

        {!loading && !error && products.length > 0 ? (
          <ArchivedProductsTable
            products={products}
            lang={lang}
            onRestore={setRestoreTarget}
          />
        ) : null}

        <Pager
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={setPage}
        />
      </section>

      <RestoreProductModal
        product={restoreTarget}
        lang={lang}
        saving={restoring}
        onClose={() => {
          if (!restoring) setRestoreTarget(null);
        }}
        onConfirm={() => {
          if (restoreTarget) void restoreProduct(restoreTarget);
        }}
      />
    </PageBackground>
  );
}

function ArchivedProductsTable({
  products,
  lang,
  onRestore,
}: {
  products: FinishedProduct[];
  lang: "ar" | "fr";
  onRestore: (product: FinishedProduct) => void;
}) {
  const headers =
    lang === "ar"
      ? [
          "الموديل",
          "تاريخ الأرشفة",
          "الكمية المسجلة",
          "المباع",
          "سعر البيع",
          "الحالة",
          "الإجراءات",
        ]
      : [
          "Modèle",
          "Date d'archivage",
          "Quantité enregistrée",
          "Vendu",
          "Prix",
          "État",
          "Actions",
        ];

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 900, borderCollapse: "collapse" }}
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
          {products.map((product) => (
            <tr
              key={product.id}
              style={{ borderBottom: `1px solid ${palette.border}` }}
            >
              <td style={cellStyle}>
                <div style={{ fontWeight: 900, color: palette.primary }}>
                  {product.name}
                </div>
                {product.notes ? (
                  <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                    {product.notes}
                  </div>
                ) : null}
              </td>
              <td style={cellStyle}>
                {formatDate(product.archivedAt ?? product.updatedAt, lang)}
              </td>
              <td style={{ ...cellStyle, fontWeight: 900 }}>
                {product.quantityAvailable}
              </td>
              <td style={cellStyle}>{product.quantitySold}</td>
              <td style={cellStyle}>{formatMoney(product.salePrice, lang)}</td>
              <td style={cellStyle}>
                <Badge bg="rgba(107,106,98,.14)" fg="#6b6a62">
                  {lang === "ar" ? "مؤرشف" : "Archivé"}
                </Badge>
              </td>
              <td style={cellStyle}>
                <button
                  type="button"
                  onClick={() => onRestore(product)}
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RestoreProductModal({
  product,
  lang,
  saving,
  onClose,
  onConfirm,
}: {
  product: FinishedProduct | null;
  lang: "ar" | "fr";
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      open={Boolean(product)}
      onClose={onClose}
      title={
        lang === "ar"
          ? "إرجاع المنتج للقائمة الرئيسية"
          : "Restaurer le produit"
      }
      maxWidth={560}
    >
      {product ? (
        <div className="p-6">
          <div
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(77,138,106,0.12)",
              border: "1px solid rgba(77,138,106,0.25)",
              color: "#3f765a",
            }}
          >
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(77,138,106,0.16)" }}
            >
              <PackageCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, color: palette.text }}>
                {lang === "ar"
                  ? `سيتم إرجاع "${product.name}" إلى قائمة المنتجات.`
                  : `Le produit "${product.name}" sera renvoyé vers la liste principale.`}
              </div>
              <p className="mt-1 text-sm" style={{ lineHeight: 1.7 }}>
                {lang === "ar"
                  ? "بعد التأكيد، سيصبح المنتج نشطاً من جديد ويمكن بيعه حسب الكمية المتاحة."
                  : "Après confirmation, il redeviendra actif et pourra être vendu selon sa quantité disponible."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RestoreInfo
              label={lang === "ar" ? "المتوفر" : "Disponible"}
              value={String(product.quantityAvailable)}
            />
            <RestoreInfo
              label={lang === "ar" ? "المباع" : "Vendu"}
              value={String(product.quantitySold)}
            />
            <RestoreInfo
              label={lang === "ar" ? "سعر البيع" : "Prix"}
              value={formatMoney(product.salePrice, lang)}
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

function RestoreInfo({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{
        backgroundColor: "#fbfaf7",
        border: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ fontSize: 11.5, color: palette.muted, fontWeight: 700 }}>
        {label}
      </div>
      <div
        className="mt-1"
        style={{ fontSize: 15, fontWeight: 900, color: palette.text }}
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
