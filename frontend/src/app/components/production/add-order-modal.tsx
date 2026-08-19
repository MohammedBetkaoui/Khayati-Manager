import { useState } from "react";
import { prodText, productLabels, priorityLabels } from "../../pages/production-data";
import type { ProductType, Priority } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function AddOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = prodText[lang].addModal;

  const [form, setForm] = useState({
    customer: "",
    phone: "",
    product: "shirt" as ProductType,
    quantity: "",
    sizes: "",
    color: "",
    received: "",
    delivery: "",
    priority: "normal" as Priority,
    price: "",
    notes: "",
  });

  return (
    <ModalShell open={open} onClose={onClose} title={t.title}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <Field label={t.customer}>
          <TextInput
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
            placeholder={lang === "ar" ? "مثال: سعاد مرزوق" : "Ex : Souad Merzouk"}
          />
        </Field>

        <Field label={t.phone}>
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0661 00 00 00"
            style={{ direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}
          />
        </Field>

        <Field label={t.product}>
          <Select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value as ProductType })}>
            {(Object.keys(productLabels) as ProductType[]).map((p) => (
              <option key={p} value={p}>
                {productLabels[p][lang]}
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

        <Field label={t.sizes}>
          <TextInput
            value={form.sizes}
            onChange={(e) => setForm({ ...form, sizes: e.target.value })}
            placeholder={lang === "ar" ? "مثال: M / L" : "Ex : M / L"}
          />
        </Field>

        <Field label={t.color}>
          <TextInput
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            placeholder={lang === "ar" ? "مثال: أزرق داكن" : "Ex : Bleu foncé"}
          />
        </Field>

        <Field label={t.received}>
          <TextInput type="date" value={form.received} onChange={(e) => setForm({ ...form, received: e.target.value })} />
        </Field>

        <Field label={t.delivery}>
          <TextInput type="date" value={form.delivery} onChange={(e) => setForm({ ...form, delivery: e.target.value })} />
        </Field>

        <Field label={t.priority}>
          <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            {(Object.keys(priorityLabels) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {priorityLabels[p][lang]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.price}>
          <TextInput
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder={lang === "ar" ? "بالدينار" : "en DA"}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
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
