import { useState } from "react";
import { Search, Plus, Download, CalendarDays, Filter, CalendarRange } from "lucide-react";
import { palette, prodText, productLabels, stageLabels, priorityLabels, stageOrder, type Bilingual } from "../../pages/production-data";
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
  workers,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onAdd: () => void;
  onCalendar: () => void;
  workers: Bilingual[];
}) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-3">
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

      {showFilters ? (
        <div
          className="animate-in slide-in-from-top-2 fade-in flex flex-wrap items-center gap-3 duration-200"
          style={{
            backgroundColor: palette.surface,
            borderRadius: 18,
            border: `1px solid ${palette.border}`,
            boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
            padding: 14,
          }}
        >
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={17}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ insetInlineStart: 12, color: palette.muted }}
            />
            <input
              value={filters.query}
              onChange={(event) => set("query", event.target.value)}
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
            <Select value={filters.product} onChange={(event) => set("product", event.target.value as Filters["product"])}>
              <option value="all">{t.allProducts}</option>
              {(Object.keys(productLabels) as ProductType[]).map((product) => (
                <option key={product} value={product}>
                  {productLabels[product][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[150px]">
            <Select value={filters.stage} onChange={(event) => set("stage", event.target.value as Filters["stage"])}>
              <option value="all">{t.allStages}</option>
              {stageOrder.map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabels[stage][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[160px]">
            <Select value={filters.worker} onChange={(event) => set("worker", event.target.value)}>
              <option value="all">{t.allWorkers}</option>
              {workers.map((worker) => (
                <option key={worker.ar} value={worker.ar}>
                  {worker[lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[140px]">
            <Select value={filters.priority} onChange={(event) => set("priority", event.target.value as Filters["priority"])}>
              <option value="all">{t.allPriorities}</option>
              {(Object.keys(priorityLabels) as Priority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority][lang]}
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
                onChange={(event) => set("date", event.target.value)}
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
      ) : null}
    </div>
  );
}
