import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import {
  categoryLabels,
  stockText,
  unitLabels,
  type CategoryId,
  type UnitId,
} from "../../pages/stock-data";

export type AddMaterialForm = {
  name: string;
  category: CategoryId;
  color: string;
  type: string;
  quantity: string;
  unit: UnitId;
  unitPrice: string;
  supplier: string;
  minAlert: string;
  notes: string;
};

const initialForm: AddMaterialForm = {
  name: "",
  category: "fabrics",
  color: "",
  type: "",
  quantity: "",
  unit: "meter",
  unitPrice: "",
  supplier: "",
  minAlert: "",
  notes: "",
};

export function AddMaterialModal({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  isSaving = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (form: AddMaterialForm) => void | Promise<void>;
  initialValues?: AddMaterialForm | null;
  mode?: "create" | "edit";
  isSaving?: boolean;
}) {
  const { lang, dir } = useLanguage();
  const t = stockText[lang].addModal;

  const [form, setForm] = useState<AddMaterialForm>(initialForm);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialValues ?? initialForm);
      setSubmitError(null);
    }
  }, [open, initialValues]);

  if (!open) return null;

  const modalTitle =
    mode === "edit"
      ? lang === "ar"
        ? "تعديل المادة"
        : "Modifier la matière"
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

        <form
          className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError(null);

            try {
              await onSubmit?.(form);
              setForm(initialForm);
              onClose();
            } catch (err) {
              setSubmitError(
                err instanceof Error
                  ? err.message
                  : lang === "ar"
                    ? "تعذّر حفظ المادة"
                    : "Impossible d'enregistrer la matière",
              );
            }
          }}
        >
          <div className="sm:col-span-2">
            <Field label={t.name}>
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={lang === "ar" ? "مثال: قماش قطني أبيض" : "Ex : Tissu coton blanc"}
              />
            </Field>
          </div>

          <Field label={t.category}>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CategoryId })}>
              {(Object.keys(categoryLabels) as CategoryId[]).map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c][lang]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.color}>
            <TextInput
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder={lang === "ar" ? "مثال: أزرق داكن" : "Ex : Bleu foncé"}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t.type}>
              <TextInput
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder={lang === "ar" ? "مثال: قطن 100٪ عرض 1.5م" : "Ex : Coton 100% largeur 1.5m"}
              />
            </Field>
          </div>

          <Field label={t.initialQty}>
            <TextInput
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0"
            />
          </Field>

          <Field label={t.unit}>
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as UnitId })}>
              {(Object.keys(unitLabels) as UnitId[]).map((u) => (
                <option key={u} value={u}>
                  {unitLabels[u][lang]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.unitPrice}>
            <TextInput
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              placeholder={lang === "ar" ? "بالدينار" : "en DA"}
            />
          </Field>

          <Field label={t.minAlert}>
            <TextInput
              type="number"
              value={form.minAlert}
              onChange={(e) => setForm({ ...form, minAlert: e.target.value })}
              placeholder="0"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t.supplier}>
              <TextInput
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder={lang === "ar" ? "مثال: نسيج الأطلس" : "Ex : Nassij El Atlas"}
              />
            </Field>
          </div>

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

          {submitError && (
            <p className="sm:col-span-2" style={{ marginTop: -6, fontSize: 12.5, color: palette.rose }}>
              {submitError}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? (lang === "ar" ? "جاري الحفظ..." : "Enregistrement...") : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
