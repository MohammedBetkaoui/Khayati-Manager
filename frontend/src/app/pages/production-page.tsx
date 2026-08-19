import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Coins, Receipt, Table2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";
import { SummaryCards } from "../components/production/summary-cards";
import { ActionBar, type Filters } from "../components/production/action-bar";
import { KanbanBoard } from "../components/production/kanban-board";
import { OrdersTable } from "../components/production/orders-table";
import { OrderDetailsBar } from "../components/production/order-details-bar";
import { AddOrderModal } from "../components/production/add-order-modal";
import { AssignWorkersModal } from "../components/production/assign-workers-modal";
import { LinkMaterialsModal } from "../components/production/link-materials-modal";
import { ChangeStageModal } from "../components/production/change-stage-modal";
import {
  deadlineLabels,
  orderMaterialCost,
  orderTotalCost,
  palette,
  prodText,
  productLabels,
  stageOrder,
  type Bilingual,
  type DeadlineStatus,
  type Order,
  type PaymentStatus,
  type Priority,
  type ProductType,
  type StageId,
} from "./production-data";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";

type TabId = "board" | "all" | "calendar" | "costs" | "late";

type MaterialOption = {
  name: Bilingual;
  unit: Bilingual;
  unitCost: number;
};

const stageMap: Record<string, StageId> = {
  new: "new",
  NEW: "new",
  cutting: "cutting",
  CUTTING: "cutting",
  sewing: "sewing",
  SEWING: "sewing",
  ironing: "ironing",
  IRONING: "ironing",
  ready: "ready",
  READY: "ready",
  delivered: "delivered",
  DELIVERED: "delivered",
};

const productMap: Record<string, ProductType> = {
  shirt: "shirt",
  pants: "pants",
  dress: "dress",
  school: "school",
  workwear: "workwear",
  other: "other",
  SHIRT: "shirt",
  PANTS: "pants",
  DRESS: "dress",
  SCHOOL: "school",
  WORKWEAR: "workwear",
  OTHER: "other",
};

const priorityMap: Record<string, Priority> = {
  normal: "normal",
  urgent: "urgent",
  NORMAL: "normal",
  URGENT: "urgent",
};

const paymentMap: Record<string, PaymentStatus> = {
  unpaid: "unpaid",
  partial: "partial",
  paid: "paid",
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
};

function computeDeadline(deliveryDate: string, stage: StageId): DeadlineStatus {
  if (!deliveryDate || stage === "delivered") {
    return "ontime";
  }

  const today = "2026-08-19";
  if (deliveryDate < today) return "late";
  if (deliveryDate <= "2026-08-22") return "near";
  return "ontime";
}

function buildTimeline(stage: StageId, receivedDate: string) {
  const reachedIndex = stageOrder.indexOf(stage);
  return stageOrder.map((step, index) => ({
    stage: step,
    date: index <= reachedIndex ? (index === 0 ? receivedDate || "2026-08-19" : receivedDate || null) : null,
  }));
}

function mapOrder(raw: unknown): Order {
  const record = asRecord(raw);
  const customer = getText(record?.customerName) || getText(record?.customer) || "Client";
  const stage = stageMap[getText(record?.stage)] ?? "new";
  const product = productMap[getText(record?.product)] ?? "other";
  const deliveryDate = getText(record?.deliveryDate) || getText(record?.date) || "2026-08-19";
  const receivedDate = getText(record?.receivedDate) || getText(record?.createdAt) || "2026-08-19";
  const workers = Array.isArray(record?.workers)
    ? record.workers.map((worker) => getText(worker)).filter(Boolean)
    : [];

  return {
    id: getText(record?.id) || crypto.randomUUID(),
    number: getText(record?.number) || getText(record?.orderNumber) || "-",
    customer: { ar: customer, fr: customer },
    phone: getText(record?.phone) || getText(record?.customerPhone),
    product,
    quantity: getNumber(record?.quantity, 0),
    sizes: getText(record?.sizes),
    colors: [],
    receivedDate,
    deliveryDate,
    stage,
    priority: priorityMap[getText(record?.priority)] ?? "normal",
    deadline: computeDeadline(deliveryDate, stage),
    workers,
    materials: [],
    laborCost: getNumber(record?.laborCost),
    extraCost: getNumber(record?.extraCost),
    agreedPrice: getNumber(record?.agreedPrice ?? record?.total),
    payment: paymentMap[getText(record?.paymentStatus ?? record?.payment)] ?? "unpaid",
    notes: { ar: getText(record?.notes), fr: getText(record?.notes) },
    timeline: buildTimeline(stage, receivedDate),
  };
}

