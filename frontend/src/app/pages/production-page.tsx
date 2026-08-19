import { useDeferredValue, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router";
import {
  ActionBar,
  type OrderFilters,
} from "../components/production/action-bar";
import { AddOrderModal } from "../components/production/add-order-modal";
import { ChangeStageModal } from "../components/production/change-stage-modal";
import { OrdersTable } from "../components/production/orders-table";
import { SummaryCards } from "../components/production/summary-cards";
import { PageBackground } from "../components/page-background";
import { useLanguage } from "../language-context";
import {
  asRecord,
  fetchJson,
  getArrayFromPayload,
  getNumber,
  getText,
} from "../lib/api";
import {
  mapDashboard,
  mapOrder,
  palette,
  productionText,
  type CustomerOption,
  type DashboardStats,
  type OrderListItem,
  type WorkerOption,
} from "./production-data";

const emptyStats: DashboardStats = {
  newOrders: 0,
  inProduction: 0,
  ready: 0,
  late: 0,
  monthlyCost: 0,
};
const initialFilters: OrderFilters = {
  search: "",
  status: "ALL",
  priority: "ALL",
  deliveryDate: "",
};

export function ProductionPage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const text = productionText[lang];
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const deferredSearch = useDeferredValue(filters.search);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderListItem | null>(null);
  const [statusOrder, setStatusOrder] = useState<OrderListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadResources() {
      try {
        const [customersPayload, workersPayload] = await Promise.all([
          fetchJson<unknown>(
            "/sales/customers?limit=100&sortBy=fullName&sortOrder=ASC",
          ),
          fetchJson<unknown>(
            "/workers?limit=100&sortBy=fullName&sortOrder=ASC",
          ),
        ]);
        if (cancelled) return;
        setCustomers(
          getArrayFromPayload(customersPayload).map((item) => {
            const row = asRecord(item);
            return {
              id: getNumber(row?.id),
              fullName: getText(row?.fullName),
              phone: getText(row?.phone),
            };
          }),
        );
        setWorkers(
          getArrayFromPayload(workersPayload).map((item) => {
            const row = asRecord(item);
            return {
              id: getNumber(row?.id),
              fullName: getText(row?.fullName),
              role: getText(row?.role),
            };
          }),
        );
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load resources",
          );
      }
    }
    void loadResources();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const payload = await fetchJson<unknown>("/orders/dashboard");
        if (!cancelled) setStats(mapDashboard(payload));
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load dashboard",
          );
      }
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({ page: String(page), limit: "10" });
      if (deferredSearch.trim()) query.set("search", deferredSearch.trim());
      if (filters.status !== "ALL") query.set("status", filters.status);
      if (filters.priority !== "ALL") query.set("priority", filters.priority);
      if (filters.deliveryDate) query.set("deliveryDate", filters.deliveryDate);
      try {
        const payload = await fetchJson<unknown>(`/orders?${query.toString()}`);
        if (cancelled) return;
        const record = asRecord(payload);
        const pagination = asRecord(record?.pagination);
        setOrders(getArrayFromPayload(payload).map(mapOrder));
        setTotal(getNumber(pagination?.total));
        setTotalPages(getNumber(pagination?.totalPages));
      } catch (reason) {
        if (cancelled) return;
        setOrders([]);
        setError(
          reason instanceof Error ? reason.message : "Unable to load orders",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [
    deferredSearch,
    filters.deliveryDate,
    filters.priority,
    filters.status,
    page,
    reloadKey,
  ]);

  function updateFilters(next: OrderFilters) {
    setFilters(next);
    setPage(1);
  }

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  async function deleteOrder(order: OrderListItem) {
    if (!window.confirm(text.actions.confirmDelete)) return;
    try {
      await fetchJson(`/orders/${order.id}`, { method: "DELETE" });
      if (orders.length === 1 && page > 1) setPage((current) => current - 1);
      else refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete order",
      );
    }
  }

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const PreviousIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <PageBackground>
      <header className="flex flex-wrap items-start justify-between gap-4 pt-2">
        <div className="flex items-start gap-4">
          <button
            type="button"
            aria-label={text.home}
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center justify-center transition-transform hover:-translate-y-0.5"
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
            <div style={{ color: palette.muted, fontSize: 12.5 }}>
              {text.home} /{" "}
              <span style={{ color: palette.primary, fontWeight: 700 }}>
                {text.breadcrumb}
              </span>
            </div>
            <h1
              className="mt-1"
              style={{ color: palette.text, fontSize: 25, fontWeight: 850 }}
            >
              {text.title}
            </h1>
            <p
              className="mt-1 max-w-[760px]"
              style={{ color: palette.muted, fontSize: 13.5 }}
            >
              {text.subtitle}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <SummaryCards stats={stats} />
      </div>
      <div className="mt-5">
        <ActionBar
          filters={filters}
          onChange={updateFilters}
          onAdd={() => {
            setEditingOrder(null);
            setAddOpen(true);
          }}
        />
      </div>

      {error ? (
        <div
          className="mt-4 rounded-xl border px-4 py-3"
          style={{
            borderColor: "rgba(180,106,102,.28)",
            backgroundColor: "rgba(180,106,102,.08)",
            color: "#9f5652",
            fontSize: 12.5,
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        className="mt-5 overflow-hidden pb-2"
        style={{
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 20,
          boxShadow: "0 12px 32px -28px rgba(18,60,74,.5)",
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${palette.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "rgba(18,60,74,.08)",
                color: palette.primary,
              }}
            >
              <ClipboardList size={19} />
            </div>
            <div>
              <h2
                style={{ color: palette.text, fontSize: 15, fontWeight: 800 }}
              >
                {text.listTitle}
              </h2>
              <p style={{ color: palette.muted, fontSize: 11.5 }}>
                {text.listHint}
              </p>
            </div>
          </div>
          <div style={{ color: palette.muted, fontSize: 12 }}>
            {total}{" "}
            {lang === "ar" ? "\u0637\u0644\u0628\u064a\u0629" : "commande(s)"}
          </div>
        </div>

        <div
          style={{
            opacity: loading ? 0.55 : 1,
            transition: "opacity .18s ease",
          }}
        >
          <OrdersTable
            rows={orders}
            onView={(order) => navigate(`/production/${order.id}`)}
            onEdit={(order) => {
              setEditingOrder(order);
              setAddOpen(true);
            }}
            onChangeStatus={setStatusOrder}
            onDelete={(order) => {
              void deleteOrder(order);
            }}
          />
        </div>

        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: `1px solid ${palette.border}` }}
        >
          <span style={{ color: palette.muted, fontSize: 11.5 }}>
            {page} / {Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="flex items-center justify-center disabled:opacity-35"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: `1px solid ${palette.border}`,
                color: palette.primary,
              }}
            >
              <PreviousIcon size={16} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="flex items-center justify-center disabled:opacity-35"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: `1px solid ${palette.border}`,
                color: palette.primary,
              }}
            >
              <NextIcon size={16} />
            </button>
          </div>
        </div>
      </section>

      <AddOrderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        customers={customers}
        order={editingOrder}
        onSaved={refresh}
      />
      <ChangeStageModal
        open={Boolean(statusOrder)}
        onClose={() => setStatusOrder(null)}
        order={statusOrder}
        workers={workers}
        onSaved={refresh}
      />
    </PageBackground>
  );
}
