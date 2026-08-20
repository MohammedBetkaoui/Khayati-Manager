import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Select, TextInput } from "./kit";
import { ModalShell, Textarea } from "./modal-shell";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { FinishedProduct, Supplier } from "../lib/commerce";

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <div
      className="mt-4 rounded-xl px-4 py-3 text-sm"
      style={{ color: "#a94f4a", backgroundColor: "rgba(201,138,134,0.12)" }}
    >
      {message}
    </div>
  ) : null;
}

function FormActions({
  saving,
  onClose,
}: {
  saving: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  return (
    <div
      className="mt-6 flex justify-end gap-2"
      style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 18 }}
    >
      <Button onClick={onClose} disabled={saving}>
        {lang === "ar" ? "إلغاء" : "Annuler"}
      </Button>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving
          ? lang === "ar"
            ? "جاري الحفظ..."
            : "Enregistrement..."
          : lang === "ar"
            ? "حفظ"
            : "Enregistrer"}
      </Button>
    </div>
  );
}

export function FinishedProductModal({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product?: FinishedProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    initialQuantity: "",
    salePrice: "",
    imageUrl: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      product
        ? {
            name: product.name,
            initialQuantity: "",
            salePrice: String(product.salePrice || ""),
            imageUrl: product.imageUrl ?? "",
            notes: product.notes ?? "",
          }
        : {
            name: "",
            initialQuantity: "",
            salePrice: "",
            imageUrl: "",
            notes: "",
          },
    );
  }, [open, product]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        salePrice: form.salePrice ? Number(form.salePrice) : 0,
        imageUrl: form.imageUrl || undefined,
        notes: form.notes || undefined,
      };
      if (!product) body.initialQuantity = Number(form.initialQuantity || 0);
      await fetchJson(
        product ? `/inventory/products/${product.id}` : "/inventory/products",
        {
          method: product ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save product",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={
        product
          ? lang === "ar"
            ? "تعديل المنتج"
            : "Modifier le produit"
          : lang === "ar"
            ? "إضافة منتج جاهز"
            : "Ajouter un produit fini"
      }
      maxWidth={620}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={
              lang === "ar"
                ? "اسم / نوع الموديل *"
                : "Nom / type du modèle *"
            }
          >
            <TextInput
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          {!product ? (
            <Field
              label={lang === "ar" ? "الكمية الأولية *" : "Quantité initiale *"}
            >
              <TextInput
                required
                min="0"
                type="number"
                value={form.initialQuantity}
                onChange={(event) =>
                  update("initialQuantity", event.target.value)
                }
              />
            </Field>
          ) : null}
          <Field
            label={lang === "ar" ? "سعر البيع الافتراضي" : "Prix de vente"}
          >
            <TextInput
              min="0"
              step="0.01"
              type="number"
              value={form.salePrice}
              onChange={(event) => update("salePrice", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "رابط صورة الموديل" : "Photo du modèle"}>
            <TextInput
              value={form.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="https://..."
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظة قصيرة" : "Remarque"}>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

export function ProductionModal({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: FinishedProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuantity("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setError(null);
  }, [open, product]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/inventory/products/${product.id}/production`, {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          quantityProduced: Number(quantity),
          date,
          notes: notes || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to register production",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={lang === "ar" ? "إضافة كمية / إنتاج جديد" : "Ajouter une quantité"}
      maxWidth={560}
    >
      <form onSubmit={submit} className="p-6">
        {product ? (
          <div
            className="mb-5 rounded-2xl p-4"
            style={{ backgroundColor: palette.bg }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>{product.name}</div>
            <div className="mt-1 text-xs" style={{ color: palette.muted }}>
              {lang === "ar" ? "المتوفر حالياً" : "Disponible"}:{" "}
              {product.quantityAvailable}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={lang === "ar" ? "الكمية المنتجة *" : "Quantité produite *"}
          >
            <TextInput
              required
              min="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "تاريخ الإنتاج" : "Date de production"}>
            <TextInput
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظة" : "Note"}>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

export function RawMaterialModal({
  open,
  suppliers,
  onClose,
  onSaved,
}: {
  open: boolean;
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState({
    materialName: "",
    color: "",
    quantityPurchased: "",
    unit: "متر",
    totalAmount: "",
    paidAmount: "0",
    supplierId: "",
    newSupplierName: "",
    newSupplierPhone: "",
    purchaseDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      materialName: "",
      color: "",
      quantityPurchased: "",
      unit: "متر",
      totalAmount: "",
      paidAmount: "0",
      supplierId: "",
      newSupplierName: "",
      newSupplierPhone: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  }, [open]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/inventory/material-purchases", {
        method: "POST",
        body: JSON.stringify({
          materialName: form.materialName,
          color: form.color || undefined,
          quantityPurchased: Number(form.quantityPurchased),
          unit: form.unit,
          totalAmount: Number(form.totalAmount),
          paidAmount: Number(form.paidAmount || 0),
          paymentMethod: "CASH",
          supplierId: form.supplierId ? Number(form.supplierId) : undefined,
          newSupplier: form.supplierId
            ? undefined
            : {
                name: form.newSupplierName,
                phone: form.newSupplierPhone || undefined,
              },
          purchaseDate: form.purchaseDate,
          notes: form.notes || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save purchase",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={lang === "ar" ? "تسجيل شراء مادة أولية" : "Enregistrer un achat"}
      maxWidth={760}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={lang === "ar" ? "اسم المادة *" : "Nom de la matière *"}>
            <TextInput
              required
              value={form.materialName}
              onChange={(event) => update("materialName", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "اللون" : "Couleur"}>
            <TextInput
              value={form.color}
              onChange={(event) => update("color", event.target.value)}
            />
          </Field>
          <Field
            label={
              lang === "ar" ? "الكمية المشتراة *" : "Quantité achetée *"
            }
          >
            <TextInput
              required
              min="0.001"
              step="0.001"
              type="number"
              value={form.quantityPurchased}
              onChange={(event) =>
                update("quantityPurchased", event.target.value)
              }
            />
          </Field>
          <Field label={lang === "ar" ? "الوحدة *" : "Unité *"}>
            <TextInput
              required
              value={form.unit}
              onChange={(event) => update("unit", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "مبلغ الشراء *" : "Montant total *"}>
            <TextInput
              required
              min="0"
              step="0.01"
              type="number"
              value={form.totalAmount}
              onChange={(event) => update("totalAmount", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "المدفوع الآن" : "Payé maintenant"}>
            <TextInput
              min="0"
              step="0.01"
              type="number"
              value={form.paidAmount}
              onChange={(event) => update("paidAmount", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "المورد" : "Fournisseur"}>
            <Select
              value={form.supplierId}
              onChange={(event) => update("supplierId", event.target.value)}
            >
              <option value="">
                {lang === "ar" ? "مورد جديد" : "Nouveau fournisseur"}
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "تاريخ الشراء" : "Date d'achat"}>
            <TextInput
              type="date"
              value={form.purchaseDate}
              onChange={(event) => update("purchaseDate", event.target.value)}
            />
          </Field>
          {!form.supplierId ? (
            <>
              <Field
                label={
                  lang === "ar"
                    ? "اسم المورد الجديد *"
                    : "Nom du nouveau fournisseur *"
                }
              >
                <TextInput
                  required
                  value={form.newSupplierName}
                  onChange={(event) =>
                    update("newSupplierName", event.target.value)
                  }
                />
              </Field>
              <Field
                label={lang === "ar" ? "هاتف المورد" : "Téléphone fournisseur"}
              >
                <TextInput
                  value={form.newSupplierPhone}
                  onChange={(event) =>
                    update("newSupplierPhone", event.target.value)
                  }
                />
              </Field>
            </>
          ) : null}
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

export function RawMovementModal() {
  return null;
}

export function ProductAdjustmentModal() {
  return null;
}
