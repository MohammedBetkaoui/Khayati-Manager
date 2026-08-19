import { CalendarRange, Plus, RotateCcw, Search } from "lucide-react";
import { useLanguage } from "../../language-context";
import {
  palette,
  priorityLabels,
  productionText,
  statusFlow,
  statusLabels,
  type OrderPriorityCode,
  type OrderStatusCode,
} from "../../pages/production-data";
import { Button, Select } from "../kit";

export type OrderFilters = {
  search: string;
  status: OrderStatusCode | "ALL";
  priority: OrderPriorityCode | "ALL";
  deliveryDate: string;
};

export function ActionBar({
  filters,
  onChange,
  onAdd,
}: {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  onAdd: () => void;
}) {
  const { lang } = useLanguage();
  const text = productionText[lang].filters;
  const setFilter = <K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div
      className="flex flex-col gap-3 lg:flex-row lg:items-center"
      style={{
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 18,
        boxShadow: "0 8px 24px -22px rgba(18,60,74,.4)",
        padding: 14,
      }}
    >
      <div className="relative min-w-[240px] flex-1">
        <Search
          size={17}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2"
          style={{ insetInlineStart: 13, color: palette.muted }}
        />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => setFilter("search", event.target.value)}
          placeholder={text.search}
          aria-label={text.search}
          className="outline-none"
          style={{
            width: "100%",
            height: 42,
            borderRadius: 12,
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.bg,
            color: palette.text,
            paddingInline: 40,
            fontSize: 13.5,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <div className="min-w-[150px]">
          <Select
            value={filters.status}
            aria-label={text.allStatus}
            onChange={(event) =>
              setFilter("status", event.target.value as OrderFilters["status"])
            }
          >
            <option value="ALL">{text.allStatus}</option>
            {statusFlow.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status][lang]}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[150px]">
          <Select
            value={filters.priority}
            aria-label={text.allPriority}
            onChange={(event) =>
              setFilter(
                "priority",
                event.target.value as OrderFilters["priority"],
              )
            }
          >
            <option value="ALL">{text.allPriority}</option>
            <option value="NORMAL">{priorityLabels.NORMAL[lang]}</option>
            <option value="URGENT">{priorityLabels.URGENT[lang]}</option>
          </Select>
        </div>
        <div className="relative min-w-[165px]">
          <CalendarRange
            size={16}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{ insetInlineStart: 12, color: palette.muted }}
          />
          <input
            type="date"
            value={filters.deliveryDate}
            onChange={(event) => setFilter("deliveryDate", event.target.value)}
            aria-label={text.deliveryDate}
            className="outline-none"
            style={{
              width: "100%",
              height: 40,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              color: filters.deliveryDate ? palette.text : palette.muted,
              paddingInlineStart: 36,
              paddingInlineEnd: 10,
              fontSize: 13,
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() =>
            onChange({
              search: "",
              status: "ALL",
              priority: "ALL",
              deliveryDate: "",
            })
          }
        >
          <RotateCcw size={16} />
          <span className="hidden xl:inline">{text.reset}</span>
        </Button>
        <Button variant="primary" onClick={onAdd}>
          <Plus size={17} />
          {text.add}
        </Button>
      </div>
    </div>
  );
}
