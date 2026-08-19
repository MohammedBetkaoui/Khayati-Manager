import { useEffect, useState } from "react";
import { useLanguage } from "../../language-context";
import { fetchJson } from "../../lib/api";
import { palette, type MaterialOption } from "../../pages/production-data";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function LinkMaterialsModal({
  open,
  onClose,
  orderId,
  materials,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number | null;
  materials: MaterialOption[];
  onSaved: () => void | Promise<void>;
}) {
  const { lang } = useLanguage();
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected =
    materials.find((material) => String(material.id) === materialId) ?? null;
  const total = Number(quantity || 0) * (selected?.unitPrice ?? 0);
  const labels =
    lang === "ar"
      ? {
          title:
            "\u0625\u0636\u0627\u0641\u0629 \u0645\u0627\u062f\u0629 \u0644\u0644\u0637\u0644\u0628\u064a\u0629",
          material: "\u0627\u0644\u0645\u0627\u062f\u0629",
          quantity:
            "\u0627\u0644\u0643\u0645\u064a\u0629 \u0627\u0644\u0645\u0633\u062a\u0639\u0645\u0644\u0629",
          unit: "\u0627\u0644\u0648\u062d\u062f\u0629",
          available: "\u0627\u0644\u0645\u062a\u0648\u0641\u0631",
          total: "\u0627\u0644\u062a\u0643\u0644\u0641\u0629",
          notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
          cancel: "\u0625\u0644\u063a\u0627\u0621",
          save: "\u062e\u0635\u0645 \u0627\u0644\u0645\u0627\u062f\u0629",
        }
      : {
          title: "Ajouter une mati\u00e8re",
          material: "Mati\u00e8re",
          quantity: "Quantit\u00e9 utilis\u00e9e",
          unit: "Unit\u00e9",
          available: "Disponible",
          total: "Co\u00fbt",
          notes: "Notes",
          cancel: "Annuler",
          save: "D\u00e9duire la mati\u00e8re",
        };

  useEffect(() => {
    if (!open) return;
    setMaterialId(materials[0] ? String(materials[0].id) : "");
    setQuantity("");
    setNotes("");
    setError(null);
  }, [materials, open]);

  async function submit() {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/orders/${orderId}/materials`, {
        method: "POST",
        body: JSON.stringify({
          inventoryItemId: Number(materialId),
          quantityUsed: Number(quantity),
          notes: notes || undefined,
        }),
      });
      await onSaved();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add material",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={labels.title}
      maxWidth={500}
    >
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={labels.material}>
            <Select
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.quantity} {material.unit})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={labels.quantity}>
          <TextInput
            required
            min="0.01"
            step="0.01"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label={labels.unit}>
          <TextInput
            readOnly
            value={selected?.unit ?? "-"}
            style={{ backgroundColor: palette.bg }}
          />
        </Field>
        <Field label={labels.available}>
          <TextInput
            readOnly
            value={selected ? `${selected.quantity} ${selected.unit}` : "-"}
            style={{ backgroundColor: palette.bg }}
          />
        </Field>
        <Field label={labels.total}>
          <TextInput
            readOnly
            value={`${total.toLocaleString()} DA`}
            style={{
              backgroundColor: palette.bg,
              color: palette.primary,
              fontWeight: 800,
            }}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={labels.notes}>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
            disabled={
              submitting || !materialId || Number(quantity) <= 0 || !orderId
            }
          >
            {labels.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
