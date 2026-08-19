import { Search, Calculator, ArrowDownUp, PlusCircle, Download, Printer } from "lucide-react";
import { palette, salaryText, salaryTypeLabels, roleLabels } from "../../pages/salary-data";
import { useLanguage } from "../../language-context";
import { Button } from "../kit";

export type Filters = {
  query: string;
  type: string;
  status: string;
  role: string;
  period: string;
};

export function ActionBar({
  filters,
  onChange,
  onCalc,
  onAdvance,
  onBonus,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onCalc: () => void;
  onAdvance: () => void;
  onBonus: () => void;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang].actions;

  const selectStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.surface,
    fontSize: 13.5,
    color: palette.text,
    outline: "none",
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.12)",
        padding: "12px 16px",
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" style={{ width: 200 }}>
          <span className="absolute top-1/2 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: 12 }}>
            <Search size={16} style={{ color: palette.muted }} />
          </span>
          <input
            type="text"
            placeholder={t.search}
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            style={{
              width: "100%",
              height: 42,
              paddingInlineStart: 38,
              paddingInlineEnd: 14,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.bg,
              fontSize: 13.5,
              outline: "none",
            }}
          />
        </div>

        <select
          value={filters.period}
          onChange={(e) => onChange({ ...filters, period: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allDates}</option>
          <option value="today">{t.today}</option>
          <option value="week">{t.thisWeek}</option>
          <option value="month">{t.thisMonth}</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allTypes}</option>
          {Object.entries(salaryTypeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v[lang]}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allStatus}</option>
          <option value="paid">{salaryText[lang].tabs.paid}</option>
          <option value="unpaid">{salaryText[lang].tabs.unpaid}</option>
        </select>

        <select
          value={filters.role}
          onChange={(e) => onChange({ ...filters, role: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allRoles}</option>
          {Object.entries(roleLabels).map(([k, v]) => (
            <option key={k} value={k}>{v[lang]}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => {}}>
          <Printer size={16} />
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Download size={16} />
        </Button>
        <Button variant="secondary" onClick={onBonus}>
          <PlusCircle size={16} />
          {t.addBonus}
        </Button>
        <Button variant="secondary" onClick={onAdvance}>
          <ArrowDownUp size={16} />
          {t.addAdvance}
        </Button>
        <Button variant="primary" onClick={onCalc}>
          <Calculator size={16} />
          {t.calcSalary}
        </Button>
      </div>
    </div>
  );
}
