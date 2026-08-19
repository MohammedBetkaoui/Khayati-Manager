import { useEffect, useState, type FormEvent } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button, Field, Select, TextInput } from "./kit";
import { ModalShell, Textarea } from "./modal-shell";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { FinishedProduct, RawMaterial } from "../lib/commerce";

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

export function RawMaterialModal({
  open,
  material,
  onClose,
  onSaved,
}: {
  open: boolean;
  material?: RawMaterial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    reference: "",
    category: "FABRIC",
    type: "",
    color: "",
    quantity: "0",
    unit: "متر",
    unitPrice: "0",
    supplier: "",
    minStockAlert: "0",
    location: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      material
        ? {
            name: material.name,
            reference: material.reference ?? "",
            category: categoryCode(material.category),
            type: material.type ?? "",
            color: material.color ?? "",
            quantity: String(material.quantity),
            unit: material.unit,
            unitPrice: String(material.unitPrice),
            supplier: material.supplier ?? "",
            minStockAlert: String(material.minStockAlert),
            location: material.location ?? "",
            description: material.description ?? "",
          }
        : {
            name: "",
            reference: "",
            category: "FABRIC",
            type: "",
            color: "",
            quantity: "0",
            unit: "متر",
            unitPrice: "0",
            supplier: "",
            minStockAlert: "0",
            location: "",
            description: "",
          },
    );
  }, [material, open]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        reference: form.reference || undefined,
        category: form.category,
        type: form.type || undefined,
        color: form.color || undefined,
        unit: form.unit,
        unitPrice: Number(form.unitPrice),
        supplier: form.supplier || undefined,
        minStockAlert: Number(form.minStockAlert),
        location: form.location || undefined,
        description: form.description || undefined,
      };
      if (!material) body.quantity = Number(form.quantity);
      await fetchJson(material ? `/inventory/${material.id}` : "/inventory", {
        method: material ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save material",
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
        material
          ? lang === "ar"
            ? "تعديل المادة الأولية"
            : "Modifier la matière"
          : lang === "ar"
            ? "إضافة مادة أولية"
            : "Ajouter une matière"
      }
      maxWidth={780}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={lang === "ar" ? "اسم المادة *" : "Nom de la matière *"}>
            <TextInput
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "المرجع" : "Référence"}>
            <TextInput
              value={form.reference}
              onChange={(event) => update("reference", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "التصنيف *" : "Catégorie *"}>
            <Select
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            >
              {[
                ["FABRIC", "أقمشة", "Tissus"],
                ["THREAD", "خيوط", "Fils"],
                ["BUTTON", "أزرار", "Boutons"],
                ["ZIPPER", "سحابات", "Fermetures"],
                ["ACCESSORIES", "إكسسوارات", "Accessoires"],
                ["PACKAGING", "تغليف", "Emballage"],
                ["TOOLS", "أدوات", "Outils"],
              ].map(([value, ar, fr]) => (
                <option key={value} value={value}>
                  {lang === "ar" ? ar : fr}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "النوع / الوصف المختصر" : "Type"}>
            <TextInput
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "اللون" : "Couleur"}>
            <TextInput
              value={form.color}
              onChange={(event) => update("color", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "الوحدة *" : "Unité *"}>
            <TextInput
              required
              value={form.unit}
              onChange={(event) => update("unit", event.target.value)}
            />
          </Field>
          <Field
            label={lang === "ar" ? "الكمية الافتتاحية" : "Quantité initiale"}
          >
            <TextInput
              required={!material}
              disabled={Boolean(material)}
              min="0"
              step="0.001"
              type="number"
              value={form.quantity}
              onChange={(event) => update("quantity", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "سعر الشراء" : "Prix d'achat"}>
            <TextInput
              min="0"
              step="0.01"
              type="number"
              value={form.unitPrice}
              onChange={(event) => update("unitPrice", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "الحد الأدنى" : "Seuil minimum"}>
            <TextInput
              min="0"
              step="0.001"
              type="number"
              value={form.minStockAlert}
              onChange={(event) => update("minStockAlert", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "المورد" : "Fournisseur"}>
            <TextInput
              value={form.supplier}
              onChange={(event) => update("supplier", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "الموقع" : "Emplacement"}>
            <TextInput
              value={form.location}
              onChange={(event) => update("location", event.target.value)}
            />
          </Field>
        </div>
        {material ? (
          <p className="mt-3 text-xs" style={{ color: palette.muted }}>
            {lang === "ar"
              ? "لتغيير الكمية استخدم حركة مخزون حتى يبقى التاريخ محفوظا."
              : "Utilisez un mouvement de stock pour modifier la quantité et conserver la traçabilité."}
          </p>
        ) : null}
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function categoryCode(value: string) {
  const map: Record<string, string> = {
    أقمشة: "FABRIC",
    خيوط: "THREAD",
    أزرار: "BUTTON",
    سحابات: "ZIPPER",
    إكسسوارات: "ACCESSORIES",
    تغليف: "PACKAGING",
    أدوات: "TOOLS",
  };
  return map[value] || value || "FABRIC";
}

export function RawMovementModal({
  open,
  material,
  onClose,
  onSaved,
}: {
  open: boolean;
  material: RawMaterial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType("IN");
    setQuantity("");
    setReason("");
    setReference("");
    setPerformedBy("");
    setError(null);
  }, [open, material]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!material) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/inventory/movement", {
        method: "POST",
        body: JSON.stringify({
          inventoryItemId: material.id,
          type,
          quantity: Number(quantity),
          reason: reason || undefined,
          reference: reference || undefined,
          performedBy: performedBy || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create movement",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={lang === "ar" ? "حركة مخزون" : "Mouvement de stock"}
      maxWidth={600}
    >
      <form onSubmit={submit} className="p-6">
        {material ? (
          <div
            className="mb-5 rounded-xl p-4"
            style={{ backgroundColor: palette.bg }}
          >
            <div style={{ fontWeight: 800 }}>{material.name}</div>
            <div className="mt-1 text-xs" style={{ color: palette.muted }}>
              {lang === "ar" ? "الكمية الحالية" : "Quantité actuelle"}:{" "}
              {material.quantity} {material.unit}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "نوع الحركة" : "Type de mouvement"}>
            <Select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="IN">{lang === "ar" ? "دخول" : "Entrée"}</option>
              <option value="OUT">{lang === "ar" ? "خروج" : "Sortie"}</option>
              <option value="ADJUSTMENT">
                {lang === "ar" ? "تعديل الكمية النهائية" : "Ajustement final"}
              </option>
              <option value="LOSS">
                {lang === "ar" ? "ضياع / تلف" : "Perte / dommage"}
              </option>
            </Select>
          </Field>
          <Field
            label={
              type === "ADJUSTMENT"
                ? lang === "ar"
                  ? "الكمية الجديدة"
                  : "Nouvelle quantité"
                : lang === "ar"
                  ? "الكمية"
                  : "Quantité"
            }
          >
            <TextInput
              required
              min="0"
              step="0.001"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "السبب" : "Motif"}>
            <TextInput
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "المرجع" : "Référence"}>
            <TextInput
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "المستخدم" : "Utilisateur"}>
            <TextInput
              value={performedBy}
              onChange={(event) => setPerformedBy(event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

type VariantForm = {
  sku: string;
  size: string;
  color: string;
  salePrice: string;
};

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
    sku: "",
    category: "DRESS",
    salePrice: "0",
    estimatedProductionCost: "0",
    minStockAlert: "0",
    description: "",
    notes: "",
  });
  const [variants, setVariants] = useState<VariantForm[]>([
    { sku: "", size: "", color: "", salePrice: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.categoryCode,
            salePrice: String(product.salePrice),
            estimatedProductionCost: String(product.estimatedProductionCost),
            minStockAlert: String(product.minStockAlert),
            description: product.description ?? "",
            notes: product.notes ?? "",
          }
        : {
            name: "",
            sku: "",
            category: "DRESS",
            salePrice: "0",
            estimatedProductionCost: "0",
            minStockAlert: "0",
            description: "",
            notes: "",
          },
    );
    setVariants(
      product?.variants.length
        ? product.variants.map((variant) => ({
            sku: variant.sku,
            size: variant.size ?? "",
            color: variant.color ?? "",
            salePrice:
              variant.salePrice === product.salePrice
                ? ""
                : String(variant.salePrice),
          }))
        : [{ sku: "", size: "", color: "", salePrice: "" }],
    );
  }, [open, product]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const updateVariant = (
    index: number,
    field: keyof VariantForm,
    value: string,
  ) =>
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fetchJson(
        product ? `/inventory/products/${product.id}` : "/inventory/products",
        {
          method: product ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            salePrice: Number(form.salePrice),
            estimatedProductionCost: Number(form.estimatedProductionCost),
            minStockAlert: Number(form.minStockAlert),
            description: form.description || undefined,
            notes: form.notes || undefined,
            variants: variants.map((variant) => ({
              sku: variant.sku || undefined,
              size: variant.size || undefined,
              color: variant.color || undefined,
              salePrice: variant.salePrice
                ? Number(variant.salePrice)
                : undefined,
            })),
          }),
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
      maxWidth={840}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={lang === "ar" ? "اسم الموديل *" : "Nom du modèle *"}>
            <TextInput
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field label="SKU / Référence *">
            <TextInput
              required
              value={form.sku}
              onChange={(event) => update("sku", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "التصنيف" : "Catégorie"}>
            <Select
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            >
              {[
                ["DRESS", "فستان", "Robe"],
                ["PANTS", "سروال", "Pantalon"],
                ["SHIRT", "قميص", "Chemise"],
                ["SET", "طقم", "Ensemble"],
                ["TRADITIONAL", "لباس تقليدي", "Tenue traditionnelle"],
                ["UNIFORM", "زي موحد", "Uniforme"],
                ["OTHER", "أخرى", "Autre"],
              ].map(([value, ar, fr]) => (
                <option key={value} value={value}>
                  {lang === "ar" ? ar : fr}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "سعر البيع" : "Prix de vente"}>
            <TextInput
              required
              min="0"
              step="0.01"
              type="number"
              value={form.salePrice}
              onChange={(event) => update("salePrice", event.target.value)}
            />
          </Field>
          <Field
            label={lang === "ar" ? "تكلفة الإنتاج التقديرية" : "Coût estimé"}
          >
            <TextInput
              min="0"
              step="0.01"
              type="number"
              value={form.estimatedProductionCost}
              onChange={(event) =>
                update("estimatedProductionCost", event.target.value)
              }
            />
          </Field>
          <Field label={lang === "ar" ? "حد التنبيه" : "Seuil d'alerte"}>
            <TextInput
              min="0"
              type="number"
              value={form.minStockAlert}
              onChange={(event) => update("minStockAlert", event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "الوصف" : "Description"}>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>
            {lang === "ar" ? "المقاسات والألوان" : "Tailles et couleurs"}
          </h3>
          <Button
            onClick={() =>
              setVariants((current) => [
                ...current,
                { sku: "", size: "", color: "", salePrice: "" },
              ])
            }
          >
            <Plus size={15} />{" "}
            {lang === "ar" ? "إضافة تنويعة" : "Ajouter une variante"}
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_auto]"
              style={{ borderColor: palette.border }}
            >
              <Field label="SKU">
                <TextInput
                  value={variant.sku}
                  onChange={(event) =>
                    updateVariant(index, "sku", event.target.value)
                  }
                />
              </Field>
              <Field label={lang === "ar" ? "المقاس" : "Taille"}>
                <TextInput
                  value={variant.size}
                  onChange={(event) =>
                    updateVariant(index, "size", event.target.value)
                  }
                />
              </Field>
              <Field label={lang === "ar" ? "اللون" : "Couleur"}>
                <TextInput
                  value={variant.color}
                  onChange={(event) =>
                    updateVariant(index, "color", event.target.value)
                  }
                />
              </Field>
              <Field label={lang === "ar" ? "سعر خاص" : "Prix spécifique"}>
                <TextInput
                  min="0"
                  type="number"
                  value={variant.salePrice}
                  onChange={(event) =>
                    updateVariant(index, "salePrice", event.target.value)
                  }
                />
              </Field>
              <button
                type="button"
                aria-label="Remove variant"
                disabled={variants.length === 1 || Boolean(product)}
                onClick={() =>
                  setVariants((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="mt-6 flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-25"
                style={{
                  color: "#b46a66",
                  backgroundColor: "rgba(201,138,134,0.1)",
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        {product ? (
          <p className="mt-3 text-xs" style={{ color: palette.muted }}>
            {lang === "ar"
              ? "تبقى التنويعات التي لها حركات بيع أو إنتاج محفوظة لضمان سلامة التاريخ."
              : "Les variantes déjà utilisées restent conservées afin de préserver l'historique."}
          </p>
        ) : null}
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

export function ProductionModal({
  open,
  product,
  materials,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: FinishedProduct | null;
  materials: RawMaterial[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [additionalCost, setAdditionalCost] = useState("0");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<
    Array<{ inventoryItemId: string; quantityUsed: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVariantId(product?.variants[0] ? String(product.variants[0].id) : "");
    setQuantity("");
    setAdditionalCost("0");
    setNotes("");
    setRows([]);
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
          variantId: variantId ? Number(variantId) : undefined,
          quantityProduced: Number(quantity),
          additionalCost: Number(additionalCost),
          notes: notes || undefined,
          materials: rows
            .filter(
              (row) => row.inventoryItemId && Number(row.quantityUsed) > 0,
            )
            .map((row) => ({
              inventoryItemId: Number(row.inventoryItemId),
              quantityUsed: Number(row.quantityUsed),
            })),
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
      title={lang === "ar" ? "إنتاج دفعة جديدة" : "Nouvelle production"}
      maxWidth={780}
    >
      <form onSubmit={submit} className="p-6">
        {product ? (
          <div
            className="mb-5 rounded-2xl p-4"
            style={{
              background:
                "linear-gradient(120deg, rgba(18,60,74,0.08), rgba(195,154,91,0.12))",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>{product.name}</div>
            <div className="mt-1 text-xs" style={{ color: palette.muted }}>
              {product.sku} · {lang === "ar" ? "المتوفر" : "Disponible"}:{" "}
              {product.quantityAvailable}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={lang === "ar" ? "المقاس / اللون" : "Variante"}>
            <Select
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
            >
              {product?.variants
                .filter((variant) => variant.active)
                .map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label} ({variant.sku})
                  </option>
                ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "الكمية المنتجة" : "Quantité produite"}>
            <TextInput
              required
              min="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "تكلفة إضافية" : "Coût additionnel"}>
            <TextInput
              min="0"
              step="0.01"
              type="number"
              value={additionalCost}
              onChange={(event) => setAdditionalCost(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === "ar"
                ? "المواد الأولية المستعملة"
                : "Matières consommées"}
            </h3>
            <p className="text-xs" style={{ color: palette.muted }}>
              {lang === "ar"
                ? "سيتم خصمها آليا من المخزون."
                : "Elles seront déduites automatiquement du stock."}
            </p>
          </div>
          <Button
            onClick={() =>
              setRows((current) => [
                ...current,
                { inventoryItemId: "", quantityUsed: "" },
              ])
            }
          >
            <Plus size={15} /> {lang === "ar" ? "إضافة مادة" : "Ajouter"}
          </Button>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_140px_38px] items-end gap-3 rounded-xl border p-3"
              style={{ borderColor: palette.border }}
            >
              <Field label={lang === "ar" ? "المادة" : "Matière"}>
                <Select
                  value={row.inventoryItemId}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, inventoryItemId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">
                    {lang === "ar" ? "اختر المادة" : "Sélectionner"}
                  </option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} ({material.quantity} {material.unit})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={lang === "ar" ? "الكمية" : "Quantité"}>
                <TextInput
                  min="0.001"
                  step="0.001"
                  type="number"
                  value={row.quantityUsed}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantityUsed: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <button
                type="button"
                aria-label="Remove material"
                onClick={() =>
                  setRows((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  color: "#b46a66",
                  backgroundColor: "rgba(201,138,134,0.1)",
                }}
              >
                <Minus size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Field
            label={lang === "ar" ? "ملاحظات الإنتاج" : "Notes de production"}
          >
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

export function ProductAdjustmentModal({
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
  const [variantId, setVariantId] = useState("");
  const [type, setType] = useState("ADJUSTMENT");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setVariantId(product?.variants[0] ? String(product.variants[0].id) : "");
    setType("ADJUSTMENT");
    setQuantity("");
    setReason("");
    setError(null);
  }, [open, product]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/inventory/products/${product.id}/stock-adjustment`, {
        method: "POST",
        body: JSON.stringify({
          variantId: Number(variantId),
          type,
          quantity: Number(quantity),
          reason: reason || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to adjust stock",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={lang === "ar" ? "تعديل مخزون المنتج" : "Ajuster le stock produit"}
      maxWidth={580}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "التنويعة" : "Variante"}>
            <Select
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
            >
              {product?.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} - {variant.quantityAvailable}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "العملية" : "Opération"}>
            <Select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="ADJUSTMENT">
                {lang === "ar" ? "تحديد الكمية النهائية" : "Quantité finale"}
              </option>
              <option value="RETURN">
                {lang === "ar" ? "إرجاع بيع" : "Retour client"}
              </option>
              <option value="LOSS">
                {lang === "ar" ? "ضياع / تلف" : "Perte / dommage"}
              </option>
            </Select>
          </Field>
          <Field
            label={
              type === "ADJUSTMENT"
                ? lang === "ar"
                  ? "الكمية الجديدة"
                  : "Nouvelle quantité"
                : lang === "ar"
                  ? "الكمية"
                  : "Quantité"
            }
          >
            <TextInput
              required
              min="0"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "السبب" : "Motif"}>
            <TextInput
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </div>
        <ErrorMessage message={error} />
        <FormActions saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}
