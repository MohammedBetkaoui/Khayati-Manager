import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Coins, TrendingUp, Receipt, AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { PageBackground } from "../components/page-background";
import { Badge } from "../components/kit";
import { SummaryCards } from "../components/stock/summary-cards";
import { ActionBar, type Filters } from "../components/stock/action-bar";
import { StockTable } from "../components/stock/stock-table";
import { MaterialDetailsPanel } from "../components/stock/material-details-panel";
import { LowStockAlerts } from "../components/stock/low-stock-alerts";
import { MaterialCostCard } from "../components/stock/material-cost-card";
import { AddMaterialModal, type AddMaterialForm } from "../components/stock/add-material-modal";
import { StockMovementModal } from "../components/stock/stock-movement-modal";
import { DeleteMaterialModal } from "../components/stock/delete-material-modal";
import {
  categoryLabels,
  movementColors,
  movementLabels,
  stockText,
  stockStatusOf,
  unitLabels,
  type CategoryId,
  type Material,
  type Movement,
  type Supplier,
} from "./stock-data";

type TabId = "all" | "movements" | "low" | "suppliers" | "cost";

type ApiItem = {
  id: number;
  name: string;
  category: string;
  color?: string | null;
  type?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier?: string | null;
  minStockAlert: number;
  status: string;
  notes?: string | null;
};

type ApiMovement = {
  id: number;
  movementType: string;
  quantity: number;
  unit: string;
  reason?: string | null;
  date: string;
  linkedOrderId?: string | null;
  inventoryItem: { id: number; name: string };
};

type ApiSupplier = { supplier: string; count: string; totalValue: string };

type ApiStats = {
  totalItems: number;
  lowStock: number;
  stockValue: number;
  movementsCount: number;
};

type ApiConsumptionAnalysis = {
  mostConsumedMaterial: string;
  monthlyCost: number;
  averageOrderCost: number;
};

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

const categoryToApi: Record<CategoryId, string> = {
  fabrics: "أقمشة",
  threads: "خيوط",
  buttons: "أزرار",
  zippers: "سحابات",
  accessories: "إكسسوارات",
  packaging: "تغليف",
  tools: "أدوات",
};

const unitToApi: Record<Material["unit"], string> = {
  meter: "متر",
  piece: "قطعة",
  spool: "بكرة",
  box: "علبة",
  kg: "كغ",
  bundle: "حزمة",
};

const categoryToUi: Record<CategoryId, AddMaterialForm["category"]> = {
  fabrics: "fabrics",
  threads: "threads",
  buttons: "buttons",
  zippers: "zippers",
  accessories: "accessories",
  packaging: "packaging",
  tools: "tools",
};

function materialPayloadFromForm(form: AddMaterialForm) {
  return {
    name: form.name.trim(),
    category: categoryToApi[form.category],
    color: form.color.trim() || undefined,
    type: form.type.trim() || undefined,
    quantity: Number(form.quantity) || 0,
    unit: unitToApi[form.unit],
    unitPrice: Number(form.unitPrice) || 0,
    supplier: form.supplier.trim() || undefined,
    minStockAlert: Number(form.minAlert) || 0,
    notes: form.notes.trim() || undefined,
  };
}

function materialFormFromItem(item: Material): AddMaterialForm {
  return {
    name: item.name.fr,
    category: categoryToUi[item.category],
    color: item.color?.fr ?? "",
    type: item.type.fr,
    quantity: String(item.quantity),
    unit: item.unit,
    unitPrice: String(item.unitPrice),
    supplier: item.supplier,
    minAlert: String(item.minAlert),
    notes: item.notes.fr,
  };
}

const categoryFromApi: Record<string, CategoryId> = {
  "أقمشة": "fabrics",
  "خيوط": "threads",
  "أزرار": "buttons",
  "سحابات": "zippers",
  "إكسسوارات": "accessories",
  "تغليف": "packaging",
  "أدوات": "tools",
};