export function ProductionPage() {
  const { lang, dir } = useLanguage();
  const t = prodText[lang];
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    query: "",
    product: "all",
    stage: "all",
    worker: "all",
    priority: "all",
    date: "",
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Bilingual[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("board");
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [stageModalId, setStageModalId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 8;

  useEffect(() => {
    setPage(1);
  }, [filters, tab]);

  useEffect(() => {
    let cancelled = false;

    async function safeLoad(path: string) {
      try {
        return await fetchJson<unknown>(path);
      } catch {
        return null;
      }
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [ordersPayload, workersPayload, materialsPayload] = await Promise.all([
          safeLoad("/orders"),
          safeLoad("/workers?limit=100&sortBy=fullName&sortOrder=ASC"),
          safeLoad("/inventory?limit=200"),
        ]);

        if (cancelled) return;

        setOrders(getArrayFromPayload(ordersPayload).map(mapOrder));
        setWorkers(
          getArrayFromPayload(workersPayload).map((worker) => {
            const record = asRecord(worker);
            const name = getText(record?.fullName) || getText(record?.name) || "Ouvrier";
            return { ar: name, fr: name };
          }),
        );
        setMaterials(
          getArrayFromPayload(materialsPayload).map((item) => {
            const record = asRecord(item);
            const name = getText(record?.name) || "Matiere";
            const unit = getText(record?.unit) || "-";
            return {
              name: { ar: name, fr: name },
              unit: { ar: unit, fr: unit },
              unitCost: getNumber(record?.unitPrice),
            };
          }),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load production.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return orders.filter((order) => {
      if (
        query &&
        !order.customer[lang].toLowerCase().includes(query) &&
        !order.number.includes(query) &&
        !productLabels[order.product][lang].toLowerCase().includes(query)
      ) {
        return false;
      }
      if (filters.product !== "all" && order.product !== filters.product) return false;
      if (filters.stage !== "all" && order.stage !== filters.stage) return false;
      if (filters.worker !== "all" && !order.workers.includes(filters.worker)) return false;
      if (filters.priority !== "all" && order.priority !== filters.priority) return false;
      if (filters.date && order.deliveryDate !== filters.date) return false;
      return true;
    });
  }, [filters, lang, orders]);

  const lateRows = filtered.filter((order) => order.deadline === "late");
  const newCount = orders.filter((order) => order.stage === "new").length;
  const inProduction = orders.filter((order) => ["cutting", "sewing", "ironing"].includes(order.stage)).length;
  const readyCount = orders.filter((order) => order.stage === "ready").length;
  const lateCount = orders.filter((order) => order.deadline === "late").length;
  const monthCost = `${orders.reduce((sum, order) => sum + orderMaterialCost(order) + order.laborCost + order.extraCost, 0).toLocaleString()} ${t.currency}`;

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const stageModalOrder = orders.find((order) => order.id === stageModalId) ?? null;
  const tableRows = tab === "late" ? lateRows : filtered;
  const totalPages = Math.ceil(tableRows.length / itemsPerPage) || 1;
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedRows = tableRows.slice(startIndex, startIndex + itemsPerPage);
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs: { id: TabId; label: string }[] = [
    { id: "board", label: t.tabs.board },
    { id: "all", label: t.tabs.all },
    { id: "calendar", label: t.tabs.calendar },
    { id: "costs", label: t.tabs.costs },
    { id: "late", label: t.tabs.late },
  ];

  function moveOrder(id: string, stage: StageId) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              stage,
              deadline: computeDeadline(order.deliveryDate, stage),
              timeline: buildTimeline(stage, order.receivedDate),
            }
          : order,
      ),
    );
  }

  return (
    <PageBackground>
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
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 680 }}>{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-6">
        <SummaryCards newCount={newCount} inProduction={inProduction} ready={readyCount} late={lateCount} monthCost={monthCost} />
      </div>

      <div className="mt-5">
        <ActionBar filters={filters} onChange={setFilters} onAdd={() => setAddOpen(true)} onCalendar={() => setTab("calendar")} workers={workers} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="transition-colors"
              style={{
                padding: "9px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? "#fff" : palette.muted,
                backgroundColor: active ? palette.primary : palette.surface,
                border: `1px solid ${active ? palette.primary : palette.border}`,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-5">
          <OrderDetailsBar
            order={selected}
            onClose={() => setSelectedId(null)}
            onChangeStage={() => setStageModalId(selected.id)}
            onAssign={() => setAssignOpen(true)}
            onLink={() => setLinkOpen(true)}
          />
        </div>
      ) : null}

      <div className="mt-5 pb-10">
        {loading ? (
          <div className="mb-4 text-sm" style={{ color: palette.muted }}>
            {lang === "ar" ? "جاري تحميل الطلبيات..." : "Chargement des commandes..."}
          </div>
        ) : null}
        {!loading && error ? (
          <div className="mb-4 text-sm" style={{ color: "#b46a66" }}>
            {lang === "ar" ? "تعذر تحميل بيانات الإنتاج من الواجهة الخلفية." : "Impossible de charger les donnees de production depuis l'API."}
          </div>
        ) : null}

        {tab === "board" ? (
          <KanbanBoard orders={filtered} selectedId={selectedId} onSelect={setSelectedId} onMove={moveOrder} />
        ) : null}

        {tab === "all" || tab === "late" ? (
          <div
            style={{
              backgroundColor: palette.surface,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
              overflow: "hidden",
            }}
          >
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${palette.border}` }}>
              <Table2 size={17} style={{ color: palette.primary }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>
                {tab === "late" ? t.tabs.late : t.tableView}
              </span>
            </div>
            <div className="p-4">
              <OrdersTable rows={paginatedRows} selectedId={selectedId} onSelect={setSelectedId} onChangeStage={setStageModalId} />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${palette.border}`, fontSize: 13, color: palette.muted }}>
              <div>
                {t.showing} {Math.min(startIndex + 1, tableRows.length)} - {Math.min(startIndex + itemsPerPage, tableRows.length)} {t.of} {tableRows.length} {t.items}
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
          </div>
        ) : null}

        {tab === "costs" ? <CostsView orders={orders} /> : null}
        {tab === "calendar" ? <CalendarView orders={orders} /> : null}
      </div>

      <AddOrderModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AssignWorkersModal open={assignOpen} onClose={() => setAssignOpen(false)} defaultOrderId={selectedId} orders={orders} workers={workers} />
      <LinkMaterialsModal open={linkOpen} onClose={() => setLinkOpen(false)} materials={materials} />
      <ChangeStageModal open={!!stageModalId} onClose={() => setStageModalId(null)} order={stageModalOrder} />
    </PageBackground>
  );
}

