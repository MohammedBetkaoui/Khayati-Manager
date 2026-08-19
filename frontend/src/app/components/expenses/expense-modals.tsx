import {
  palette,
  expensesText,
  categoryLabels,
  typeLabels,
  methodLabels,
  linkLabels,
} from "../../pages/expenses-data";
import { useLanguage } from "../../language-context";
import { Button, Field, TextInput } from "../kit";
import { ModalShell, Textarea } from "../modal-shell";

export function AddExpenseModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const t = expensesText[lang].modals.add;

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={540}>
      <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t.name}>
            <TextInput
              placeholder={
                lang === "ar" ? "اسم المصروف..." : "Nom de la dépense..."
              }
            />
          </Field>
        </div>

        <Field label={t.category}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.type}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.amount}>
          <TextInput type="number" placeholder="0" />
        </Field>
        <Field label={t.method}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            {Object.entries(methodLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.date}>
          <TextInput
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </Field>
        <Field label={t.supplier}>
          <TextInput
            placeholder={lang === "ar" ? "اسم المورد..." : "Fournisseur..."}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.linkedTo}>
            <select
              className="w-full"
              style={{
                height: 42,
                padding: "0 14px",
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.surface,
                fontSize: 13.5,
                outline: "none",
              }}
            >
              {Object.entries(linkLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[lang]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={2} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 sm:col-span-2 mt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.saveAndAdd}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function RecurringExpenseModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const t = expensesText[lang].modals.recurring;

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={540}>
      <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t.name}>
            <TextInput
              placeholder={
                lang === "ar" ? "فاتورة كراء، ماء..." : "Loyer, Eau..."
              }
            />
          </Field>
        </div>

        <Field label={t.category}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.amount}>
          <TextInput type="number" placeholder="0" />
        </Field>

        <Field label={t.freq}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            <option value="monthly">{t.freqMonthly}</option>
            <option value="weekly">{t.freqWeekly}</option>
            <option value="daily">{t.freqDaily}</option>
            <option value="needed">{t.freqAsNeeded}</option>
          </select>
        </Field>
        <Field label={t.method}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            {Object.entries(methodLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v[lang]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.startDate}>
          <TextInput
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </Field>
        <div className="flex gap-2">
          <div className="flex-1">
            <Field label={t.dueDate}>
              <TextInput type="number" placeholder="5" />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={t.alertBefore}>
              <TextInput type="number" placeholder="3" />
            </Field>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={2} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 sm:col-span-2 mt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
