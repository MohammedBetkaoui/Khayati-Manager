import { useState } from "react";
import { palette, prodText, materialOptions } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function LinkMaterialsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = prodText[lang].linkModal;
  const cur = prodText[lang].currency;

  const [form, setForm] = useState({
    materialIndex: 0,
    qty: "",
    notes: "",
  });

  const material = materialOptions[form.materialIndex];
  const qty = parseFloat(form.qty) || 0;
  const total = qty * material.unitCost;

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={520}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={t.material}>
            <Select
              value={String(form.materialIndex)}
              onChange={(e) => setForm({ ...form, materialIndex: Number(e.target.value) })}
            >
              {materialOptions.map((m, i) => (
                <option key={m.name.ar} value={i}>
                  {m.name[lang]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t.qty}>
          <TextInput
            type="number"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
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
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
