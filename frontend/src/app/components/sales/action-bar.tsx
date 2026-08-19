import { Search, Plus, CreditCard, Download, Printer } from "lucide-react";
import { palette, salesText } from "../../pages/sales-data";
import { useLanguage } from "../../language-context";
import { Button, TextInput } from "../kit";

export type Filters = {
  query: string;
  status: string;
  method: string;
  date: string;
};

export function ActionBar({
  filters,
  onChange,
  onAdd,
  onPayment,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onAdd: () => void;
  onPayment: () => void;
}) {
  const { lang } = useLanguage();
  const t = salesText[lang].actions;

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
        <div className="relative" style={{ width: 240 }}>
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
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allStatus}</option>
          <option value="paid">{salesText[lang].tabs.paid}</option>
          <option value="partial">{salesText[lang].tabs.partial}</option>
          <option value="unpaid">{salesText[lang].tabs.unpaid}</option>
        </select>

        <select
          value={filters.method}
          onChange={(e) => onChange({ ...filters, method: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allMethods}</option>
          <option value="cash">{lang === "ar" ? "نقداً" : "Espèces"}</option>
          <option value="transfer">{lang === "ar" ? "تحويل" : "Virement"}</option>
          <option value="check">{lang === "ar" ? "صك" : "Chèque"}</option>
        </select>

        <select
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
          style={selectStyle}
        >
          <option value="all">{t.allDates}</option>
          <option value="today">{t.today}</option>
          <option value="week">{t.thisWeek}</option>
          <option value="month">{t.thisMonth}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => {}}>
          <Printer size={16} />
          {t.print}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Download size={16} />
          {t.export}
        </Button>
        <Button variant="secondary" onClick={onPayment}>
          <CreditCard size={16} />
          {t.recordPayment}
        </Button>
        <Button variant="primary" onClick={onAdd}>
          <Plus size={16} />
          {t.addInvoice}
        </Button>
      </div>
    </div>
  );
}