const unitFromApi: Record<string, Material["unit"]> = {
  "متر": "meter",
  m: "meter",
  "قطعة": "piece",
  "pièce": "piece",
  "بكرة": "spool",
  bobine: "spool",
  "علبة": "box",
  "boîte": "box",
  "كغ": "kg",
  kg: "kg",
  "حزمة": "bundle",
  botte: "bundle",
};

const movementTypeFromApi: Record<string, Movement["type"]> = {
  "دخول مخزون": "in",
  "خروج مخزون": "out",
  "تعديل كمية": "adjust",
  "تلف / ضياع": "damage",
};

function mapApiItem(item: ApiItem): Material {
  return {
    id: String(item.id),
    name: { ar: item.name, fr: item.name },
    category: categoryFromApi[item.category] ?? "tools",
    color: item.color ? { ar: item.color, fr: item.color } : null,
    colorHex: null,
    type: { ar: item.type ?? "", fr: item.type ?? "" },
    quantity: item.quantity,
    unit: unitFromApi[item.unit] ?? "piece",
    unitPrice: item.unitPrice,
    supplier: item.supplier ?? "",
    minAlert: item.minStockAlert,
    lastMovement: { ar: "-", fr: "-" },
    notes: { ar: item.notes ?? "", fr: item.notes ?? "" },
  };
}

function mapApiMovement(m: ApiMovement): Movement {
  return {
    id: String(m.id),
    materialId: String(m.inventoryItem.id),
    material: { ar: m.inventoryItem.name, fr: m.inventoryItem.name },
    type: movementTypeFromApi[m.movementType] ?? "adjust",
    quantity: m.quantity,
    unit: unitFromApi[m.unit] ?? "piece",
    date: m.date,
    reason: { ar: m.reason ?? "", fr: m.reason ?? "" },
    order: m.linkedOrderId ?? null,
  };
}

