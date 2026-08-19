import { useDeferredValue, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Eye,
  Factory,
  History,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Shirt,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import {
  FinishedProductModal,
  ProductAdjustmentModal,
  ProductionModal,
  RawMaterialModal,
  RawMovementModal,
} from "../components/stock-workflow-modals";
import {
  PageHeading,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { Badge, Button, Select } from "../components/kit";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { FinishedProduct, RawMaterial } from "../lib/commerce";

type InventoryTab = "raw" | "finished" | "production";

type RawStats = {
  totalMaterials: number;
  lowStockMaterials: number;
  stockValue: number;
  monthlyMovements: number;
};

type ProductStats = {
  totalProducts: number;
  activeProducts: number;
  availablePieces: number;
  soldPieces: number;
  lowStockProducts: number;
  productionBatches: number;
  retailStockValue: number;
  costStockValue: number;
};

type RawMovement = {
  id: number;
  inventoryItemId: number;
  inventoryItem: { id: number; name: string };
  type: string;
  movementType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unit: string;
  reason: string | null;
  reference: string | null;
  date: string;
  performedBy: string | null;
};

type ProductionBatch = {
  id: number;
  batchNumber: string;
  productId: number;
  productName: string;
  productSku: string;
  variantId: number | null;
  variant: string | null;
  quantityProduced: number;
  materialCost: number;
  additionalCost: number;
  totalCost: number;
  unitCost: number;
  date: string;
  notes: string | null;
  materials: Array<{
    id: number;
    inventoryItemId: number | null;
    name: string;
    unit: string;
    quantityUsed: number;
    unitCost: number;
    totalCost: number;
  }>;
};

type ProductMovement = {
  id: number;
  type: string;
  typeCode: string;
  variantId: number | null;
  variant: string | null;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  date: string;
  reference: string | null;
  reason: string | null;
};

type ProductDetail = FinishedProduct & {
  productions: ProductionBatch[];
  movements: ProductMovement[];
};

const emptyRawStats: RawStats = {
  totalMaterials: 0,
  lowStockMaterials: 0,
  stockValue: 0,
  monthlyMovements: 0,
};
const emptyProductStats: ProductStats = {
  totalProducts: 0,
  activeProducts: 0,
  availablePieces: 0,
  soldPieces: 0,
  lowStockProducts: 0,
  productionBatches: 0,
  retailStockValue: 0,
  costStockValue: 0,
};

const movementReasonLabels: Record<string, { ar: string; fr: string }> = {
  "Finished product production": {
    ar: "استهلاك لإنتاج منتج جاهز",
    fr: "Production d'un produit fini",
  },
  "Production order consumption": {
    ar: "استهلاك إنتاج سابق",
    fr: "Consommation de production antérieure",
  },
  "Order deletion stock restoration": {
    ar: "استرجاع مخزون سابق",
    fr: "Restauration de stock antérieure",
  },
};

function formatMovementReason(reason: string | null, lang: "ar" | "fr") {
  if (!reason) return "-";
  return movementReasonLabels[reason]?.[lang] ?? reason;
}

export function StockPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<InventoryTab>("raw");
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [movements, setMovements] = useState<RawMovement[]>([]);
  const [productions, setProductions] = useState<ProductionBatch[]>([]);
  const [rawStats, setRawStats] = useState<RawStats>(emptyRawStats);
  const [productStats, setProductStats] =
    useState<ProductStats>(emptyProductStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [rawModal, setRawModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(
    null,
  );
  const [movementMaterial, setMovementMaterial] = useState<RawMaterial | null>(
    null,
  );
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinishedProduct | null>(
    null,
  );
  const [productionProduct, setProductionProduct] =
    useState<FinishedProduct | null>(null);
  const [adjustmentProduct, setAdjustmentProduct] =
    useState<FinishedProduct | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          rawList,
          rawSummary,
          productList,
          productSummary,
          movementList,
          productionList,
        ] = await Promise.all([
          fetchJson<{ data: RawMaterial[] }>(
            "/inventory?limit=100&sortBy=name&sortOrder=ASC",
            { signal: controller.signal },
          ),
          fetchJson<RawStats>("/inventory/stats", {
            signal: controller.signal,
          }),
          fetchJson<{ data: FinishedProduct[] }>(
            "/inventory/products?limit=100&sortBy=name&sortOrder=ASC",
            { signal: controller.signal },
          ),
          fetchJson<ProductStats>("/inventory/products/stats", {
            signal: controller.signal,
          }),
          fetchJson<{ data: RawMovement[] }>("/inventory/movements?limit=20", {
            signal: controller.signal,
          }),
          fetchJson<{ data: ProductionBatch[] }>(
            "/inventory/products/productions",
            { signal: controller.signal },
          ),
        ]);
        setMaterials(rawList.data);
        setRawStats(rawSummary);
        setProducts(productList.data);
        setProductStats(productSummary);
        setMovements(movementList.data);
        setProductions(productionList.data);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load inventory",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedProductId) {
      setProductDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    fetchJson<ProductDetail>(`/inventory/products/${selectedProductId}`, {
      signal: controller.signal,
    })
      .then(setProductDetail)
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load product details",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey, selectedProductId]);

  const reload = (message?: string) => {
    if (message) setNotice(message);
    setRefreshKey((value) => value + 1);
  };

  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        material.name,
        material.reference,
        material.color,
        material.supplier,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
    const matchesCategory = !category || material.category === category;
    const statusCode =
      material.quantity <= 0
        ? "OUT_OF_STOCK"
        : material.quantity <= material.minStockAlert
          ? "LOW_STOCK"
          : "AVAILABLE";
    return (
      matchesSearch && matchesCategory && (!status || statusCode === status)
    );
  });
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      [product.name, product.sku, product.category].some((value) =>
        value.toLocaleLowerCase().includes(normalizedSearch),
      );
    return (
      matchesSearch &&
      (!category || product.categoryCode === category) &&
      (!status || product.availability === status)
    );
  });

  async function removeMaterial(material: RawMaterial) {
    if (
      !window.confirm(
        lang === "ar"
          ? `حذف المادة ${material.name}؟ لا يمكن التراجع عن هذه العملية.`
          : `Supprimer ${material.name} ? Cette action est irréversible.`,
      )
    )
      return;
    try {
      await fetchJson(`/inventory/${material.id}`, { method: "DELETE" });
      reload(lang === "ar" ? "تم حذف المادة." : "Matière supprimée.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete material",
      );
    }
  }

  async function archiveProduct(product: FinishedProduct) {
    if (
      !window.confirm(
        lang === "ar"
          ? `أرشفة المنتج ${product.name}؟ سيختفي من شاشة البيع مع بقاء تاريخه.`
          : `Archiver ${product.name} ? Il ne sera plus proposé à la vente, mais son historique sera conservé.`,
      )
    )
      return;
    try {
      await fetchJson(`/inventory/products/${product.id}`, {
        method: "DELETE",
      });
      reload(lang === "ar" ? "تمت أرشفة المنتج." : "Produit archivé.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to archive product",
      );
    }
  }

  const text =
    lang === "ar"
      ? {
          title: "تسيير المخزون",
          subtitle:
            "إدارة المواد الأولية والمنتجات الجاهزة والإنتاج في دورة مخزون واحدة مترابطة.",
          raw: "المواد الأولية",
          finished: "المنتجات الجاهزة",
          production: "سجل الإنتاج",
          searchRaw: "البحث عن مادة، مرجع أو مورد...",
          searchProduct: "البحث عن منتج أو SKU...",
          addRaw: "إضافة مادة",
          addProduct: "إضافة منتج",
          totalRaw: "إجمالي المواد",
          lowRaw: "مواد تحت التنبيه",
          rawValue: "قيمة المواد",
          movements: "حركات هذا الشهر",
          totalProducts: "عدد الموديلات",
          available: "القطع المتوفرة",
          retailValue: "قيمة المنتجات",
          batches: "دفعات الإنتاج",
          emptyRaw: "لا توجد مواد أولية",
          emptyProducts: "لا توجد منتجات جاهزة",
          emptyProduction: "لا توجد عمليات إنتاج",
        }
      : {
          title: "Gestion du stock",
          subtitle:
            "Gérez les matières premières, les produits finis et la production dans un cycle de stock cohérent.",
          raw: "Matières premières",
          finished: "Produits finis",
          production: "Historique de production",
          searchRaw: "Rechercher matière, référence ou fournisseur...",
          searchProduct: "Rechercher produit ou SKU...",
          addRaw: "Ajouter une matière",
          addProduct: "Ajouter un produit",
          totalRaw: "Total matières",
          lowRaw: "Sous le seuil",
          rawValue: "Valeur matières",
          movements: "Mouvements du mois",
          totalProducts: "Modèles",
          available: "Pièces disponibles",
          retailValue: "Valeur produits",
          batches: "Lots de production",
          emptyRaw: "Aucune matière première",
          emptyProducts: "Aucun produit fini",
          emptyProduction: "Aucune production enregistrée",
        };

  return (
    <PageBackground>
      <PageHeading title={text.title} subtitle={text.subtitle} />
      {notice ? (
        <div
          className="mt-5 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(77,138,106,0.11)", color: "#3f765a" }}
        >
          {notice}
        </div>
      ) : null}

      <div
        className="mt-6 flex flex-wrap gap-2 rounded-2xl border p-2"
        style={{
          borderColor: palette.border,
          backgroundColor: "rgba(255,255,255,0.72)",
        }}
      >
        {(
          [
            ["raw", text.raw, Boxes],
            ["finished", text.finished, Shirt],
            ["production", text.production, Factory],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setSearch("");
              setCategory("");
              setStatus("");
            }}
            className="flex min-w-[190px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all"
            style={{
              backgroundColor: tab === id ? palette.primary : "transparent",
              color: tab === id ? "#fff" : palette.muted,
            }}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tab === "raw" ? (
          <>
            <StatCard
              icon={Boxes}
              label={text.totalRaw}
              value={rawStats.totalMaterials}
            />
            <StatCard
              icon={AlertTriangle}
              label={text.lowRaw}
              value={rawStats.lowStockMaterials}
              color="#b46a66"
              tint="rgba(201,138,134,0.13)"
            />
            <StatCard
              icon={CircleDollarSign}
              label={text.rawValue}
              value={formatMoney(rawStats.stockValue, lang)}
              color="#a87d3c"
              tint="rgba(195,154,91,0.15)"
            />
            <StatCard
              icon={History}
              label={text.movements}
              value={rawStats.monthlyMovements}
              color="#6b8aa0"
              tint="rgba(107,138,160,0.13)"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Shirt}
              label={text.totalProducts}
              value={productStats.totalProducts}
            />
            <StatCard
              icon={PackageCheck}
              label={text.available}
              value={productStats.availablePieces}
              color="#4d8a6a"
              tint="rgba(77,138,106,0.12)"
            />
            <StatCard
              icon={CircleDollarSign}
              label={text.retailValue}
              value={formatMoney(productStats.retailStockValue, lang)}
              color="#a87d3c"
              tint="rgba(195,154,91,0.15)"
            />
            <StatCard
              icon={Factory}
              label={text.batches}
              value={productStats.productionBatches}
              color="#6b8aa0"
              tint="rgba(107,138,160,0.13)"
            />
          </>
        )}
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
        {tab !== "production" ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[250px] flex-1">
              <Search
                size={17}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ insetInlineStart: 14, color: palette.muted }}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  tab === "raw" ? text.searchRaw : text.searchProduct
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
            <div className="min-w-[180px]">
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">
                  {lang === "ar" ? "كل التصنيفات" : "Toutes les catégories"}
                </option>
                {tab === "raw"
                  ? [
                      ["أقمشة", "أقمشة", "Tissus"],
                      ["خيوط", "خيوط", "Fils"],
                      ["أزرار", "أزرار", "Boutons"],
                      ["سحابات", "سحابات", "Fermetures"],
                      ["إكسسوارات", "إكسسوارات", "Accessoires"],
                      ["تغليف", "تغليف", "Emballage"],
                      ["أدوات", "أدوات", "Outils"],
                    ].map(([value, ar, fr]) => (
                      <option key={value} value={value}>
                        {lang === "ar" ? ar : fr}
                      </option>
                    ))
                  : [
                      ["DRESS", "فستان", "Robe"],
                      ["PANTS", "سروال", "Pantalon"],
                      ["SHIRT", "قميص", "Chemise"],
                      ["SET", "طقم", "Ensemble"],
                      ["TRADITIONAL", "لباس تقليدي", "Traditionnel"],
                      ["UNIFORM", "زي موحد", "Uniforme"],
                      ["OTHER", "أخرى", "Autre"],
                    ].map(([value, ar, fr]) => (
                      <option key={value} value={value}>
                        {lang === "ar" ? ar : fr}
                      </option>
                    ))}
              </Select>
            </div>
            <div className="min-w-[170px]">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">
                  {lang === "ar" ? "كل الحالات" : "Tous les statuts"}
                </option>
                <option value="AVAILABLE">
                  {lang === "ar" ? "متوفر" : "Disponible"}
                </option>
                <option value="LOW_STOCK">
                  {lang === "ar" ? "قارب على النفاد" : "Stock faible"}
                </option>
                <option value="OUT_OF_STOCK">
                  {lang === "ar" ? "نفد" : "Épuisé"}
                </option>
              </Select>
            </div>
            <Button
              variant="primary"
              onClick={() =>
                tab === "raw"
                  ? (setEditingMaterial(null), setRawModal(true))
                  : (setEditingProduct(null), setProductModal(true))
              }
            >
              <Plus size={17} /> {tab === "raw" ? text.addRaw : text.addProduct}
            </Button>
          </div>
        ) : null}

        <div className={tab === "production" ? "" : "mt-6"}>
          <StatePanel
            loading={loading}
            error={error}
            empty={
              !loading &&
              !error &&
              (tab === "raw"
                ? filteredMaterials.length === 0
                : tab === "finished"
                  ? filteredProducts.length === 0
                  : productions.length === 0)
            }
            emptyTitle={
              tab === "raw"
                ? text.emptyRaw
                : tab === "finished"
                  ? text.emptyProducts
                  : text.emptyProduction
            }
            emptyDescription={
              lang === "ar"
                ? "أضف أول عنصر أو غيّر معايير البحث."
                : "Ajoutez un premier élément ou modifiez les filtres."
            }
            onRetry={() => reload()}
          />
          {!loading && !error && tab === "raw" && filteredMaterials.length ? (
            <RawMaterialsTable
              materials={filteredMaterials}
              lang={lang}
              onMove={setMovementMaterial}
              onEdit={(material) => {
                setEditingMaterial(material);
                setRawModal(true);
              }}
              onDelete={(material) => void removeMaterial(material)}
            />
          ) : null}
          {!loading &&
          !error &&
          tab === "finished" &&
          filteredProducts.length ? (
            <FinishedProductsTable
              products={filteredProducts}
              lang={lang}
              selectedId={selectedProductId}
              onView={setSelectedProductId}
              onProduce={setProductionProduct}
              onAdjust={setAdjustmentProduct}
              onEdit={(product) => {
                setEditingProduct(product);
                setProductModal(true);
              }}
              onArchive={(product) => void archiveProduct(product)}
            />
          ) : null}
          {!loading && !error && tab === "production" && productions.length ? (
            <ProductionsTable rows={productions} lang={lang} />
          ) : null}
        </div>
      </section>

      {tab === "raw" && movements.length ? (
        <RecentRawMovements rows={movements} lang={lang} />
      ) : null}
      {tab === "finished" && selectedProductId ? (
        <ProductDetails
          detail={productDetail}
          loading={detailLoading}
          lang={lang}
          onClose={() => setSelectedProductId(null)}
        />
      ) : null}

      <RawMaterialModal
        open={rawModal}
        material={editingMaterial}
        onClose={() => setRawModal(false)}
        onSaved={() =>
          reload(
            lang === "ar" ? "تم حفظ المادة الأولية." : "Matière enregistrée.",
          )
        }
      />
      <RawMovementModal
        open={Boolean(movementMaterial)}
        material={movementMaterial}
        onClose={() => setMovementMaterial(null)}
        onSaved={() =>
          reload(
            lang === "ar" ? "تم تسجيل حركة المخزون." : "Mouvement enregistré.",
          )
        }
      />
      <FinishedProductModal
        open={productModal}
        product={editingProduct}
        onClose={() => setProductModal(false)}
        onSaved={() =>
          reload(lang === "ar" ? "تم حفظ المنتج." : "Produit enregistré.")
        }
      />
      <ProductionModal
        open={Boolean(productionProduct)}
        product={productionProduct}
        materials={materials}
        onClose={() => setProductionProduct(null)}
        onSaved={() =>
          reload(
            lang === "ar"
              ? "تم تسجيل الإنتاج وتحديث المخزون."
              : "Production enregistrée et stocks mis à jour.",
          )
        }
      />
      <ProductAdjustmentModal
        open={Boolean(adjustmentProduct)}
        product={adjustmentProduct}
        onClose={() => setAdjustmentProduct(null)}
        onSaved={() =>
          reload(
            lang === "ar" ? "تم تعديل مخزون المنتج." : "Stock produit ajusté.",
          )
        }
      />
    </PageBackground>
  );
}

