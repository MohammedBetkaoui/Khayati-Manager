import { useEffect, useState } from "react";
import { useLanguage } from "../../language-context";
import { fetchJson } from "../../lib/api";
import {
  priorityLabels,
  productOptions,
  type CustomerOption,
  type OrderListItem,
  type OrderPriorityCode,
} from "../../pages/production-data";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

type OrderForm = {
  customerId: string;
  productType: string;
  quantity: string;
  colors: string;
  sizes: string;
  receivedDate: string;
  deliveryDate: string;
  priority: OrderPriorityCode;
  finalPrice: string;
  notes: string;
};

function createInitialForm(order?: OrderListItem | null): OrderForm {
  return {
    customerId: order?.customerId ? String(order.customerId) : "",
    productType: order?.product ?? productOptions[0].value,
    quantity: order ? String(order.quantity) : "1",
    colors: order?.color === "-" ? "" : (order?.color ?? ""),
    sizes: order?.sizes ?? "",
    receivedDate: order?.receivedDate ?? new Date().toISOString().slice(0, 10),
    deliveryDate: order?.deliveryDate ?? "",
    priority: order?.priorityCode ?? "NORMAL",
    finalPrice: order ? String(order.finalPrice) : "",
    notes: order?.notes ?? "",
  };
}

export function AddOrderModal({
  open,
  onClose,
  customers,
  order,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
  order?: OrderListItem | null;
  onSaved: () => void | Promise<void>;
}) {
  const { lang } = useLanguage();
  const editing = Boolean(order);
  const [form, setForm] = useState<OrderForm>(() => createInitialForm(order));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels =
    lang === "ar"
      ? {
          title: editing
            ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0637\u0644\u0628\u064a\u0629"
            : "\u0637\u0644\u0628\u064a\u0629 \u062c\u062f\u064a\u062f\u0629",
          customer: "\u0627\u0644\u0632\u0628\u0648\u0646",
          product: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u062a\u062c",
          quantity: "\u0627\u0644\u0643\u0645\u064a\u0629",
          colors: "\u0627\u0644\u0644\u0648\u0646",
          sizes: "\u0627\u0644\u0645\u0642\u0627\u0633",
          received:
            "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
          delivery:
            "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
          priority: "\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629",
          price: "\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639",
          notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
          cancel: "\u0625\u0644\u063a\u0627\u0621",
          save: "\u062d\u0641\u0638",
        }
      : {
          title: editing ? "Modifier la commande" : "Nouvelle commande",
          customer: "Client",
          product: "Type de produit",
          quantity: "Quantit\u00e9",
          colors: "Couleur",
          sizes: "Taille",
          received: "Date de r\u00e9ception",
          delivery: "Date de livraison",
          priority: "Priorit\u00e9",
          price: "Prix de vente",
          notes: "Notes",
          cancel: "Annuler",
          save: "Enregistrer",
        };

  useEffect(() => {
    if (!open) return;
    const initial = createInitialForm(order);
    if (!initial.customerId && customers[0])
      initial.customerId = String(customers[0].id);
    setForm(initial);
    setError(null);
  }, [customers, open, order]);

  const setField = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        customerId: Number(form.customerId),
        productType: form.productType,
        quantity: Number(form.quantity),
        colors: form.colors || undefined,
        sizes: form.sizes || undefined,
        receivedDate: form.receivedDate || undefined,
        deliveryDate: form.deliveryDate,
        priority: form.priority,
        finalPrice: Number(form.finalPrice || 0),
        notes: form.notes || undefined,
      };
      await fetchJson(order ? `/orders/${order.id}` : "/orders", {
        method: order ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      await onSaved();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save order",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const hasCustomProduct = !productOptions.some(
    (option) => option.value === form.productType,
  );
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={labels.title}
      maxWidth={620}
    >
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={labels.customer}>
            <Select
              required
              value={form.customerId}
              onChange={(event) => setField("customerId", event.target.value)}
            >
              {customers.length === 0 ? (
                <option value="">-</option>
              ) : (
                customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName} - {customer.phone}
                  </option>
                ))
              )}
            </Select>
          </Field>
        </div>
        <Field label={labels.product}>
          <Select
            value={form.productType}
            onChange={(event) => setField("productType", event.target.value)}
          >
            {hasCustomProduct ? (
              <option value={form.productType}>{form.productType}</option>
            ) : null}
            {productOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label[lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.quantity}>
          <TextInput
            required
            min="1"
            type="number"
            value={form.quantity}
            onChange={(event) => setField("quantity", event.target.value)}
          />
        </Field>
        <Field label={labels.colors}>
          <TextInput
            value={form.colors}
            onChange={(event) => setField("colors", event.target.value)}
          />
        </Field>
        <Field label={labels.sizes}>
          <TextInput
            value={form.sizes}
            onChange={(event) => setField("sizes", event.target.value)}
            placeholder="M / L"
          />
        </Field>
        <Field label={labels.received}>
          <TextInput
            type="date"
            value={form.receivedDate}
            onChange={(event) => setField("receivedDate", event.target.value)}
          />
        </Field>
        <Field label={labels.delivery}>
          <TextInput
            required
            type="date"
            value={form.deliveryDate}
            onChange={(event) => setField("deliveryDate", event.target.value)}
          />
        </Field>
        <Field label={labels.priority}>
          <Select
            value={form.priority}
            onChange={(event) =>
              setField("priority", event.target.value as OrderPriorityCode)
            }
          >
            <option value="NORMAL">{priorityLabels.NORMAL[lang]}</option>
            <option value="URGENT">{priorityLabels.URGENT[lang]}</option>
          </Select>
        </Field>
        <Field label={labels.price}>
          <TextInput
            min="0"
            type="number"
            value={form.finalPrice}
            onChange={(event) => setField("finalPrice", event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={labels.notes}>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </Field>
        </div>
        {error ? (
          <div
            className="sm:col-span-2"
            style={{ color: "#b46a66", fontSize: 12 }}
          >
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || !form.customerId || !form.deliveryDate}
          >
            {labels.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
