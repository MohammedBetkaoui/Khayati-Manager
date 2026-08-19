import { FileText, Download, Printer, Plus } from "lucide-react";
import { palette, analyticsText } from "../../pages/analytics-data";
import { useLanguage } from "../../language-context";
import { Button } from "../kit";

export function ActionBar({
  onCreateReport,
}: {
  onCreateReport: () => void;
}) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].actions;

  const selectStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.surface,
    fontSize: 13.5,
    color: palette.text,
    outline: "none",
    minWidth: 140,
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
        <select style={selectStyle}>
          <option value="this_month">{t.thisMonth}</option>
          <option value="this_year">{t.thisYear}</option>
          <option value="all">{t.allDates}</option>
        </select>

        <select style={selectStyle}>
          <option value="all">{t.reportType}</option>
          <option value="sales">{analyticsText[lang].modals.report.types.sales}</option>
          <option value="profits">{analyticsText[lang].modals.report.types.profits}</option>
        </select>

        <select style={selectStyle}>
          <option value="all">{t.product}</option>
        </select>
        <select style={selectStyle}>
          <option value="all">{t.worker}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => {}}>
          <Printer size={16} />
          {t.print}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <Download size={16} />
          {t.exportExcel}
        </Button>
        <Button variant="secondary" onClick={() => {}}>
          <FileText size={16} />
          {t.exportPdf}
        </Button>
        <Button variant="primary" onClick={onCreateReport}>
          <Plus size={16} />
          {t.createReport}
        </Button>
      </div>
    </div>
  );
}
