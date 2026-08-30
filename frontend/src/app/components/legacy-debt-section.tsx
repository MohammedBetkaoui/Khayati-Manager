import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Ban,
  Eye,
  FilePenLine,
  History,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { LegacyDebt } from "../lib/commerce";
import { formatDate, formatMoney } from "./commerce-ui";
import { Badge, Button, Field, Select, TextInput } from "./kit";
import { ModalShell, Textarea } from "./modal-shell";

type OwnerType = "customer" | "supplier";
type EditingDebt = LegacyDebt | null;

export function LegacyDebtBalanceSummary({
  ownerType,
  currentDebt,
  legacyDebt,
  totalDebt,
  availableCredit,
}: {
  ownerType: OwnerType;
  currentDebt: number;
  legacyDebt: number;
  totalDebt: number;
  availableCredit?: number;
}) {
  const { lang } = useLanguage();
  const isCustomer = ownerType === "customer";
  const labels =
    lang === "ar"
      ? isCustomer
        ? ["مستحقات المبيعات الحالية", "المستحقات السابقة", "إجمالي المستحق للورشة"]
        : ["ديون المشتريات الحالية", "الديون السابقة", "إجمالي المستحق للمورد"]
      : isCustomer
        ? ["Créances issues des ventes", "Créances antérieures", "Total à recevoir"]
        : ["Dettes issues des achats", "Dettes antérieures", "Total dû au fournisseur"];
  return (
    <section className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${availableCredit === undefined ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
      <SummaryValue label={labels[0]} value={currentDebt} lang={lang} />
      <SummaryValue label={labels[1]} value={legacyDebt} lang={lang} warning />
      <SummaryValue label={labels[2]} value={totalDebt} lang={lang} warning />
      {availableCredit !== undefined ? (
        <SummaryValue
          label={lang === "ar" ? "الرصيد المتاح للزبون" : "Crédit disponible du client"}
          value={availableCredit}
          lang={lang}
          positive
        />
      ) : null}
    </section>
  );
}

const statusColors = {
  OPEN: { bg: "rgba(201,138,134,0.13)", fg: "#b46a66" },
  PARTIALLY_PAID: { bg: "rgba(195,154,91,0.16)", fg: "#946b2f" },
  PAID: { bg: "rgba(77,138,106,0.13)", fg: "#4d8a6a" },
  CANCELLED: { bg: "rgba(107,106,98,0.13)", fg: "#6b6a62" },
};

export function LegacyDebtSection({
  ownerType,
  ownerId,
  debts,
  onChanged,
}: {
  ownerType: OwnerType;
  ownerId: number;
  debts: LegacyDebt[];
  onChanged: () => void;
}) {
  const { lang } = useLanguage();
  const [editingDebt, setEditingDebt] = useState<EditingDebt>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<LegacyDebt | null>(null);
  const [detailsDebt, setDetailsDebt] = useState<LegacyDebt | null>(null);
  const [cancelDebt, setCancelDebt] = useState<LegacyDebt | null>(null);
  const activeDebts = debts.filter((debt) => debt.status !== "CANCELLED");
  const summary = activeDebts.reduce(
    (result, debt) => ({
      original: result.original + debt.originalAmount,
      paid: result.paid + debt.paidAmount,
      remaining: result.remaining + debt.remainingAmount,
    }),
    { original: 0, paid: 0, remaining: 0 },
  );
  const isCustomer = ownerType === "customer";
  const text =
    lang === "ar"
      ? {
          title: isCustomer ? "المستحقات السابقة" : "الديون السابقة",
          subtitle: isCustomer
            ? "مبالغ مستحقة للورشة على الزبون قبل استخدام النظام."
            : "مبالغ مستحقة للمورد على الورشة قبل استخدام النظام.",
          add: isCustomer ? "إضافة مستحق سابق" : "إضافة دين سابق",
          date: "التاريخ",
          description: "البيان",
          original: isCustomer ? "المبلغ الأصلي المستحق للورشة" : "المبلغ الأصلي المستحق للمورد",
          paid: isCustomer ? "المحصّل من الزبون" : "المدفوع للمورد",
          remaining: isCustomer ? "المتبقي للورشة على الزبون" : "المتبقي للمورد على الورشة",
          status: "الحالة",
          actions: "الإجراءات",
          unknown: "قبل النظام",
          empty: isCustomer
            ? "لا توجد مستحقات سابقة مسجلة لهذا الزبون."
            : "لا توجد ديون سابقة مسجلة لهذا المورد.",
          details: "التفاصيل",
          payment: isCustomer ? "تسجيل تحصيل" : "تسجيل دفعة للمورد",
          edit: "تعديل",
          cancel: "إلغاء",
          total: isCustomer
            ? "إجمالي المستحقات السابقة"
            : "إجمالي الديون السابقة",
        }
      : {
          title: isCustomer ? "Créances antérieures" : "Dettes antérieures",
          subtitle: isCustomer
            ? "Montants dus à l’atelier par le client avant l’utilisation du système."
            : "Montants dus au fournisseur par l’atelier avant l’utilisation du système.",
          add: isCustomer
            ? "Ajouter une créance antérieure"
            : "Ajouter une dette antérieure",
          date: "Date",
          description: "Description",
          original: isCustomer ? "Montant initial dû à l’atelier" : "Montant initial dû au fournisseur",
          paid: isCustomer ? "Reçu du client" : "Payé au fournisseur",
          remaining: isCustomer ? "Reste dû à l’atelier" : "Reste dû au fournisseur",
          status: "État",
          actions: "Actions",
          unknown: "Avant système",
          empty: isCustomer
            ? "Aucune créance antérieure enregistrée pour ce client."
            : "Aucune dette antérieure enregistrée pour ce fournisseur.",
          details: "Voir détails",
          payment: isCustomer ? "Enregistrer un encaissement" : "Enregistrer un paiement fournisseur",
          edit: "Modifier",
          cancel: "Annuler",
          total: isCustomer
            ? "Total des créances antérieures"
            : "Total des dettes antérieures",
        };

  function openCreate() {
    setEditingDebt(null);
    setFormOpen(true);
  }

  function finishChange() {
    setFormOpen(false);
    setPaymentDebt(null);
    setCancelDebt(null);
    onChanged();
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded-3xl border"
      style={{ borderColor: palette.border, backgroundColor: palette.surface }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
          >
            <History size={20} />
          </div>
          <div>
            <h2 style={{ color: palette.text, fontSize: 17, fontWeight: 900 }}>
              {text.title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: palette.muted }}>
              {text.subtitle}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> {text.add}
        </Button>
      </div>

      <div
        className="grid grid-cols-1 gap-3 border-y p-4 sm:grid-cols-3"
        style={{ borderColor: palette.border, backgroundColor: palette.bg }}
      >
        <SummaryValue label={text.original} value={summary.original} lang={lang} />
        <SummaryValue label={text.paid} value={summary.paid} lang={lang} positive />
        <SummaryValue label={text.total} value={summary.remaining} lang={lang} warning />
      </div>

      {debts.length ? (
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full" style={{ minWidth: 940, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                {[text.date, text.description, text.original, text.paid, text.remaining, text.status, text.actions].map(
                  (header) => (
                    <th key={header} style={headStyle}>
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => {
                const colors = statusColors[debt.status];
                return (
                  <tr key={debt.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                    <td style={cellStyle}>
                      {debt.dateIsUnknown || !debt.debtDate
                        ? text.unknown
                        : formatDate(debt.debtDate, lang)}
                    </td>
                    <td style={{ ...cellStyle, maxWidth: 220, whiteSpace: "normal" }}>
                      {debt.description || (lang === "ar" ? "غير مذكور" : "Non renseigné")}
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 800 }}>
                      {formatMoney(debt.originalAmount, lang)}
                    </td>
                    <td style={{ ...cellStyle, color: "#4d8a6a", fontWeight: 800 }}>
                      {formatMoney(debt.paidAmount, lang)}
                    </td>
                    <td style={{ ...cellStyle, color: debt.remainingAmount > 0 ? "#b46a66" : "#4d8a6a", fontWeight: 900 }}>
                      {formatMoney(debt.remainingAmount, lang)}
                    </td>
                    <td style={cellStyle}>
                      <Badge bg={colors.bg} fg={colors.fg}>
                        {statusLabel(debt.status, lang)}
                      </Badge>
                    </td>
                    <td style={cellStyle}>
                      <div className="flex flex-wrap gap-1.5">
                        <ActionButton label={text.details} onClick={() => setDetailsDebt(debt)}>
                          <Eye size={14} />
                        </ActionButton>
                        {debt.status !== "CANCELLED" && debt.remainingAmount > 0 ? (
                          <ActionButton label={text.payment} onClick={() => setPaymentDebt(debt)}>
                            <WalletCards size={14} />
                          </ActionButton>
                        ) : null}
                        {debt.status !== "CANCELLED" ? (
                          <ActionButton
                            label={text.edit}
                            onClick={() => {
                              setEditingDebt(debt);
                              setFormOpen(true);
                            }}
                          >
                            <FilePenLine size={14} />
                          </ActionButton>
                        ) : null}
                        {debt.status !== "CANCELLED" ? (
                          <ActionButton label={text.cancel} danger onClick={() => setCancelDebt(debt)}>
                            <Ban size={14} />
                          </ActionButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 pt-4">
          <div
            className="rounded-2xl border border-dashed p-6 text-center text-sm"
            style={{ borderColor: palette.border, color: palette.muted }}
          >
            {text.empty}
          </div>
        </div>
      )}

      <LegacyDebtFormModal
        open={formOpen}
        ownerType={ownerType}
        ownerId={ownerId}
        debt={editingDebt}
        onClose={() => setFormOpen(false)}
        onSaved={finishChange}
      />
      <LegacyPaymentModal
        ownerType={ownerType}
        ownerId={ownerId}
        debt={paymentDebt}
        onClose={() => setPaymentDebt(null)}
        onSaved={finishChange}
      />
      <LegacyDebtDetailsModal
        debt={detailsDebt}
        ownerType={ownerType}
        onClose={() => setDetailsDebt(null)}
      />
      <CancelLegacyDebtModal
        ownerType={ownerType}
        ownerId={ownerId}
        debt={cancelDebt}
        onClose={() => setCancelDebt(null)}
        onSaved={finishChange}
      />
    </section>
  );
}

function LegacyDebtFormModal({
  open,
  ownerType,
  ownerId,
  debt,
  onClose,
  onSaved,
}: {
  open: boolean;
  ownerType: OwnerType;
  ownerId: number;
  debt: EditingDebt;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const isCustomer = ownerType === "customer";
  const [amount, setAmount] = useState("");
  const [debtDate, setDebtDate] = useState("");
  const [dateUnknown, setDateUnknown] = useState(true);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [paperReference, setPaperReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(debt ? String(debt.originalAmount) : "");
    setDebtDate(debt?.debtDate ?? "");
    setDateUnknown(debt ? debt.dateIsUnknown : true);
    setDescription(debt?.description ?? "");
    setQuantity(debt?.quantity === null || debt?.quantity === undefined ? "" : String(debt.quantity));
    setUnit(debt?.unit ?? "");
    setPaperReference(debt?.paperReference ?? "");
    setNotes(debt?.notes ?? "");
    setError(null);
  }, [debt, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(lang === "ar" ? "أدخل مبلغاً صحيحاً أكبر من صفر." : "Saisissez un montant supérieur à zéro.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const base = ownerType === "customer" ? "customers" : "suppliers";
      await fetchJson(
        `/${base}/${ownerId}/legacy-debts${debt ? `/${debt.id}` : ""}`,
        {
          method: debt ? "PATCH" : "POST",
          body: JSON.stringify({
            originalAmount: numericAmount,
            debtDate: dateUnknown || !debtDate ? null : debtDate,
            dateIsUnknown: dateUnknown || !debtDate,
            description: description || null,
            quantity: quantity ? Number(quantity) : null,
            unit: unit || null,
            paperReference: paperReference || null,
            notes: notes || null,
          }),
        },
      );
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save legacy balance");
    } finally {
      setSaving(false);
    }
  }

  const title =
    lang === "ar"
      ? debt
        ? isCustomer
          ? "تعديل المستحق السابق"
          : "تعديل الدين السابق"
        : isCustomer
          ? "إضافة مستحق سابق"
          : "إضافة دين سابق"
      : debt
        ? isCustomer
          ? "Modifier la créance antérieure"
          : "Modifier la dette antérieure"
        : isCustomer
          ? "Ajouter une créance antérieure"
          : "Ajouter une dette antérieure";

  return (
    <ModalShell open={open} onClose={onClose} title={title} maxWidth={680}>
      <form onSubmit={submit} className="p-6">
        <div
          className="mb-5 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: palette.border, backgroundColor: palette.bg, color: palette.muted }}
        >
          {lang === "ar"
            ? isCustomer
              ? "تسمح هذه العملية بتسجيل مبلغ كان مستحقاً للورشة على الزبون قبل استخدام خياطتي Manager. لا يلزم إدخال معلومات غير معروفة."
              : "تسمح هذه العملية بتسجيل مبلغ كان مستحقاً للمورد على الورشة قبل استخدام خياطتي Manager. لا يلزم إدخال معلومات غير معروفة."
            : isCustomer
              ? "Enregistrez ici un montant dû à l’atelier par le client avant Khayati Manager. Les informations inconnues peuvent rester vides."
              : "Enregistrez ici un montant dû au fournisseur par l’atelier avant Khayati Manager. Les informations inconnues peuvent rester vides."}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={
              lang === "ar"
                ? isCustomer
                  ? "المبلغ الأصلي المستحق للورشة على الزبون *"
                  : "المبلغ الأصلي المستحق للمورد على الورشة *"
                : isCustomer
                  ? "Montant initial dû à l’atelier par le client *"
                  : "Montant initial dû au fournisseur par l’atelier *"
            }
          >
            <TextInput required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label={lang === "ar" ? "تاريخ الدين" : "Date de la dette"}>
            <TextInput type="date" value={debtDate} disabled={dateUnknown} onChange={(event) => setDebtDate(event.target.value)} />
          </Field>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: palette.text }}>
          <input
            type="checkbox"
            checked={dateUnknown}
            onChange={(event) => {
              setDateUnknown(event.target.checked);
              if (event.target.checked) setDebtDate("");
            }}
          />
          {lang === "ar" ? "التاريخ الدقيق غير معروف" : "Date exacte inconnue"}
        </label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "البيان / المنتج" : "Description / produit"}>
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} placeholder={isCustomer ? (lang === "ar" ? "مثال: 3 فساتين" : "Exemple : 3 robes") : (lang === "ar" ? "مثال: قماش قطني" : "Exemple : tissu coton")} />
          </Field>
          <div className="grid grid-cols-[1fr_0.8fr] gap-2">
            <Field label={lang === "ar" ? "الكمية" : "Quantité"}>
              <TextInput min="0" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "الوحدة" : "Unité"}>
              <TextInput value={unit} onChange={(event) => setUnit(event.target.value)} placeholder={lang === "ar" ? "قطعة / متر" : "pièce / mètre"} />
            </Field>
          </div>
          <Field label={lang === "ar" ? "مرجع الدفتر" : "Référence papier"}>
            <TextInput value={paperReference} onChange={(event) => setPaperReference(event.target.value)} placeholder={lang === "ar" ? "دفتر 2025 - الصفحة 18" : "Cahier 2025 - page 18"} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
            <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </div>
        <FormError message={error} />
        <ModalActions saving={saving} onClose={onClose} submitLabel={lang === "ar" ? "حفظ" : "Enregistrer"} />
      </form>
    </ModalShell>
  );
}

function LegacyPaymentModal({
  ownerType,
  ownerId,
  debt,
  onClose,
  onSaved,
}: {
  ownerType: OwnerType;
  ownerId: number;
  debt: LegacyDebt | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const isCustomer = ownerType === "customer";
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!debt) return;
    setAmount(String(debt.remainingAmount));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("CASH");
    setReference("");
    setNotes("");
    setError(null);
  }, [debt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!debt) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > debt.remainingAmount) {
      setError(
        lang === "ar"
          ? "يجب أن يكون مبلغ الدفعة أكبر من صفر وألا يتجاوز المبلغ المتبقي."
          : "Le paiement doit être positif et ne pas dépasser le montant restant.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const base = ownerType === "customer" ? "customers" : "suppliers";
      await fetchJson(`/${base}/${ownerId}/legacy-debts/${debt.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: numericAmount,
          paymentDate,
          paymentMethod,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to register payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={Boolean(debt)}
      onClose={onClose}
      title={
        lang === "ar"
          ? isCustomer
            ? "تسجيل تحصيل مستحق سابق من الزبون"
            : "تسجيل تسديد دين سابق للمورد"
          : isCustomer
            ? "Encaissement d’une créance antérieure client"
            : "Paiement d’une dette antérieure fournisseur"
      }
      maxWidth={580}
    >
      {debt ? (
        <form onSubmit={submit} className="p-6">
          <div className="mb-5 grid grid-cols-2 gap-3">
            <SummaryValue label={lang === "ar" ? (isCustomer ? "المستحق الأصلي للورشة" : "المستحق الأصلي للمورد") : (isCustomer ? "Initial dû à l’atelier" : "Initial dû au fournisseur")} value={debt.originalAmount} lang={lang} />
            <SummaryValue label={lang === "ar" ? (isCustomer ? "المتبقي للورشة" : "المتبقي للمورد") : (isCustomer ? "Reste dû à l’atelier" : "Reste dû au fournisseur")} value={debt.remainingAmount} lang={lang} warning />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={lang === "ar" ? (isCustomer ? "المبلغ المحصّل من الزبون *" : "المبلغ المدفوع للمورد *") : (isCustomer ? "Montant reçu du client *" : "Montant payé au fournisseur *")}>
              <TextInput required type="number" min="0.01" max={debt.remainingAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "تاريخ الدفع *" : "Date du paiement *"}>
              <TextInput required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </Field>
            <Field label={lang === "ar" ? "طريقة الدفع" : "Mode de paiement"}>
              <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="CASH">{lang === "ar" ? "نقداً" : "Espèces"}</option>
                <option value="TRANSFER">{lang === "ar" ? "تحويل" : "Virement"}</option>
                <option value="OTHER">{lang === "ar" ? "أخرى" : "Autre"}</option>
              </Select>
            </Field>
            <Field label={lang === "ar" ? "المرجع" : "Référence"}>
              <TextInput value={reference} onChange={(event) => setReference(event.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
              <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </div>
          <FormError message={error} />
          <ModalActions saving={saving} onClose={onClose} submitLabel={lang === "ar" ? (isCustomer ? "تسجيل التحصيل" : "تسجيل الدفع للمورد") : (isCustomer ? "Enregistrer l’encaissement" : "Enregistrer le paiement")} />
        </form>
      ) : null}
    </ModalShell>
  );
}

function LegacyDebtDetailsModal({ debt, ownerType, onClose }: { debt: LegacyDebt | null; ownerType: OwnerType; onClose: () => void }) {
  const { lang } = useLanguage();
  if (!debt) return null;
  const missing = lang === "ar" ? "غير مذكور" : "Non renseigné";
  return (
    <ModalShell open onClose={onClose} title={lang === "ar" ? "تفاصيل الرصيد السابق" : "Détail du solde antérieur"} maxWidth={720}>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryValue label={lang === "ar" ? (ownerType === "customer" ? "المستحق الأصلي للورشة" : "المستحق الأصلي للمورد") : (ownerType === "customer" ? "Initial dû à l’atelier" : "Initial dû au fournisseur")} value={debt.originalAmount} lang={lang} />
          <SummaryValue label={lang === "ar" ? (ownerType === "customer" ? "المحصّل من الزبون" : "المدفوع للمورد") : (ownerType === "customer" ? "Reçu du client" : "Payé au fournisseur")} value={debt.paidAmount} lang={lang} positive />
          <SummaryValue label={lang === "ar" ? (ownerType === "customer" ? "المتبقي للورشة" : "المتبقي للمورد") : (ownerType === "customer" ? "Reste dû à l’atelier" : "Reste dû au fournisseur")} value={debt.remainingAmount} lang={lang} warning />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label={lang === "ar" ? "اتجاه المبلغ" : "Sens financier"} value={ownerType === "customer" ? (lang === "ar" ? "مستحق للورشة على الزبون" : "Dû à l’atelier par le client") : (lang === "ar" ? "مستحق للمورد على الورشة" : "Dû au fournisseur par l’atelier")} />
          <Detail label={lang === "ar" ? "التاريخ" : "Date"} value={debt.dateIsUnknown || !debt.debtDate ? (lang === "ar" ? "التاريخ الدقيق غير معروف" : "Date exacte inconnue") : formatDate(debt.debtDate, lang)} />
          <Detail label={lang === "ar" ? "البيان" : "Description"} value={debt.description || missing} />
          <Detail label={lang === "ar" ? "الكمية" : "Quantité"} value={debt.quantity === null ? missing : `${debt.quantity} ${debt.unit ?? ""}`.trim()} />
          <Detail label={lang === "ar" ? "مرجع الدفتر" : "Référence papier"} value={debt.paperReference || missing} />
          <Detail label={lang === "ar" ? "الحالة" : "État"} value={statusLabel(debt.status, lang)} />
        </div>
        <div className="mt-3"><Detail label={lang === "ar" ? "ملاحظات" : "Notes"} value={debt.notes || missing} /></div>
        {debt.status === "CANCELLED" ? (
          <div className="mt-3">
            <Detail
              label={lang === "ar" ? "سبب الإلغاء" : "Motif d’annulation"}
              value={debt.cancellationReason || missing}
            />
          </div>
        ) : null}
        <h3 className="mt-6 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 900 }}>
          <ReceiptText size={17} /> {lang === "ar" ? "سجل الدفعات" : "Historique des paiements"}
        </h3>
        {debt.payments.length ? (
          <div className="mt-3 grid gap-2">
            {debt.payments.map((payment) => (
              <div key={payment.id} className="grid grid-cols-2 gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-4" style={{ backgroundColor: palette.bg }}>
                <span>{formatDate(payment.paymentDate, lang)}</span>
                <strong style={{ color: "#4d8a6a" }}>{formatMoney(payment.amount, lang)}</strong>
                <span>{legacyPaymentMethodLabel(payment.paymentMethodCode, lang)}</span>
                <span style={{ color: palette.muted }}>{payment.reference || "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl p-4 text-sm" style={{ backgroundColor: palette.bg, color: palette.muted }}>
            {lang === "ar" ? "لا توجد دفعات مسجلة." : "Aucun paiement enregistré."}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function CancelLegacyDebtModal({ ownerType, ownerId, debt, onClose, onSaved }: { ownerType: OwnerType; ownerId: number; debt: LegacyDebt | null; onClose: () => void; onSaved: () => void }) {
  const { lang } = useLanguage();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!debt) return;
    setReason("");
    setError(null);
  }, [debt]);

  async function confirm() {
    if (!debt) return;
    setSaving(true);
    setError(null);
    try {
      const base = ownerType === "customer" ? "customers" : "suppliers";
      await fetchJson(`/${base}/${ownerId}/legacy-debts/${debt.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || undefined }),
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel legacy balance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={Boolean(debt)} onClose={onClose} title={lang === "ar" ? "تأكيد إلغاء الرصيد السابق" : "Confirmer l’annulation"} maxWidth={540}>
      {debt ? (
        <div className="p-6">
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(201,138,134,0.3)", backgroundColor: "rgba(201,138,134,0.1)", color: "#b46a66" }}>
            <div className="flex items-start gap-3">
              <Ban className="mt-0.5 shrink-0" size={20} />
              <p className="text-sm" style={{ lineHeight: 1.75 }}>
                {lang === "ar"
                  ? `سيتم إلغاء هذا الرصيد مع الحفاظ على كل بياناته ودفعاته في السجل. المبلغ المتبقي هو ${formatMoney(debt.remainingAmount, lang)}.`
                  : `Le solde sera annulé sans supprimer ses informations ni ses paiements. Le reste actuel est de ${formatMoney(debt.remainingAmount, lang)}.`}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Field label={lang === "ar" ? "سبب الإلغاء (اختياري)" : "Motif d’annulation (facultatif)"}>
              <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
          </div>
          <FormError message={error} />
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={onClose} disabled={saving}>{lang === "ar" ? "رجوع" : "Retour"}</Button>
            <Button variant="primary" onClick={confirm} disabled={saving}>{lang === "ar" ? "تأكيد الإلغاء" : "Confirmer l’annulation"}</Button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}

function SummaryValue({ label, value, lang, positive, warning }: { label: string; value: number; lang: "ar" | "fr"; positive?: boolean; warning?: boolean }) {
  return (
    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: palette.border, backgroundColor: palette.surface }}>
      <div className="text-xs" style={{ color: palette.muted }}>{label}</div>
      <div className="mt-1" style={{ color: positive ? "#4d8a6a" : warning && value > 0 ? "#b46a66" : palette.text, fontSize: 18, fontWeight: 900 }}>
        {formatMoney(value, lang)}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ backgroundColor: palette.bg }}>
      <div className="text-xs" style={{ color: palette.muted }}>{label}</div>
      <div className="mt-1 text-sm" style={{ color: palette.text, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function ActionButton({ children, label, onClick, danger = false }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-70" style={{ border: `1px solid ${danger ? "rgba(201,138,134,0.3)" : palette.border}`, color: danger ? "#b46a66" : palette.primary }}>
      {children}
    </button>
  );
}

function ModalActions({ saving, onClose, submitLabel }: { saving: boolean; onClose: () => void; submitLabel: string }) {
  const { lang } = useLanguage();
  return (
    <div className="mt-6 flex justify-end gap-2" style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 18 }}>
      <Button onClick={onClose} disabled={saving}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? (lang === "ar" ? "جاري الحفظ..." : "Enregistrement...") : submitLabel}
      </Button>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  return message ? (
    <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ color: "#a94f4a", backgroundColor: "rgba(201,138,134,0.12)" }}>
      {message}
    </div>
  ) : null;
}

function statusLabel(status: LegacyDebt["status"], lang: "ar" | "fr") {
  const labels = {
    ar: { OPEN: "مفتوح", PARTIALLY_PAID: "مسدد جزئياً", PAID: "مسدد", CANCELLED: "ملغى" },
    fr: { OPEN: "Ouvert", PARTIALLY_PAID: "Partiellement réglé", PAID: "Réglé", CANCELLED: "Annulé" },
  } as const;
  return labels[lang][status];
}

function legacyPaymentMethodLabel(method: string, lang: "ar" | "fr") {
  const labels: Record<string, { ar: string; fr: string }> = {
    CASH: { ar: "نقداً", fr: "Espèces" },
    TRANSFER: { ar: "تحويل", fr: "Virement" },
    OTHER: { ar: "أخرى", fr: "Autre" },
    CHECK: { ar: "صك", fr: "Chèque" },
  };
  return labels[method]?.[lang] ?? method;
}

const headStyle: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "start",
  fontSize: 12,
  color: palette.muted,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  padding: "13px 10px",
  fontSize: 13,
  color: palette.text,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};
