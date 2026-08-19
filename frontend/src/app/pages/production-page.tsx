import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Coins,
  TrendingUp,
  Receipt,
  Table2,
} from "lucide-react";
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
  palette,
  prodText,
  orders as seedOrders,
  stageOrder as stageSequence,
  orderTotalCost,
  orderMaterialCost,
  productLabels,
  type Order,
  type StageId,
} from "./production-data";

type TabId = "board" | "all" | "calendar" | "costs" | "late";

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
  const [orderList, setOrderList] = useState<Order[]>(seedOrders);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("board");
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [stageModalId, setStageModalId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setPage(1);
  }, [filters, tab]);

  // Move an order to a new stage (drag & drop) and keep its timeline coherent.
  const moveOrder = (id: string, stage: StageId) => {
    const today = new Date().toISOString().slice(0, 10);
    const targetIndex = stageSequence.indexOf(stage);
    setOrderList((prev) =>
      prev.map((o) => {
        if (o.id !== id || o.stage === stage) return o;
        const timeline = o.timeline.map((step) => {
          const stepIndex = stageSequence.indexOf(step.stage);
          if (stepIndex <= targetIndex) {
            return { ...step, date: step.date ?? today };
          }
          return { ...step, date: null };
        });
        return { ...o, stage, timeline };
      }),
    );
  };

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return orderList.filter((o) => {
      if (
        q &&
        !o.customer[lang].toLowerCase().includes(q) &&
        !o.number.includes(q) &&
        !productLabels[o.product][lang].toLowerCase().includes(q)
      )
        return false;
      if (filters.product !== "all" && o.product !== filters.product) return false;
      if (filters.stage !== "all" && o.stage !== filters.stage) return false;
      if (filters.worker !== "all" && !o.workers.includes(filters.worker)) return false;
      if (filters.priority !== "all" && o.priority !== filters.priority) return false;
      return true;
    });
  }, [filters, lang, orderList]);

  const lateRows = filtered.filter((o) => o.deadline === "late");

  // Summary metrics (over the whole dataset, not filtered)
  const newCount = orderList.filter((o) => o.stage === "new").length;
  const inProduction = orderList.filter((o) => ["cutting", "sewing", "ironing"].includes(o.stage)).length;
  const readyCount = orderList.filter((o) => o.stage === "ready").length;
  const lateCount = orderList.filter((o) => o.deadline === "late").length;
  const monthCost =
    orderList
      .filter((o) => o.stage !== "delivered")
      .reduce((s, o) => s + orderMaterialCost(o) + o.laborCost, 0)
      .toLocaleString() +
    " " +
    t.currency;

  const selected = orderList.find((o) => o.id === selectedId) ?? null;
  const stageModalOrder = orderList.find((o) => o.id === stageModalId) ?? null;

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const tabs: { id: TabId; label: string }[] = [
    { id: "board", label: t.tabs.board },
    { id: "all", label: t.tabs.all },
    { id: "calendar", label: t.tabs.calendar },
    { id: "costs", label: t.tabs.costs },
    { id: "late", label: t.tabs.late },
  ];

  // Pagination applies only to table-style tabs.
  const tableRows = tab === "late" ? lateRows : filtered;
  const totalPages = Math.ceil(tableRows.length / itemsPerPage) || 1;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = tableRows.slice(startIndex, endIndex);

  const isTableTab = tab === "all" || tab === "late";

  const openStage = (id: string) => {
    setSelectedId(id);
    setStageModalId(id);
  };

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
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 680 }}>{t.subtitle}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6">
        <SummaryCards
          newCount={newCount}
          inProduction={inProduction}
          ready={readyCount}
          late={lateCount}
          monthCost={monthCost}
        />
      </div>

      {/* Action bar */}
      <div className="mt-5">
        <ActionBar
          filters={filters}
          onChange={setFilters}
          onAdd={() => setAddOpen(true)}
          onCalendar={() => setTab("calendar")}
        />
      </div>

      {/* Segmented tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {tabs.map((tb) => {
          const active = tb.id === tab;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
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
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* Selected order details — horizontal banner above the board */}
      {selected && (
        <div className="mt-5">
          <OrderDetailsBar
            order={selected}
            onClose={() => setSelectedId(null)}
            onChangeStage={() => openStage(selected.id)}
            onAssign={() => setAssignOpen(true)}
            onLink={() => setLinkOpen(true)}
          />
        </div>
      )}

      {/* Main content — always full width */}
      <div className="mt-5 pb-10">
        {/* MAIN AREA */}
        <section className="min-w-0">
          {tab === "board" && (
            <KanbanBoard
              orders={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveOrder}
            />
          )}

          {isTableTab && (
            <div
              style={{
                backgroundColor: palette.surface,
                borderRadius: 20,
                border: `1px solid ${palette.border}`,
                boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
                overflow: "hidden",
              }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3.5"
                style={{ borderBottom: `1px solid ${palette.border}` }}
              >
                <Table2 size={17} style={{ color: palette.primary }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>
                  {tab === "late" ? t.tabs.late : t.tableView}
                </span>
                <span style={{ fontSize: 12.5, color: palette.muted }}>— {t.tableHint}</span>
              </div>
              <div className="p-4">
                <OrdersTable
                  rows={paginatedRows}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onChangeStage={openStage}
                />
              </div>
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: `1px solid ${palette.border}`, fontSize: 13, color: palette.muted }}
              >
                <div>
                  {t.showing} {Math.min(startIndex + 1, tableRows.length)} - {Math.min(endIndex, tableRows.length)}{" "}
                  {t.of} {tableRows.length} {t.items}
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
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: palette.primary, color: "white", fontWeight: 600 }}
                  >
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
          )}

          {tab === "costs" && <CostsView orders={orderList} />}

          {tab === "calendar" && <CalendarView orders={orderList} />}
        </section>
      </div>

      <AddOrderModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AssignWorkersModal open={assignOpen} onClose={() => setAssignOpen(false)} defaultOrderId={selectedId} />
      <LinkMaterialsModal open={linkOpen} onClose={() => setLinkOpen(false)} />
      <ChangeStageModal open={!!stageModalId} onClose={() => setStageModalId(null)} order={stageModalOrder} />
    </PageBackground>
  );
}