const headStyle: React.CSSProperties = {
  padding: "0 12px 12px",
  fontSize: 12,
  fontWeight: 700,
  color: palette.muted,
  textAlign: "start",
  whiteSpace: "nowrap",
};
const cellStyle: React.CSSProperties = {
  padding: "14px 12px",
  fontSize: 13,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

function stockColor(available: number, minimum: number) {
  return available <= 0
    ? { bg: "rgba(201,138,134,0.13)", fg: "#b46a66" }
    : available <= minimum
      ? { bg: "rgba(195,154,91,0.15)", fg: "#946b2f" }
      : { bg: "rgba(77,138,106,0.12)", fg: "#4d8a6a" };
}

function RawMaterialsTable({
  materials,
  lang,
  onMove,
  onEdit,
  onDelete,
}: {
  materials: RawMaterial[];
  lang: "ar" | "fr";
  onMove: (item: RawMaterial) => void;
  onEdit: (item: RawMaterial) => void;
  onDelete: (item: RawMaterial) => void;
}) {
  const labels =
    lang === "ar"
      ? [
          "المادة",
          "التصنيف",
          "اللون",
          "الكمية",
          "الوحدة",
          "سعر الشراء",
          "قيمة المخزون",
          "المورد",
          "الحالة",
          "الإجراءات",
        ]
      : [
          "Matière",
          "Catégorie",
          "Couleur",
          "Quantité",
          "Unité",
          "Prix d'achat",
          "Valeur",
          "Fournisseur",
          "Statut",
          "Actions",
        ];
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 1080, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {labels.map((label) => (
              <th key={label} style={headStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => {
            const color = stockColor(material.quantity, material.minStockAlert);
            return (
              <tr
                key={material.id}
                style={{ borderBottom: `1px solid ${palette.border}` }}
              >
                <td style={cellStyle}>
                  <div style={{ fontWeight: 800, color: palette.text }}>
                    {material.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: palette.muted }}>
                    {material.reference || material.location || "-"}
                  </div>
                </td>
                <td style={cellStyle}>{material.category}</td>
                <td style={cellStyle}>{material.color || "-"}</td>
                <td style={{ ...cellStyle, fontSize: 15, fontWeight: 900 }}>
                  {material.quantity.toLocaleString("fr-DZ")}
                </td>
                <td style={cellStyle}>{material.unit}</td>
                <td style={cellStyle}>
                  {formatMoney(material.unitPrice, lang)}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    fontWeight: 800,
                    color: palette.primary,
                  }}
                >
                  {formatMoney(material.totalValue, lang)}
                </td>
                <td style={cellStyle}>{material.supplier || "-"}</td>
                <td style={cellStyle}>
                  <Badge bg={color.bg} fg={color.fg}>
                    {material.status}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Stock movement"
                      onClick={() => onMove(material)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                      style={{ color: palette.primary }}
                    >
                      <RefreshCcw size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => onEdit(material)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                      style={{ color: "#6b8aa0" }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => onDelete(material)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                      style={{ color: "#b46a66" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FinishedProductsTable({
  products,
  lang,
  selectedId,
  onView,
  onProduce,
  onAdjust,
  onEdit,
  onArchive,
}: {
  products: FinishedProduct[];
  lang: "ar" | "fr";
  selectedId: number | null;
  onView: (id: number) => void;
  onProduce: (product: FinishedProduct) => void;
  onAdjust: (product: FinishedProduct) => void;
  onEdit: (product: FinishedProduct) => void;
  onArchive: (product: FinishedProduct) => void;
}) {
  const labels =
    lang === "ar"
      ? [
          "المنتج",
          "التصنيف",
          "التنويعات",
          "الكمية المنتجة",
          "المتوفر",
          "المباع",
          "سعر البيع",
          "قيمة المتوفر",
          "الحالة",
          "الإجراءات",
        ]
      : [
          "Produit",
          "Catégorie",
          "Variantes",
          "Produite",
          "Disponible",
          "Vendu",
          "Prix",
          "Valeur disponible",
          "Statut",
          "Actions",
        ];
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 1120, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {labels.map((label, index) => (
              <th key={`${label}-${index}`} style={headStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const color = stockColor(
              product.quantityAvailable,
              product.minStockAlert,
            );
            return (
              <tr
                key={product.id}
                style={{
                  borderBottom: `1px solid ${palette.border}`,
                  backgroundColor:
                    selectedId === product.id
                      ? "rgba(18,60,74,0.035)"
                      : undefined,
                }}
              >
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => onView(product.id)}
                    className="text-start"
                  >
                    <div style={{ fontWeight: 900, color: palette.primary }}>
                      {product.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: palette.muted,
                        direction: "ltr",
                      }}
                    >
                      {product.sku}
                    </div>
                  </button>
                </td>
                <td style={cellStyle}>{product.category}</td>
                <td style={cellStyle}>{product.variants.length}</td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>
                  {product.quantityProduced}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    fontSize: 15,
                    fontWeight: 900,
                    color: "#4d8a6a",
                  }}
                >
                  {product.quantityAvailable}
                </td>
                <td style={{ ...cellStyle, color: palette.muted }}>
                  {product.quantitySold}
                </td>
                <td style={cellStyle}>
                  {formatMoney(product.salePrice, lang)}
                </td>
                <td style={{ ...cellStyle, fontWeight: 800 }}>
                  {formatMoney(
                    product.quantityAvailable * product.salePrice,
                    lang,
                  )}
                </td>
                <td style={cellStyle}>
                  <Badge bg={color.bg} fg={color.fg}>
                    {product.quantityAvailable <= 0
                      ? lang === "ar"
                        ? "نفد"
                        : "Épuisé"
                      : product.quantityAvailable <= product.minStockAlert
                        ? lang === "ar"
                          ? "تنبيه"
                          : "Faible"
                        : lang === "ar"
                          ? "متوفر"
                          : "Disponible"}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Details"
                      onClick={() => onView(product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                      style={{ color: palette.primary }}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="New production"
                      onClick={() => onProduce(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50"
                      style={{ color: "#4d8a6a" }}
                    >
                      <Factory size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Adjust stock"
                      onClick={() => onAdjust(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                      style={{ color: "#a87d3c" }}
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Edit"
                      onClick={() => onEdit(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
                      style={{ color: "#6b8aa0" }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Archive"
                      onClick={() => onArchive(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50"
                      style={{ color: "#b46a66" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductionsTable({
  rows,
  lang,
}: {
  rows: ProductionBatch[];
  lang: "ar" | "fr";
}) {
  const labels =
    lang === "ar"
      ? [
          "الدفعة",
          "المنتج",
          "التنويعة",
          "التاريخ",
          "الكمية",
          "المواد",
          "تكلفة المواد",
          "تكلفة الدفعة",
          "تكلفة القطعة",
          "ملاحظات",
        ]
      : [
          "Lot",
          "Produit",
          "Variante",
          "Date",
          "Quantité",
          "Matières",
          "Coût matières",
          "Coût total",
          "Coût unitaire",
          "Notes",
        ];
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ minWidth: 1080, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {labels.map((label) => (
              <th key={label} style={headStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              style={{ borderBottom: `1px solid ${palette.border}` }}
            >
              <td
                style={{
                  ...cellStyle,
                  fontWeight: 800,
                  color: palette.primary,
                  direction: "ltr",
                }}
              >
                {row.batchNumber}
              </td>
              <td style={cellStyle}>
                <div style={{ fontWeight: 800 }}>{row.productName}</div>
                <div style={{ fontSize: 11.5, color: palette.muted }}>
                  {row.productSku}
                </div>
              </td>
              <td style={cellStyle}>{row.variant || "-"}</td>
              <td style={cellStyle}>{formatDate(row.date, lang)}</td>
              <td style={{ ...cellStyle, fontSize: 15, fontWeight: 900 }}>
                {row.quantityProduced}
              </td>
              <td style={{ ...cellStyle, maxWidth: 220, whiteSpace: "normal" }}>
                {row.materials.length
                  ? row.materials
                      .map(
                        (item) =>
                          `${item.name}: ${item.quantityUsed} ${item.unit}`,
                      )
                      .join("، ")
                  : "-"}
              </td>
              <td style={cellStyle}>{formatMoney(row.materialCost, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 800 }}>
                {formatMoney(row.totalCost, lang)}
              </td>
              <td style={cellStyle}>{formatMoney(row.unitCost, lang)}</td>
              <td
                style={{
                  ...cellStyle,
                  color: palette.muted,
                  maxWidth: 190,
                  whiteSpace: "normal",
                }}
              >
                {row.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentRawMovements({
  rows,
  lang,
}: {
  rows: RawMovement[];
  lang: "ar" | "fr";
}) {
  return (
    <section
      className="mt-5"
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 22,
        padding: 20,
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <History size={18} style={{ color: palette.primary }} />
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>
          {lang === "ar"
            ? "آخر حركات المواد الأولية"
            : "Derniers mouvements des matières"}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full"
          style={{ minWidth: 760, borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              {(lang === "ar"
                ? [
                    "المادة",
                    "النوع",
                    "الكمية",
                    "قبل",
                    "بعد",
                    "التاريخ",
                    "السبب",
                    "المرجع",
                  ]
                : [
                    "Matière",
                    "Type",
                    "Quantité",
                    "Avant",
                    "Après",
                    "Date",
                    "Motif",
                    "Référence",
                  ]
              ).map((label) => (
                <th key={label} style={headStyle}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={{ borderBottom: `1px solid ${palette.border}` }}
              >
                <td style={{ ...cellStyle, fontWeight: 800 }}>
                  {row.inventoryItem.name}
                </td>
                <td style={cellStyle}>{row.type}</td>
                <td style={{ ...cellStyle, fontWeight: 800 }}>
                  {row.quantity} {row.unit}
                </td>
                <td style={cellStyle}>{row.previousQuantity}</td>
                <td style={cellStyle}>{row.newQuantity}</td>
                <td style={cellStyle}>{formatDate(row.date, lang)}</td>
                <td style={{ ...cellStyle, color: palette.muted }}>
                  {formatMovementReason(row.reason, lang)}
                </td>
                <td style={cellStyle}>{row.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductDetails({
  detail,
  loading,
  lang,
  onClose,
}: {
  detail: ProductDetail | null;
  loading: boolean;
  lang: "ar" | "fr";
  onClose: () => void;
}) {
  return (
    <section
      className="mt-5"
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 22,
        padding: 20,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>
            {detail?.name ||
              (lang === "ar" ? "تفاصيل المنتج" : "Détails du produit")}
          </h2>
          {detail ? (
            <p className="text-xs" style={{ color: palette.muted }}>
              {detail.sku} · {detail.category}
            </p>
          ) : null}
        </div>
        <Button onClick={onClose}>{lang === "ar" ? "إغلاق" : "Fermer"}</Button>
      </div>
      {loading ? (
        <div className="mt-5 text-sm" style={{ color: palette.muted }}>
          {lang === "ar" ? "جاري التحميل..." : "Chargement..."}
        </div>
      ) : null}
      {detail ? (
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>
              {lang === "ar" ? "المقاسات والألوان" : "Variantes"}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detail.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: palette.border }}
                >
                  <div className="flex items-center justify-between">
                    <div style={{ fontWeight: 900 }}>{variant.label}</div>
                    <Badge
                      bg={
                        variant.quantityAvailable
                          ? "rgba(77,138,106,0.12)"
                          : "rgba(201,138,134,0.13)"
                      }
                      fg={variant.quantityAvailable ? "#4d8a6a" : "#b46a66"}
                    >
                      {variant.quantityAvailable}{" "}
                      {lang === "ar" ? "متوفر" : "disponibles"}
                    </Badge>
                  </div>
                  <div
                    className="mt-2 text-xs"
                    style={{ color: palette.muted }}
                  >
                    {variant.sku}
                  </div>
                  <div className="mt-3 flex justify-between text-xs">
                    <span>
                      {lang === "ar" ? "منتج" : "Produit"}:{" "}
                      {variant.quantityProduced}
                    </span>
                    <span>
                      {lang === "ar" ? "مباع" : "Vendu"}: {variant.quantitySold}
                    </span>
                    <span>{formatMoney(variant.salePrice, lang)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>
              {lang === "ar" ? "آخر حركات المنتج" : "Derniers mouvements"}
            </h3>
            <div className="mt-3 flex max-h-[320px] flex-col gap-2 overflow-auto">
              {detail.movements.length ? (
                detail.movements.slice(0, 12).map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-4 rounded-xl p-3"
                    style={{ backgroundColor: palette.bg }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>
                        {movement.type} · {movement.variant || "-"}
                      </div>
                      <div style={{ fontSize: 11.5, color: palette.muted }}>
                        {formatDate(movement.date, lang)} ·{" "}
                        {movement.reference ||
                          formatMovementReason(movement.reason, lang)}
                      </div>
                    </div>
                    <div className="text-end">
                      <div style={{ fontSize: 14, fontWeight: 900 }}>
                        {movement.quantity}
                      </div>
                      <div style={{ fontSize: 11, color: palette.muted }}>
                        {movement.previousQuantity} → {movement.newQuantity}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="rounded-xl p-4 text-sm"
                  style={{ backgroundColor: palette.bg, color: palette.muted }}
                >
                  {lang === "ar" ? "لا توجد حركات" : "Aucun mouvement"}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
