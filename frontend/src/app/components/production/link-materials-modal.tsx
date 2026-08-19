import { useEffect, useState } from "react";
import { palette, prodText, type Bilingual } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

type MaterialOption = {
  name: Bilingual;
  unit: Bilingual;
  unitCost: number;
};

export function LinkMaterialsModal({
  open,
  onClose,
  materials,
}: {
  open: boolean;
  onClose: () => void;
  materials: MaterialOption[];
}) {
  const { lang } = useLanguage();
  const t = prodText[lang].linkModal;
  const cur = prodText[lang].currency;

  const [form, setForm] = useState({
    materialIndex: 0,
    qty: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      materialIndex: Math.min(current.materialIndex, Math.max(0, materials.length - 1)),
    }));
  }, [materials, open]);

  const material = materials[form.materialIndex] ?? {
    name: { ar: lang === "ar" ? "لا توجد مواد" : "Aucune matiere", fr: lang === "ar" ? "لا توجد مواد" : "Aucune matiere" },
    unit: { ar: "-", fr: "-" },
    unitCost: 0,
  };
  const quantity = parseFloat(form.qty) || 0;
  const total = quantity * material.unitCost;

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={520}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={t.material}>
            <Select
              value={String(form.materialIndex)}
              onChange={(event) => setForm({ ...form, materialIndex: Number(event.target.value) })}
            >
              {materials.length === 0 ? (
                <option value="0">{lang === "ar" ? "لا توجد مواد" : "Aucune matiere"}</option>
              ) : (
                materials.map((option, index) => (
                  <option key={`${option.name.ar}-${index}`} value={index}>
                    {option.name[lang]}
                  </option>
                ))
              )}
            </Select>
          </Field>
        </div>

        <Field label={t.qty}>
          <TextInput
            type="number"
            value={form.qty}
            onChange={(event) => setForm({ ...form, qty: event.target.value })}
            placeholder="0"
          />
        </Field>

        <Field label={t.unit}>
          <TextInput value={material.unit[lang]} readOnly style={{ backgroundColor: palette.bg, color: palette.muted }} />
        </Field>

        <Field label={t.unitCost}>
          <TextInput
            value={`${material.unitCost} ${cur}`}
            readOnly
            style={{ backgroundColor: palette.bg, color: palette.muted, direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}
          />
        </Field>

        <Field label={t.total}>
          <TextInput
            value={`${total.toLocaleString()} ${cur}`}
            readOnly
            style={{ backgroundColor: "rgba(18,60,74,0.04)", color: palette.primary, fontWeight: 700, direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
        </div>

        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" type="submit">
            {t.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
