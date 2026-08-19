import { useState } from "react";
import { Search, Plus, Download, CalendarCheck, CalendarRange, Filter } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button, Select } from "../kit";
import {
  roleLabels,
  salaryLabels,
  statusLabels,
  workersText,
  type RoleId,
  type SalaryId,
  type StatusId,
} from "../../pages/workers-data";

export type Filters = {
  query: string;
  role: RoleId | "all";
  salary: SalaryId | "all";
  status: StatusId | "all";
  period: string;
};

export function ActionBar({
  filters,
  onChange,
  onAdd,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onAdd: () => void;
}) {
  const { lang } = useLanguage();
  const t = workersText[lang];
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Top row with primary actions and filter toggle */}
      <div className="flex items-center justify-between">
        <Button variant={showFilters ? "secondary" : "ghost"} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={17} />
          {lang === "ar" ? "تصفية وبحث" : "Filtrer et rechercher"}
        </Button>

        <div className="flex items-center gap-2.5">
          <Button variant="ghost" onClick={() => {}}>
            <CalendarCheck size={17} />
            {t.markToday}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Download size={17} />
            {t.export}
          </Button>
          <Button variant="primary" onClick={onAdd}>
            <Plus size={18} />
            {t.addWorker}
          </Button>
        </div>
      </div>

      {/* Filter and search section */}
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
            <Select value={filters.role} onChange={(e) => set("role", e.target.value as Filters["role"])}>
              <option value="all">{t.allRoles}</option>
              {(Object.keys(roleLabels) as RoleId[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[150px]">
            <Select value={filters.salary} onChange={(e) => set("salary", e.target.value as Filters["salary"])}>
              <option value="all">{t.allSalary}</option>
              {(Object.keys(salaryLabels) as SalaryId[]).map((s) => (
                <option key={s} value={s}>
                  {salaryLabels[s][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[140px]">
            <Select value={filters.status} onChange={(e) => set("status", e.target.value as Filters["status"])}>
              <option value="all">{t.allStatus}</option>
              {(Object.keys(statusLabels) as StatusId[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s][lang]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-[150px]">
            <div className="relative">
              <CalendarRange
                size={16}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                style={{ insetInlineStart: 12, color: palette.muted }}
              />
              <Select value={filters.period} onChange={(e) => set("period", e.target.value)}>
                <option value="week">{lang === "ar" ? "هذا الأسبوع" : "Cette semaine"}</option>
                <option value="month">{lang === "ar" ? "هذا الشهر" : "Ce mois"}</option>
                <option value="quarter">{lang === "ar" ? "هذا الفصل" : "Ce trimestre"}</option>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
