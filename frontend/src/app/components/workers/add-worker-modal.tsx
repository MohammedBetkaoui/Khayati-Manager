import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import {
  roleLabels,
  salaryLabels,
  statusLabels,
  workersText,
  type RoleId,
  type SalaryId,
  type StatusId,
} from "../../pages/workers-data";

export type AddWorkerForm = {
  name: string;
  phone: string;
  role: RoleId;
  startDate: string;
  salaryType: SalaryId;
  salaryRate: string;
  notes: string;
  status: StatusId;
};

const initialForm: AddWorkerForm = {
  name: "",
  phone: "",
  role: "tailor",
  startDate: "",
  salaryType: "daily",
  salaryRate: "",
  notes: "",
  status: "active",
};

export function AddWorkerModal({
  open,
  onClose,
  onSubmit,
  initialValues,
  isSaving = false,
  mode = "create",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (form: AddWorkerForm) => void | Promise<void>;
  initialValues?: AddWorkerForm | null;
  isSaving?: boolean;
  mode?: "create" | "edit";
}) {
  const { lang, dir } = useLanguage();
  const t = workersText[lang].modal;

  const [form, setForm] = useState<AddWorkerForm>(initialValues ?? initialForm);

  useEffect(() => {
    if (open) {
      setForm(initialValues ?? initialForm);
    }
  }, [open, initialValues]);

  if (!open) return null;

  const modalTitle =
    mode === "edit"
      ? lang === "ar"
        ? "تعديل بيانات العامل"
        : "Modifier les données"
      : t.title;

  const submitLabel =
    mode === "edit"
      ? lang === "ar"
        ? "حفظ التعديلات"
        : "Enregistrer les modifications"
      : t.save;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(18,60,74,0.28)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: palette.surface,
          borderRadius: 22,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 30px 70px -30px rgba(18,60,74,0.5)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{modalTitle}</h2>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{ width: 34, height: 34, borderRadius: 10, color: palette.muted, border: `1px solid ${palette.border}` }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit?.(form);
            if (mode === "create") setForm(initialForm);
            onClose();
          }}
        >
          <div className="sm:col-span-2">
            <Field label={t.fullName}>
              <TextInput
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={lang === "ar" ? "مثال: فاطمة زهراء" : "Ex : Fatima Zohra"}
              />
            </Field>
          </div>

          <Field label={t.phone}>
            <TextInput
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0X XX XX XX XX"
              style={{ direction: "ltr" }}
            />
          </Field>

          <Field label={t.role}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleId })}>
              {(Object.keys(roleLabels) as RoleId[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r][lang]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.startDate}>
            <TextInput required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>

          <Field label={t.salaryType}>
            <Select value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value as SalaryId })}>
              {(Object.keys(salaryLabels) as SalaryId[]).map((s) => (
                <option key={s} value={s}>
                  {salaryLabels[s][lang]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.salaryRate}>
            <TextInput
              value={form.salaryRate}
              onChange={(e) => setForm({ ...form, salaryRate: e.target.value })}
              placeholder={lang === "ar" ? "مثال: 45 د.ج / قطعة" : "Ex : 45 DA / pièce"}
            />
          </Field>

          <Field label={t.status}>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusId })}>
              {(Object.keys(statusLabels) as StatusId[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s][lang]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label={t.notes}>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="outline-none"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: `1px solid ${palette.border}`,
                  backgroundColor: palette.surface,
                  color: palette.text,
                  fontSize: 14,
                  padding: "10px 14px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </Field>
          </div>

          <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
            <Button variant="secondary" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {isSaving ? (lang === "ar" ? "جاري الحفظ..." : "Enregistrement...") : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
