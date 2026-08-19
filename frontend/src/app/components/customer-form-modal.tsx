import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Select, TextInput } from "./kit";
import { ModalShell, Textarea } from "./modal-shell";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { ApiCustomer } from "../lib/commerce";

type CustomerForm = {
  fullName: string;
  phone: string;
  secondPhone: string;
  address: string;
  city: string;
  wilaya: string;
  type: ApiCustomer["typeCode"];
  status: ApiCustomer["statusCode"];
  notes: string;
};

const emptyForm: CustomerForm = {
  fullName: "",
  phone: "",
  secondPhone: "",
  address: "",
  city: "",
  wilaya: "",
  type: "REGULAR",
  status: "ACTIVE",
  notes: "",
};

export function CustomerFormModal({
  open,
  customer,
  onClose,
  onSaved,
  compact = false,
}: {
  open: boolean;
  customer?: ApiCustomer | null;
  onClose: () => void;
  onSaved: (customer: ApiCustomer) => void;
  compact?: boolean;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      customer
        ? {
            fullName: customer.fullName,
            phone: customer.phone,
            secondPhone: customer.secondPhone ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            wilaya: customer.wilaya ?? "",
            type: customer.typeCode,
            status: customer.statusCode,
            notes: customer.notes ?? "",
          }
        : emptyForm,
    );
  }, [customer, open]);

  const update = (field: keyof CustomerForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const saved = await fetchJson<ApiCustomer>(
        customer ? `/sales/customers/${customer.id}` : "/sales/customers",
        {
          method: customer ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            secondPhone: form.secondPhone || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
            wilaya: form.wilaya || undefined,
            notes: form.notes || undefined,
          }),
        },
      );
      onSaved(saved);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save customer",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={
        customer
          ? lang === "ar"
            ? "تعديل بيانات الزبون"
            : "Modifier le client"
          : lang === "ar"
            ? "إضافة زبون جديد"
            : "Ajouter un client"
      }
      maxWidth={compact ? 620 : 760}
    >
      <form onSubmit={submit} className="p-6">
        <div
          className={
            compact
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
              : "grid grid-cols-1 gap-4 md:grid-cols-2"
          }
        >
          <Field
            label={
              lang === "ar"
                ? "الاسم الكامل / المؤسسة *"
                : "Nom complet / raison sociale *"
            }
          >
            <TextInput
              required
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
            />
          </Field>
          <Field label={lang === "ar" ? "رقم الهاتف *" : "Téléphone *"}>
            <TextInput
              required
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </Field>
          {!compact ? (
            <Field
              label={lang === "ar" ? "رقم هاتف ثان" : "Deuxième téléphone"}
            >
              <TextInput
                value={form.secondPhone}
                onChange={(event) => update("secondPhone", event.target.value)}
              />
            </Field>
          ) : null}
          <Field label={lang === "ar" ? "نوع الزبون" : "Type de client"}>
            <Select
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
            >
              <option value="REGULAR">
                {lang === "ar" ? "زبون دائم" : "Client régulier"}
              </option>
              <option value="NEW">
                {lang === "ar" ? "زبون جديد" : "Nouveau client"}
              </option>
              <option value="VIP">
                {lang === "ar" ? "زبون مهم" : "Client important"}
              </option>
              <option value="OCCASIONAL">
                {lang === "ar" ? "زبون عرضي" : "Client occasionnel"}
              </option>
            </Select>
          </Field>
          <Field label={lang === "ar" ? "العنوان" : "Adresse"}>
            <TextInput
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </Field>
          {!compact ? (
            <>
              <Field label={lang === "ar" ? "المدينة" : "Ville"}>
                <TextInput
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                />
              </Field>
              <Field label={lang === "ar" ? "الولاية" : "Wilaya"}>
                <TextInput
                  value={form.wilaya}
                  onChange={(event) => update("wilaya", event.target.value)}
                />
              </Field>
              <Field label={lang === "ar" ? "الحالة" : "Statut"}>
                <Select
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  <option value="ACTIVE">
                    {lang === "ar" ? "نشط" : "Actif"}
                  </option>
                  <option value="INACTIVE">
                    {lang === "ar" ? "غير نشط" : "Inactif"}
                  </option>
                  <option value="ARCHIVED">
                    {lang === "ar" ? "مؤرشف" : "Archivé"}
                  </option>
                </Select>
              </Field>
            </>
          ) : null}
        </div>
        {!compact ? (
          <div className="mt-4">
            <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
              />
            </Field>
          </div>
        ) : null}
        {error ? (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm"
            style={{
              color: "#a94f4a",
              backgroundColor: "rgba(201,138,134,0.12)",
            }}
          >
            {error}
          </div>
        ) : null}
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
                ? "حفظ الزبون"
                : "Enregistrer"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