function CostsView({ orders }: { orders: Order[] }) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const cur = t.currency;
  const totalMaterial = orders.reduce((sum, order) => sum + orderMaterialCost(order), 0);
  const totalLabor = orders.reduce((sum, order) => sum + order.laborCost, 0);
  const average = orders.length ? Math.round(orders.reduce((sum, order) => sum + orderTotalCost(order), 0) / orders.length) : 0;

  const cards = [
    { icon: Coins, label: t.summary.cost, value: `${(totalMaterial + totalLabor).toLocaleString()} ${cur}`, color: "#a87d3c", tint: "rgba(195,154,91,0.16)" },
    { icon: TrendingUp, label: lang === "ar" ? "تكلفة المواد" : "Coût matières", value: `${totalMaterial.toLocaleString()} ${cur}`, color: "#4d8a6a", tint: "rgba(77,138,106,0.12)" },
    { icon: Receipt, label: lang === "ar" ? "متوسط تكلفة الطلبية" : "Coût moyen / commande", value: `${average.toLocaleString()} ${cur}`, color: palette.primary, tint: "rgba(18,60,74,0.08)" },
  ];

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding: 18,
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center gap-3" style={{ backgroundColor: palette.bg, borderRadius: 16, border: `1px solid ${palette.border}`, padding: 14 }}>
              <div className="flex shrink-0 items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: card.tint, color: card.color }}>
                <Icon size={19} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <div style={{ fontSize: 12, color: palette.muted }}>{card.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm" style={{ color: palette.muted }}>
        {orders.length === 0 ? (lang === "ar" ? "لا توجد طلبيات لعرض التكاليف." : "Aucune commande disponible pour afficher les coûts.") : null}
      </div>
    </div>
  );
}

function CalendarView({ orders }: { orders: Order[] }) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const upcoming = [...orders].filter((order) => order.stage !== "delivered").sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding: 20,
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(18,60,74,0.08)", color: palette.primary }}>
          <CalendarDays size={20} strokeWidth={1.9} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{t.tabs.calendar}</div>
          <div style={{ fontSize: 12.5, color: palette.muted }}>{t.calendarSoon}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {upcoming.length === 0 ? (
          <div className="text-sm" style={{ color: palette.muted }}>
            {lang === "ar" ? "لا توجد طلبيات قادمة." : "Aucune commande à venir."}
          </div>
        ) : (
          upcoming.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3" style={{ backgroundColor: palette.bg, borderRadius: 14, border: `1px solid ${palette.border}`, padding: "12px 14px" }}>
              <div className="flex items-center gap-3">
                <div className="flex min-h-[46px] w-[52px] flex-col items-center justify-center text-center" style={{ borderRadius: 12, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}>
                  <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{order.deliveryDate.slice(8)}</span>
                  <span style={{ fontSize: 10, color: palette.muted }}>{order.deliveryDate.slice(0, 7)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ direction: "ltr", fontSize: 13, fontWeight: 800, color: palette.primary }}>#{order.number}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: palette.text }}>{order.customer[lang]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                    {productLabels[order.product][lang]} · {order.quantity} {lang === "ar" ? "قطعة" : "pcs"}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: order.deadline === "late" ? "#b46a66" : order.deadline === "near" ? "#a87d3c" : "#4d8a6a" }}>
                {deadlineLabels[order.deadline][lang]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
