import { useState } from "react";
import { X } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import {
  movementLabels,
  stockText,
  type Material,
  type MovementType,
} from "../../pages/stock-data";

export function StockMovementModal({
  open,
  onClose,
  materialId,
  materials = [],
}: {
  open: boolean;
  onClose: () => void;
  materialId?: string | null;
  materials?: Material[];
}) {
  const { lang, dir } = useLanguage();
  const t = stockText[lang].moveModal;

  const [form, setForm] = useState({
    material: materialId ?? (materials[0]?.id ?? ""),
    type: "in" as MovementType,
    quantity: "",
    date: "",
    reason: "",
    order: "",
    notes: "",
  });

  // Keep the selected material in sync when opened from a row action.
  if (open && materialId && form.material !== materialId) {
    setForm((f) => ({ ...f, material: materialId }));
  }

  if (!open) return null;

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
          maxWidth: 520,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>{t.title}</h2>
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
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          <div className="sm:col-span-2">
            <Field label={t.material}>
              <Select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name[lang]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t.type}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MovementType })}>
              {(Object.keys(movementLabels) as MovementType[]).map((mt) => (
                <option key={mt} value={mt}>
                  {movementLabels[mt][lang]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.quantity}>
            <TextInput
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0"
            />
          </Field>

          <Field label={t.date}>
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>

          <Field label={t.linkedOrder}>
            <TextInput
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              placeholder={t.linkedOrderPh}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t.reason}>
              <TextInput
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder={lang === "ar" ? "مثال: قص قمصان" : "Ex : Coupe chemises"}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label={t.notes}>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
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
              {t.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