export function StockPage() {
  const { lang, dir } = useLanguage();
  const t = stockText[lang];
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    query: "",
    category: "all",
    status: "all",
    supplier: "all",
    date: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveMaterialId, setMoveMaterialId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [allMovements, setAllMovements] = useState<Movement[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<ApiSupplier[]>([]);
  const [stats, setStats] = useState<ApiStats>({ totalItems: 0, lowStock: 0, stockValue: 0, movementsCount: 0 });
  const [consumptionAnalysis, setConsumptionAnalysis] = useState<ApiConsumptionAnalysis>({ mostConsumedMaterial: "", monthlyCost: 0, averageOrderCost: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [filters, tab]);

  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      setLoading(true);
      setApiError(null);
      try {
        const [itemsRes, statsRes, movementsRes, suppliersRes, costRes] = await Promise.all([
          fetchJson<{ data: ApiItem[] }>("/inventory?limit=200"),
          fetchJson<ApiStats>("/inventory/stats"),
          fetchJson<{ data: ApiMovement[] }>("/inventory/movements?limit=200"),
          fetchJson<ApiSupplier[]>("/inventory/suppliers"),
          fetchJson<ApiConsumptionAnalysis>("/inventory/consumption-analysis"),
        ]);
        if (ctrl.signal.aborted) return;
        setAllMaterials(itemsRes.data.map(mapApiItem));
        setStats(statsRes);
        setAllMovements(movementsRes.data.map(mapApiMovement));
        setAllSuppliers(suppliersRes);
        setConsumptionAnalysis(costRes);
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setAllMaterials([]);
        setApiError(err instanceof Error ? err.message : "Unable to load inventory");
        setConsumptionAnalysis({ mostConsumedMaterial: "", monthlyCost: 0, averageOrderCost: 0 });
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => ctrl.abort();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return allMaterials.filter((m) => {
      if (q && !m.name[lang].toLowerCase().includes(q) && !m.supplier.toLowerCase().includes(q)) return false;
      if (filters.category !== "all" && m.category !== filters.category) return false;
      if (filters.status !== "all" && stockStatusOf(m) !== filters.status) return false;
      if (filters.supplier !== "all" && m.supplier !== filters.supplier) return false;
      return true;
    });
  }, [filters, lang, allMaterials]);

  const lowRows = filtered.filter((m) => stockStatusOf(m) !== "available");

  const totalCount = stats.totalItems;
  const lowCount = stats.lowStock;
  const stockValue = stats.stockValue.toLocaleString() + " " + t.currency;
  const materialById = useMemo(
    () => new Map(allMaterials.map((material) => [material.id, material])),
    [allMaterials],
  );
  const costRows = useMemo(() => {
    const usage = new Map<string, { material: Material; used: number; cost: number }>();

    for (const movement of allMovements) {
      if (movement.type !== "out") continue;
      const material = materialById.get(movement.materialId);
      if (!material) continue;

      const current = usage.get(material.id) ?? { material, used: 0, cost: 0 };
      current.used += movement.quantity;
      current.cost += movement.quantity * material.unitPrice;
      usage.set(material.id, current);
    }

    return [...usage.values()].sort((a, b) => b.cost - a.cost).slice(0, 8);
  }, [allMovements, materialById]);
  const fallbackMonthCost = costRows.reduce((sum, row) => sum + row.cost, 0);
  const linkedOrdersCount = new Set(allMovements.filter((movement) => movement.type === "out" && movement.order).map((movement) => movement.order)).size;
  const monthCostValue = consumptionAnalysis.monthlyCost || fallbackMonthCost;
  const topMaterialName = consumptionAnalysis.mostConsumedMaterial || costRows[0]?.material.name[lang] || "";
  const averageOrderCostValue =
    consumptionAnalysis.averageOrderCost ||
    (linkedOrdersCount > 0 ? Math.round(monthCostValue / linkedOrdersCount) : 0);

  const selected = allMaterials.find((m) => m.id === selectedId) ?? null;
  const editingMaterial = allMaterials.find((m) => m.id === editingMaterialId) ?? null;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const openMovement = (id?: string) => {
    setMoveMaterialId(id ?? null);
    setMoveOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingMaterialId(id);
    setEditOpen(true);
  };

  async function handleCreateMaterial(form: AddMaterialForm) {
    setSavingMaterial(true);

    try {
      await fetchJson("/inventory", {
        method: "POST",
        body: JSON.stringify(materialPayloadFromForm(form)),
      });
      setRefreshKey((key) => key + 1);
    } finally {
      setSavingMaterial(false);
    }
  }

  async function handleUpdateMaterial(form: AddMaterialForm) {
    if (!editingMaterialId) return;

    setSavingMaterial(true);

    try {
      await fetchJson(`/inventory/${editingMaterialId}`, {
        method: "PATCH",
        body: JSON.stringify(materialPayloadFromForm(form)),
      });
      setRefreshKey((key) => key + 1);
      setEditOpen(false);
      setEditingMaterialId(null);
    } finally {
      setSavingMaterial(false);
    }
  }

  async function handleDeleteMaterial() {
    if (!toDelete) return;

    setDeletingMaterial(true);

    try {
      await fetchJson(`/inventory/${toDelete}`, { method: "DELETE" });
      if (selectedId === toDelete) setSelectedId(null);
      setToDelete(null);
      setRefreshKey((key) => key + 1);
    } finally {
      setDeletingMaterial(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: t.tabs.all },
    { id: "movements", label: t.tabs.movements },
    { id: "low", label: t.tabs.low },
    { id: "suppliers", label: t.tabs.suppliers },
    { id: "cost", label: t.tabs.cost },
  ];

  // Pagination logic
  let activeListLength = 0;
  if (tab === "all") activeListLength = filtered.length;
  if (tab === "low") activeListLength = lowRows.length;
  if (tab === "movements") activeListLength = allMovements.length;
  if (tab === "suppliers") activeListLength = allSuppliers.length;
  if (tab === "cost") activeListLength = costRows.length;

  const totalPages = Math.ceil(activeListLength / itemsPerPage) || 1;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedFiltered = filtered.slice(startIndex, endIndex);
  const paginatedLowRows = lowRows.slice(startIndex, endIndex);
  const paginatedMovements = allMovements.slice(startIndex, endIndex);
  const paginatedSuppliers = allSuppliers.slice(startIndex, endIndex);
  const paginatedCostRows = costRows.slice(startIndex, endIndex);

  return (
    <PageBackground>
      {/* Breadcrumb + back + title */}
      <div className="flex items-center gap-4 pt-7">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.primary,
          }}
        >
          <BackArrow size={20} />
        </button>
        <div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
            <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
              {t.breadcrumbHome}
            </button>
            <CrumbChevron size={14} />
            <span style={{ color: palette.text, fontWeight: 600 }}>{t.breadcrumb}</span>
          </div>
          <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 620 }}>{t.subtitle}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6">
        <SummaryCards total={totalCount} low={lowCount} value={stockValue} moves={stats.movementsCount} />
      </div>

      <div className="mt-5">
        <MaterialCostCard
          monthCost={monthCostValue}
          topMaterial={topMaterialName}
          averageOrderCost={averageOrderCostValue}
        />
      </div>

      {/* Action bar */}
      <div className="mt-5">
        <ActionBar
          filters={filters}
          onChange={setFilters}
          onAdd={() => setAddOpen(true)}
          onMovement={() => openMovement()}
          supplierNames={allSuppliers.map((s) => s.supplier)}
        />
      </div>

      {/* Main two-column layout */}
      <div className={`mt-5 grid grid-cols-1 gap-5 pb-10 ${selectedId ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-1"}`}>
        {/* LEFT — table container */}
        <section
          style={{
            backgroundColor: palette.surface,
            borderRadius: 22,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
            overflow: "hidden",
            alignSelf: "start",
          }}
        >
          {/* Tabs */}
          <div
            className="flex flex-wrap items-center gap-1 px-4 pt-4"
            style={{ borderBottom: `1px solid ${palette.border}` }}
          >
            {tabs.map((tb) => {
              const active = tb.id === tab;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setTab(tb.id)}
                  className="relative transition-colors"
                  style={{
                    padding: "10px 16px 14px",
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? palette.primary : palette.muted,
                  }}
                >
                  {tb.label}
                  {active ? (
                    <span
                      className="absolute inset-x-2"
                      style={{ bottom: -1, height: 2.5, borderRadius: 999, backgroundColor: palette.primary }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {loading || apiError || allMaterials.length === 0 ? (
              <StockEmptyState loading={loading} error={apiError} />
            ) : (
              <>
                {tab === "all" && (
                  <StockTable
                    rows={paginatedFiltered}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onEdit={openEdit}
                    onMove={openMovement}
                    onDelete={setToDelete}
                  />
                )}
                {tab === "movements" && <MovementsTable rows={paginatedMovements} />}
                {tab === "low" && (
                  <StockTable
                    rows={paginatedLowRows}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onEdit={openEdit}
                    onMove={openMovement}
                    onDelete={setToDelete}
                  />
                )}
                {tab === "suppliers" && <SuppliersTable rows={paginatedSuppliers} />}
                {tab === "cost" && (
                  <CostBreakdown
                    rows={paginatedCostRows}
                    monthCost={monthCostValue}
                    topMaterial={topMaterialName}
                    averageOrderCost={averageOrderCostValue}
                  />
                )}
              </>
            )}
          </div>

          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: `1px solid ${palette.border}`, fontSize: 13, color: palette.muted }}
          >
            <div>
              {t.showing} {Math.min(startIndex + 1, activeListLength)} - {Math.min(endIndex, activeListLength)} {t.of} {activeListLength} {t.items}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-black/5 disabled:opacity-50"
                style={{ borderColor: palette.border }}
              >
                <ChevronRight size={16} style={{ transform: dir === "rtl" ? "none" : "rotate(180deg)" }} />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: palette.primary, color: "white", fontWeight: 600 }}>
                {page}
              </div>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-black/5 disabled:opacity-50"
                style={{ borderColor: palette.border }}
              >
                <ChevronLeft size={16} style={{ transform: dir === "rtl" ? "none" : "rotate(180deg)" }} />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT — sidebar */}
        {selectedId && (
          <aside className="flex flex-col gap-5">
            <MaterialDetailsPanel material={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} />
          </aside>
        )}
      </div>

      <AddMaterialModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreateMaterial}
        isSaving={savingMaterial}
      />
      <AddMaterialModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingMaterialId(null);
        }}
        onSubmit={handleUpdateMaterial}
        initialValues={editingMaterial ? materialFormFromItem(editingMaterial) : null}
        mode="edit"
        isSaving={savingMaterial}
      />
      <StockMovementModal open={moveOpen} onClose={() => setMoveOpen(false)} materialId={moveMaterialId} materials={allMaterials} />
      <DeleteMaterialModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDeleteMaterial}
        isDeleting={deletingMaterial}
      />
    </PageBackground>
  );
}

