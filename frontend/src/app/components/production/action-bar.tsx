import { useState } from "react";
import { Search, Plus, Download, CalendarDays, Filter, CalendarRange } from "lucide-react";
import { palette, prodText, productLabels, stageLabels, priorityLabels, workerRoster, stageOrder } from "../../pages/production-data";
import type { ProductType, StageId, Priority } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Select } from "../kit";

export type Filters = {
  query: string;
  product: ProductType | "all";
  stage: StageId | "all";
  worker: string | "all";
  priority: Priority | "all";
  date: string;
};

export function ActionBar({
  filters,
  onChange,
  onAdd,
  onCalendar,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onAdd: () => void;
  onCalendar: () => void;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: filter toggle + primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Button variant={showFilters ? "secondary" : "ghost"} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={17} />
          {t.filtersToggle}
        </Button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" onClick={() => {}}>
            <Download size={17} />
            {t.export}
          </Button>
          <Button variant="secondary" onClick={onCalendar}>
            <CalendarDays size={17} />
            {t.calendar}
          </Button>
          <Button variant="primary" onClick={onAdd}>
            <Plus size={18} />
            {t.addOrder}
          </Button>
        </div>
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div
          className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: palette.surface,
            borderRadius: 18,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
            padding: 14,
          }}
        >
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={17}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ insetInlineStart: 12, color: palette.muted }}
            />
            <input
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder={t.search}
              className="outline-none"
              style={{
                height: 40,
                width: "100%",
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.bg,
                color: palette.text,
                fontSize: 14,
                padding: "0 14px",
                paddingInlineStart: 38,
              }}
            />
          </div>

          <div className="w-[150px]">
            <Select value={filters.product} onChange={(e) => set("product", e.target.value as Filters["product"])}>
              <option value="all">{t.allProducts}</option>
              {(Object.keys(productLabels) as ProductType[]).map((p) => (
                <option key={p} value={p}>
                  {productLabels[p][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[150px]">
            <Select value={filters.stage} onChange={(e) => set("stage", e.target.value as Filters["stage"])}>
              <option value="all">{t.allStages}</option>
              {stageOrder.map((s) => (
                <option key={s} value={s}>
                  {stageLabels[s][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[160px]">
            <Select value={filters.worker} onChange={(e) => set("worker", e.target.value)}>
              <option value="all">{t.allWorkers}</option>
              {workerRoster.map((w) => (
                <option key={w.ar} value={w.ar}>
                  {w[lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[140px]">
            <Select value={filters.priority} onChange={(e) => set("priority", e.target.value as Filters["priority"])}>
              <option value="all">{t.allPriorities}</option>
              {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[160px]">
            <div className="relative">
              <CalendarRange
                size={16}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                style={{ insetInlineStart: 12, color: palette.muted }}
              />
              <input
                type="date"
                value={filters.date}
                onChange={(e) => set("date", e.target.value)}
                title={t.dateLabel}
                className="outline-none"
                style={{
                  height: 40,
                  width: "100%",
                  borderRadius: 12,
                  border: `1px solid ${palette.border}`,
                  backgroundColor: palette.bg,
                  color: filters.date ? palette.text : palette.muted,
                  fontSize: 14,
                  padding: "0 14px",
                  paddingInlineStart: 36,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
