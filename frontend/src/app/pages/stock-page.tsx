import { useDeferredValue, useEffect, useState } from "react";
import {
  Archive,
  Boxes,
  CircleDollarSign,
  Factory,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Shirt,
  Truck,
} from "lucide-react";
import {
  FinishedProductModal,
  ProductionModal,
  RawMaterialModal,
} from "../components/stock-workflow-modals";
import {
  PageHeading,
  StatePanel,
  StatCard,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { Badge, Button } from "../components/kit";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type {
  FinishedProduct,
  MaterialPurchase,
  Supplier,
} from "../lib/commerce";

type StockTab = "finished" | "raw";

type RawStats = {
  totalMaterials: number;
  monthlyPurchases: number;
  monthlyPurchaseAmount: number;
  supplierDebt: number;
  activeSuppliers: number;
};

type ProductStats = {
  totalProducts: number;
  availablePieces: number;
  soldPieces: number;
  productionBatches: number;
  retailStockValue: number;
};

type ProductionEntry = {
  id: number;
  batchNumber: string;
  productId: number;
  productName: string;
  quantityProduced: number;
  date: string;
  notes: string | null;
};

const emptyRawStats: RawStats = {
  totalMaterials: 0,
  monthlyPurchases: 0,
  monthlyPurchaseAmount: 0,
  supplierDebt: 0,
  activeSuppliers: 0,
};

const emptyProductStats: ProductStats = {
  totalProducts: 0,
  availablePieces: 0,
  soldPieces: 0,
  productionBatches: 0,
  retailStockValue: 0,
};

export function StockPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<StockTab>("finished");
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productions, setProductions] = useState<ProductionEntry[]>([]);
  const [rawStats, setRawStats] = useState<RawStats>(emptyRawStats);
  const [productStats, setProductStats] =
    useState<ProductStats>(emptyProductStats);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinishedProduct | null>(
    null,
  );
  const [productionProduct, setProductionProduct] =
    useState<FinishedProduct | null>(null);
  const [purchaseModal, setPurchaseModal] = useState(false);

  const text =
    lang === "ar"
      ? {
          title: "تسيير المخزون",
          subtitle:
            "منتجات جاهزة للبيع بكميات دقيقة، ومشتريات مواد أولية مرتبطة بالموردين والديون.",
          finished: "المنتجات الجاهزة",
          raw: "المواد الأولية",
          addProduct: "إضافة منتج جاهز",
          addPurchase: "تسجيل شراء مادة",
          searchFinished: "ابحث عن موديل أو ملاحظة...",
          searchRaw: "ابحث عن مادة أو لون أو مورد...",
          models: "عدد الموديلات",
          available: "القطع المتوفرة",
          sold: "القطع المباعة",
          productions: "إنتاجات مسجلة",
          purchaseAmount: "مشتريات هذا الشهر",
          purchaseCount: "عدد المشتريات",
          supplierDebt: "ديون الموردين",
          activeSuppliers: "موردون نشطون",
          emptyProducts: "لا توجد منتجات جاهزة",
          emptyPurchases: "لا توجد مشتريات مواد أولية",
        }
      : {
          title: "Gestion du stock",
          subtitle:
            "Produits finis suivis en quantités réelles, matières premières suivies comme achats fournisseurs.",
          finished: "Produits finis",
          raw: "Matières premières",
          addProduct: "Ajouter un produit fini",
          addPurchase: "Enregistrer un achat",
          searchFinished: "Rechercher un modèle ou une note...",
          searchRaw: "Rechercher matière, couleur ou fournisseur...",
          models: "Modèles",
          available: "Pièces disponibles",
          sold: "Pièces vendues",
          productions: "Productions",
          purchaseAmount: "Achats du mois",
          purchaseCount: "Nombre d'achats",
          supplierDebt: "Dette fournisseurs",
          activeSuppliers: "Fournisseurs actifs",
          emptyProducts: "Aucun produit fini",
          emptyPurchases: "Aucun achat de matière première",
        };

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          productList,
          productSummary,
          purchaseList,
          rawSummary,
          supplierList,
          productionList,
        ] = await Promise.all([
          fetchJson<{ data: FinishedProduct[] }>(
            "/inventory/products?limit=200&sortBy=name&sortOrder=ASC",
            { signal: controller.signal },
          ),
          fetchJson<ProductStats>("/inventory/products/stats", {
            signal: controller.signal,
          }),
          fetchJson<{ data: MaterialPurchase[] }>(
            "/inventory/material-purchases?limit=200",
            { signal: controller.signal },
          ),
          fetchJson<RawStats>("/inventory/stats", {
            signal: controller.signal,
          }),
          fetchJson<{ data: Supplier[] }>("/inventory/suppliers?limit=200", {
            signal: controller.signal,
          }),
          fetchJson<{ data: ProductionEntry[] }>(
            "/inventory/products/productions",
            { signal: controller.signal },
          ),
        ]);
        setProducts(productList.data);
        setProductStats({ ...emptyProductStats, ...productSummary });
        setPurchases(purchaseList.data);
        setRawStats({ ...emptyRawStats, ...rawSummary });
        setSuppliers(supplierList.data);
        setProductions(productionList.data);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load stock data",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const reload = (message?: string) => {
    if (message) setNotice(message);
    setRefreshKey((value) => value + 1);
  };

  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((product) =>
    [product.name, product.notes, product.description].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedSearch),
    ),
  );
  const filteredPurchases = purchases.filter((purchase) =>
    [
      purchase.materialName,
      purchase.color,
      purchase.supplier,
      purchase.notes,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch)),
  );

  async function archiveProduct(product: FinishedProduct) {
    const ok = window.confirm(
      lang === "ar"
        ? `أرشفة ${product.name}؟ سيبقى التاريخ محفوظاً.`
        : `Archiver ${product.name} ? Son historique sera conservé.`,
    );
    if (!ok) return;
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

  return (
    <PageBackground>
      <PageHeading
        title={text.title}
        subtitle={text.subtitle}
        actions={
          tab === "finished" ? (
            <Button variant="primary" onClick={() => setProductModal(true)}>
              <Plus size={16} /> {text.addProduct}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setPurchaseModal(true)}>
              <Plus size={16} /> {text.addPurchase}
            </Button>
          )
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

      <div
        className="mt-6 flex flex-wrap gap-2 rounded-2xl border p-2"
        style={{
          borderColor: palette.border,
          backgroundColor: "rgba(255,255,255,0.72)",
        }}
      >
        {[
          ["finished", text.finished, Shirt],
          ["raw", text.raw, Boxes],
        ].map(([id, label, Icon]) => (
          <button
            key={String(id)}
            type="button"
            onClick={() => {
              setTab(id as StockTab);
              setSearch("");
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
        {tab === "finished" ? (
          <>
            <StatCard icon={Shirt} label={text.models} value={productStats.totalProducts} />
            <StatCard
              icon={PackageCheck}
              label={text.available}
              value={productStats.availablePieces}
              color="#4d8a6a"
              tint="rgba(77,138,106,0.12)"
            />
            <StatCard icon={ReceiptText} label={text.sold} value={productStats.soldPieces} />
            <StatCard
              icon={Factory}
              label={text.productions}
              value={productStats.productionBatches}
              color="#a87d3c"
              tint="rgba(195,154,91,0.15)"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={CircleDollarSign}
              label={text.purchaseAmount}
              value={formatMoney(rawStats.monthlyPurchaseAmount, lang)}
              color="#a87d3c"
              tint="rgba(195,154,91,0.15)"
            />
            <StatCard icon={Boxes} label={text.purchaseCount} value={rawStats.monthlyPurchases} />
            <StatCard
              icon={Truck}
              label={text.activeSuppliers}
              value={rawStats.activeSuppliers}
              color="#6b8aa0"
              tint="rgba(107,138,160,0.13)"
            />
            <StatCard
              icon={CircleDollarSign}
              label={text.supplierDebt}
              value={formatMoney(rawStats.supplierDebt, lang)}
              color="#b46a66"
              tint="rgba(201,138,134,0.13)"
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
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search
              size={17}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ insetInlineStart: 14, color: palette.muted }}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === "finished" ? text.searchFinished : text.searchRaw}
              className="h-10 w-full rounded-xl border outline-none"
              style={{
                borderColor: palette.border,
                paddingInlineStart: 42,
                paddingInlineEnd: 14,
                fontSize: 13.5,
              }}
            />
          </div>
        </div>

        <StatePanel
          loading={loading}
          error={error}
          empty={
            !loading &&
            !error &&
            (tab === "finished"
              ? filteredProducts.length === 0
              : filteredPurchases.length === 0)
          }
          emptyTitle={tab === "finished" ? text.emptyProducts : text.emptyPurchases}
          onRetry={() => reload()}
        />

        {!loading && !error && tab === "finished" && filteredProducts.length ? (
          <FinishedProductsTable
            products={filteredProducts}
            lang={lang}
            onProduce={setProductionProduct}
            onEdit={(product) => {
              setEditingProduct(product);
              setProductModal(true);
            }}
            onArchive={archiveProduct}
          />
        ) : null}

        {!loading && !error && tab === "raw" && filteredPurchases.length ? (
          <MaterialPurchasesTable rows={filteredPurchases} lang={lang} />
        ) : null}
      </section>

      {tab === "finished" && productions.length ? (
        <RecentProductions rows={productions.slice(0, 8)} lang={lang} />
      ) : null}

      <FinishedProductModal
        open={productModal}
        product={editingProduct}
        onClose={() => {
          setProductModal(false);
          setEditingProduct(null);
        }}
        onSaved={() =>
          reload(lang === "ar" ? "تم حفظ المنتج." : "Produit enregistré.")
        }
      />
      <ProductionModal
        open={Boolean(productionProduct)}
        product={productionProduct}
        onClose={() => setProductionProduct(null)}
        onSaved={() =>
          reload(lang === "ar" ? "تمت إضافة الكمية." : "Quantité ajoutée.")
        }
      />
      <RawMaterialModal
        open={purchaseModal}
        suppliers={suppliers}
        onClose={() => setPurchaseModal(false)}
        onSaved={() =>
          reload(lang === "ar" ? "تم تسجيل الشراء." : "Achat enregistré.")
        }
      />
    </PageBackground>
  );
}

function FinishedProductsTable({
  products,
  lang,
  onProduce,
  onEdit,
  onArchive,
}: {
  products: FinishedProduct[];
  lang: "ar" | "fr";
  onProduce: (product: FinishedProduct) => void;
  onEdit: (product: FinishedProduct) => void;
  onArchive: (product: FinishedProduct) => void;
}) {
  const headers =
    lang === "ar"
      ? ["الموديل", "الصورة", "المتوفر", "المباع", "سعر البيع", "الحالة", "الإجراءات"]
      : ["Modèle", "Photo", "Disponible", "Vendu", "Prix", "État", "Actions"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 860, borderCollapse: "collapse" }}>
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
            <tr key={product.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
              <td style={cellStyle}>
                <div style={{ fontWeight: 900, color: palette.primary }}>{product.name}</div>
                {product.notes ? (
                  <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                    {product.notes}
                  </div>
                ) : null}
              </td>
              <td style={cellStyle}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: palette.bg, color: palette.muted }}
                  >
                    <Shirt size={18} />
                  </div>
                )}
              </td>
              <td style={{ ...cellStyle, fontSize: 16, fontWeight: 900, color: "#4d8a6a" }}>
                {product.quantityAvailable}
              </td>
              <td style={cellStyle}>{product.quantitySold}</td>
              <td style={cellStyle}>{formatMoney(product.salePrice, lang)}</td>
              <td style={cellStyle}>
                <Badge
                  bg={
                    product.quantityAvailable > 0
                      ? "rgba(77,138,106,0.12)"
                      : "rgba(201,138,134,0.13)"
                  }
                  fg={product.quantityAvailable > 0 ? "#4d8a6a" : "#b46a66"}
                >
                  {product.quantityAvailable > 0
                    ? lang === "ar"
                      ? "متوفر"
                      : "Disponible"
                    : lang === "ar"
                      ? "نفد"
                      : "Épuisé"}
                </Badge>
              </td>
              <td style={cellStyle}>
                <div className="flex flex-wrap gap-1">
                  <IconButton
                    label={lang === "ar" ? "إضافة كمية" : "Ajouter quantité"}
                    color="#4d8a6a"
                    onClick={() => onProduce(product)}
                  >
                    <Factory size={15} />
                  </IconButton>
                  <IconButton
                    label={lang === "ar" ? "تعديل" : "Modifier"}
                    color="#6b8aa0"
                    onClick={() => onEdit(product)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label={lang === "ar" ? "أرشفة" : "Archiver"}
                    color="#b46a66"
                    onClick={() => onArchive(product)}
                  >
                    <Archive size={15} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialPurchasesTable({
  rows,
  lang,
}: {
  rows: MaterialPurchase[];
  lang: "ar" | "fr";
}) {
  const headers =
    lang === "ar"
      ? ["التاريخ", "المادة", "اللون", "الكمية المشتراة", "المورد", "المبلغ", "المدفوع", "الباقي", "الحالة"]
      : ["Date", "Matière", "Couleur", "Quantité achetée", "Fournisseur", "Total", "Payé", "Reste", "État"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 980, borderCollapse: "collapse" }}>
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
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
              <td style={cellStyle}>{formatDate(row.purchaseDate, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 900 }}>{row.materialName}</td>
              <td style={cellStyle}>{row.color || "-"}</td>
              <td style={cellStyle}>
                {row.quantityPurchased} {row.unit}
              </td>
              <td style={cellStyle}>{row.supplier}</td>
              <td style={cellStyle}>{formatMoney(row.totalAmount, lang)}</td>
              <td style={cellStyle}>{formatMoney(row.paidAmount, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 900, color: row.remainingAmount > 0 ? "#b46a66" : "#4d8a6a" }}>
                {formatMoney(row.remainingAmount, lang)}
              </td>
              <td style={cellStyle}>
                <Badge
                  bg={
                    row.remainingAmount <= 0
                      ? "rgba(77,138,106,0.12)"
                      : row.paidAmount > 0
                        ? "rgba(195,154,91,0.15)"
                        : "rgba(201,138,134,0.13)"
                  }
                  fg={row.remainingAmount <= 0 ? "#4d8a6a" : row.paidAmount > 0 ? "#a87d3c" : "#b46a66"}
                >
                  {row.paymentStatus}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentProductions({
  rows,
  lang,
}: {
  rows: ProductionEntry[];
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
      <h2 style={{ fontSize: 16, fontWeight: 900, color: palette.text }}>
        {lang === "ar" ? "آخر الإنتاجات" : "Productions récentes"}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 rounded-2xl p-4"
            style={{ backgroundColor: palette.bg }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>{row.productName}</div>
              <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                {row.batchNumber} · {formatDate(row.date, lang)}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: palette.primary }}>
              +{row.quantityProduced}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IconButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
      style={{ color }}
    >
      {children}
    </button>
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