/* ------------------------------ Tab: Movements ----------------------------- */

function StockEmptyState({ loading, error }: { loading: boolean; error: string | null }) {
  const { lang } = useLanguage();
  const title = loading
    ? lang === "ar" ? "جاري تحميل بيانات المخزون..." : "Chargement du stock..."
    : error
    ? lang === "ar" ? "تعذّر تحميل بيانات المخزون" : "Impossible de charger le stock"
    : lang === "ar" ? "لا توجد مواد في المخزون" : "Aucune matière en stock";

  const desc = loading
    ? ""
    : error
    ? lang === "ar" ? "تأكد من تشغيل خادم NestJS وأن رابط API صحيح." : "Vérifiez que le serveur NestJS est lancé et que l'URL API est correcte."
    : lang === "ar" ? "قاعدة البيانات فارغة. أضف أول مادة." : "La base de données est vide. Ajoutez une première matière.";

  return (
    <div
      className="flex min-h-[260px] flex-col items-center justify-center text-center"
      style={{ borderRadius: 18, border: `1px dashed ${palette.borderStrong}`, backgroundColor: palette.bg, padding: 28 }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{title}</div>
      {desc && <p style={{ marginTop: 8, maxWidth: 440, fontSize: 13.5, color: palette.muted, lineHeight: 1.7 }}>{desc}</p>}
      {error && <p style={{ marginTop: 10, fontSize: 12, color: palette.rose }}>{error}</p>}
    </div>
  );
}

function MovementsTable({ rows }: { rows: Movement[] }) {
  const { lang } = useLanguage();
  const t = stockText[lang];

  const headStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    padding: "0 14px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "14px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 760 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={headStyle}>{t.moveCols.material}</th>
            <th style={headStyle}>{t.moveCols.type}</th>
            <th style={headStyle}>{t.moveCols.quantity}</th>
            <th style={headStyle}>{t.moveCols.date}</th>
            <th style={headStyle}>{t.moveCols.reason}</th>
            <th style={headStyle}>{t.moveCols.order}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((mv) => (
            <tr key={mv.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{mv.material[lang]}</td>
              <td style={cellStyle}>
                <Badge
                  bg={`${movementColors[mv.type]}1f`}
                  fg={movementColors[mv.type]}
                  dot={movementColors[mv.type]}
                >
                  {movementLabels[mv.type][lang]}
                </Badge>
              </td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>
                {mv.type === "out" || mv.type === "damage" ? "−" : "+"}
                {mv.quantity}{" "}
                <span style={{ fontWeight: 500, fontSize: 12.5, color: palette.muted }}>
                  {unitLabels[mv.unit][lang]}
                </span>
              </td>
              <td style={{ ...cellStyle, color: palette.muted }}>{mv.date}</td>
              <td style={{ ...cellStyle, color: palette.muted, whiteSpace: "normal" }}>{mv.reason[lang]}</td>
              <td style={cellStyle}>
                {mv.order ? (
                  <span style={{ direction: "ltr", color: palette.primary, fontWeight: 600 }}>{mv.order}</span>
                ) : (
                  <span style={{ color: palette.muted }}>{t.noOrder}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ Tab: Suppliers ----------------------------- */

function SuppliersTable({ rows }: { rows: ApiSupplier[] }) {
  const { lang } = useLanguage();
  const t = stockText[lang];

  const headStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    padding: "0 14px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "14px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center" style={{ color: palette.muted, fontSize: 14 }}>
        {lang === "ar" ? "لا يوجد موردون" : "Aucun fournisseur"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 480 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={headStyle}>{t.supplierCols.name}</th>
            <th style={headStyle}>{t.supplierCols.materials}</th>
            <th style={headStyle}>{lang === "ar" ? "القيمة الإجمالية" : "Valeur totale"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.supplier} style={{ borderBottom: `1px solid ${palette.border}` }}>
              <td style={{ ...cellStyle, fontWeight: 600 }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      backgroundColor: palette.accentSoft,
                      color: palette.accent,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {s.supplier.slice(0, 1)}
                  </div>
                  {s.supplier}
                </div>
              </td>
              <td style={{ ...cellStyle, fontWeight: 700 }}>{s.count}</td>
              <td style={{ ...cellStyle, color: palette.primary, fontWeight: 600 }}>
                {Number(s.totalValue).toLocaleString()} {lang === "ar" ? "د.ج" : "DA"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Tab: Cost -------------------------------- */

function CostBreakdown({
  rows,
  monthCost,
  topMaterial,
  averageOrderCost,
}: {
  rows: { material: Material; used: number; cost: number }[];
  monthCost: number;
  topMaterial: string;
  averageOrderCost: number;
}) {
  const { lang } = useLanguage();
  const t = stockText[lang];
  const cur = t.currency;

  const headStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    padding: "0 14px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "14px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  const summary = [
    {
      icon: Coins,
      label: t.cost.monthCost,
      value: `${monthCost.toLocaleString()} ${cur}`,
      color: "#a87d3c",
      tint: "rgba(195,154,91,0.16)",
    },
    {
      icon: TrendingUp,
      label: t.cost.topMaterial,
      value: topMaterial || (lang === "ar" ? "لا توجد بيانات" : "Aucune donnee"),
      color: "#4d8a6a",
      tint: "rgba(77,138,106,0.12)",
    },
    {
      icon: Receipt,
      label: t.cost.avgOrder,
      value: `${averageOrderCost.toLocaleString()} ${cur}`,
      color: palette.primary,
      tint: "rgba(18,60,74,0.08)",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3"
              style={{ backgroundColor: palette.bg, borderRadius: 16, border: `1px solid ${palette.border}`, padding: 14 }}
            >
              <div
                className="flex shrink-0 items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: s.tint, color: s.color }}
              >
                <Icon size={19} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div style={{ fontSize: 12, color: palette.muted }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              <th style={headStyle}>{t.cols.name}</th>
              <th style={headStyle}>{lang === "ar" ? "الكمية المستهلكة" : "Quantité utilisée"}</th>
              <th style={headStyle}>{lang === "ar" ? "التكلفة" : "Coût"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((r) => (
                <tr key={r.material.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{r.material.name[lang]}</td>
                  <td style={{ ...cellStyle, color: palette.muted }}>
                    {r.used} {unitLabels[r.material.unit][lang]}
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 700, color: palette.primary }}>
                    {r.cost.toLocaleString()} {cur}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ ...cellStyle, color: palette.muted, textAlign: "center", padding: "24px 14px" }}>
                  {lang === "ar"
                    ? "لا توجد حركات استهلاك فعلية لعرض تكلفة المواد بعد."
                    : "Aucun mouvement de consommation reel a afficher pour le moment."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
