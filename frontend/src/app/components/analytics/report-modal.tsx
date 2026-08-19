import { palette, analyticsText } from "../../pages/analytics-data";
import { useLanguage } from "../../language-context";
import { Button, Field } from "../kit";
import { ModalShell } from "../production/modal-shell";

export function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = analyticsText[lang].modals.report;

  const selectStyle = {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.surface,
    fontSize: 13.5,
    outline: "none",
    width: "100%"
  };

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={540}>
      <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
        <Field label={t.type}>
          <select style={selectStyle}>
            <option value="sales">{t.types.sales}</option>
            <option value="profits">{t.types.profits}</option>
            <option value="expenses">{t.types.expenses}</option>
            <option value="workers">{t.types.workers}</option>
            <option value="stock">{t.types.stock}</option>
            <option value="orders">{t.types.orders}</option>
            <option value="full">{t.types.full}</option>
          </select>
        </Field>

        <Field label={t.period}>
          <select style={selectStyle}>
            <option value="month">{analyticsText[lang].actions.thisMonth}</option>
            <option value="year">{analyticsText[lang].actions.thisYear}</option>
            <option value="custom">...</option>
          </select>
        </Field>

        <Field label={t.section}>
          <select style={selectStyle}>
            <option value="all">الكل</option>
            <option value="sewing">الخياطة</option>
            <option value="cutting">القص</option>
          </select>
        </Field>

        <Field label={t.display}>
          <select style={selectStyle}>
            <option value="summary">{t.displays.summary}</option>
            <option value="detailed">{t.displays.detailed}</option>
            <option value="charts">{t.displays.charts}</option>
            <option value="table">{t.displays.table}</option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.format}>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="format" defaultChecked /> PDF
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="format" /> Excel
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="format" /> طباعة
              </label>
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 sm:col-span-2 mt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t.preview}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
