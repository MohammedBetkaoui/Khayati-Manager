import { useState } from "react";
import { Search, Plus, Download, ArrowLeftRight, Filter, CalendarRange } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button, Select } from "../kit";
import {
  categoryLabels,
  statusLabels,
  stockText,
  type CategoryId,
  type StockStatus,
} from "../../pages/stock-data";

export type Filters = {
  query: string;
  category: CategoryId | "all";
  status: StockStatus | "all";
  supplier: string | "all";
  date: string;
};

export function ActionBar({
  filters,
  onChange,
  onAdd,
  onMovement,
  supplierNames = [],
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onAdd: () => void;
  onMovement: () => void;
  supplierNames?: string[];
}) {
  const { lang } = useLanguage();
  const t = stockText[lang];
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
          <Button variant="secondary" onClick={onMovement}>
            <ArrowLeftRight size={17} />
            {t.recordMovement}
          </Button>
          <Button variant="primary" onClick={onAdd}>
            <Plus size={18} />
            {t.addMaterial}
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
            <Select value={filters.category} onChange={(e) => set("category", e.target.value as Filters["category"])}>
              <option value="all">{t.allCategories}</option>
              {(Object.keys(categoryLabels) as CategoryId[]).map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[140px]">
            <Select value={filters.status} onChange={(e) => set("status", e.target.value as Filters["status"])}>
              <option value="all">{t.allStatus}</option>
              {(Object.keys(statusLabels) as StockStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[170px]">
            <Select value={filters.supplier} onChange={(e) => set("supplier", e.target.value)}>
              <option value="all">{t.allSuppliers}</option>
              {supplierNames.map((name) => (
                <option key={name} value={name}>
                  {name}
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