/* -------------------------------- Costs view ------------------------------- */

function CostsView({ orders }: { orders: Order[] }) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const cur = t.currency;

  const active = orders.filter((o) => o.stage !== "delivered");
  const totalMaterial = active.reduce((s, o) => s + orderMaterialCost(o), 0);
  const totalLabor = active.reduce((s, o) => s + o.laborCost, 0);
  const avg = active.length ? Math.round(active.reduce((s, o) => s + orderTotalCost(o), 0) / active.length) : 0;

  const summary = [
    {
      icon: Coins,
      label: t.summary.cost,
      value: `${(totalMaterial + totalLabor).toLocaleString()} ${cur}`,
      color: "#a87d3c",
      tint: "rgba(195,154,91,0.16)",
    },
    {
      icon: TrendingUp,
      label: lang === "ar" ? "تكلفة المواد" : "Coût matières",
      value: `${totalMaterial.toLocaleString()} ${cur}`,
      color: "#4d8a6a",
      tint: "rgba(77,138,106,0.12)",
    },
    {
      icon: Receipt,
      label: lang === "ar" ? "متوسط تكلفة الطلبية" : "Coût moyen / commande",
      value: `${avg.toLocaleString()} ${cur}`,
      color: palette.primary,
      tint: "rgba(18,60,74,0.08)",
    },
  ];

  const headStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    padding: "0 14px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              <th style={headStyle}>{t.cols.number}</th>
              <th style={headStyle}>{t.cols.customer}</th>
              <th style={headStyle}>{t.panel.materialCost}</th>
              <th style={headStyle}>{t.panel.laborCost}</th>
              <th style={headStyle}>{t.panel.totalCost}</th>
              <th style={headStyle}>{t.panel.margin}</th>
            </tr>
          </thead>
          <tbody>
            {active.map((o) => {
              const mat = orderMaterialCost(o);
              const total = orderTotalCost(o);
              const margin = o.agreedPrice - total;
              return (
                <tr key={o.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...cellStyle, direction: "ltr", fontWeight: 800, color: palette.primary }}>
                    #{o.number}
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{o.customer[lang]}</td>
                  <td style={{ ...cellStyle, color: palette.muted }}>{mat.toLocaleString()}</td>
                  <td style={{ ...cellStyle, color: palette.muted }}>{o.laborCost.toLocaleString()}</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>{total.toLocaleString()}</td>
                  <td style={{ ...cellStyle, fontWeight: 700, color: margin >= 0 ? "#4d8a6a" : "#b46a66" }}>
                    {margin.toLocaleString()} {cur}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Calendar view ------------------------------ */

function CalendarView({ orders }: { orders: Order[] }) {
  const { lang } = useLanguage();
  const t = prodText[lang];

  // Group active orders by delivery date for a simple agenda-style preview.
  const upcoming = [...orders]
    .filter((o) => o.stage !== "delivered")
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

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
        <div
          className="flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(18,60,74,0.08)", color: palette.primary }}
        >
          <CalendarDays size={20} strokeWidth={1.9} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{t.tabs.calendar}</div>
          <div style={{ fontSize: 12.5, color: palette.muted }}>{t.calendarSoon}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {upcoming.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between gap-3"
            style={{ backgroundColor: palette.bg, borderRadius: 14, border: `1px solid ${palette.border}`, padding: "12px 14px" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{
                  width: 52,
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: palette.surface,
                  border: `1px solid ${palette.border}`,
                  color: palette.primary,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{o.deliveryDate.slice(8)}</span>
                <span style={{ fontSize: 10, color: palette.muted }}>{o.deliveryDate.slice(0, 7)}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ direction: "ltr", fontSize: 13, fontWeight: 800, color: palette.primary }}>
                    #{o.number}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: palette.text }}>{o.customer[lang]}</span>
                </div>
                <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                  {productLabels[o.product][lang]} · {o.quantity} {lang === "ar" ? "قطعة" : "pcs"}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color:
                  o.deadline === "late" ? "#b46a66" : o.deadline === "near" ? "#a87d3c" : "#4d8a6a",
              }}
            >
              {t.delivery}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
