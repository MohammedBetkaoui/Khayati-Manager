import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  RotateCcw,
  Scale,
  WalletCards,
} from "lucide-react";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type {
  CustomerCreditSummary,
  CustomerCreditTarget,
  CustomerCreditTransaction,
} from "../lib/commerce";
import { formatDate, formatMoney, formatPaymentMethod } from "./commerce-ui";
import { Badge, Button, Field, Select, TextInput } from "./kit";
import { ModalShell, Textarea } from "./modal-shell";

type MoneyOperation = "advance" | "refund";

export function CustomerCreditSection({
  customerId,
  credit,
  onChanged,
}: {
  customerId: number;
  credit: CustomerCreditSummary;
  onChanged: () => void;
}) {
  const { lang } = useLanguage();
  const [moneyOperation, setMoneyOperation] = useState<MoneyOperation | null>(
    null,
  );
  const [applyOpen, setApplyOpen] = useState(false);
  const [reversing, setReversing] =
    useState<CustomerCreditTransaction | null>(null);
  const text =
    lang === "ar"
      ? {
          title: "الرصيد المسبق",
          subtitle: "مبالغ محصلة مسبقاً ومتاحة للزبون دون خلطها مع مستحقاته.",
          balance: "الرصيد المتاح للزبون",
          credits: "إجمالي الإضافات",
          debits: "إجمالي الاستخدام والاسترجاع",
          advance: "إضافة دفعة مسبقة",
          refund: "إرجاع مبلغ للزبون",
          apply: "استخدام الرصيد لتسديد المستحقات",
          history: "سجل الرصيد",
          empty: "لا توجد عمليات رصيد مسجلة لهذا الزبون.",
          date: "التاريخ",
          type: "العملية",
          reference: "المرجع",
          movement: "الحركة",
          after: "الرصيد بعد العملية",
          actions: "الإجراءات",
          reverse: "إلغاء مع الاحتفاظ بالأثر",
          reversed: "ملغاة",
        }
      : {
          title: "Crédit client",
          subtitle:
            "Montants encaissés à l'avance et disponibles pour le client, séparés de ses créances.",
          balance: "Crédit disponible",
          credits: "Total des crédits",
          debits: "Utilisé ou remboursé",
          advance: "Ajouter un paiement anticipé",
          refund: "Rembourser un crédit",
          apply: "Utiliser le crédit sur une créance",
          history: "Historique du crédit",
          empty: "Aucune opération de crédit enregistrée pour ce client.",
          date: "Date",
          type: "Opération",
          reference: "Référence",
          movement: "Mouvement",
          after: "Solde après opération",
          actions: "Actions",
          reverse: "Annuler avec trace",
          reversed: "Annulée",
        };

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        borderColor: "rgba(77,138,106,0.28)",
        background:
          "linear-gradient(145deg, rgba(77,138,106,0.1), var(--app-surface) 42%)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(77,138,106,0.14)", color: "#4d8a6a" }}
          >
            <WalletCards size={21} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>{text.title}</h3>
            <p className="mt-1" style={{ color: palette.muted, fontSize: 12.5 }}>
              {text.subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {credit.availableCredit > 0 && credit.targets.length ? (
            <Button onClick={() => setApplyOpen(true)}>
              <Scale size={15} /> {text.apply}
            </Button>
          ) : null}
          {credit.availableCredit > 0 ? (
            <Button onClick={() => setMoneyOperation("refund")}>
              <ArrowUpFromLine size={15} /> {text.refund}
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => setMoneyOperation("advance")}>
            <ArrowDownToLine size={15} /> {text.advance}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CreditMetric
          label={text.balance}
          value={credit.availableCredit}
          lang={lang}
          primary
        />
        <CreditMetric label={text.credits} value={credit.totalCredits} lang={lang} />
        <CreditMetric label={text.debits} value={credit.totalDebits} lang={lang} />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <History size={17} style={{ color: palette.primary }} />
        <h4 style={{ fontSize: 14, fontWeight: 850 }}>{text.history}</h4>
      </div>
      {credit.transactions.length ? (
        <div className="mt-3 overflow-x-auto rounded-xl border" style={{ borderColor: palette.border }}>
          <table className="w-full border-collapse" style={{ minWidth: 760 }}>
            <thead style={{ backgroundColor: palette.bg }}>
              <tr>
                {[text.date, text.type, text.reference, text.movement, text.after, text.actions].map(
                  (header) => (
                    <th key={header} className="px-3 py-3 text-start text-xs" style={{ color: palette.muted }}>
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {credit.transactions.map((transaction) => (
                <tr key={transaction.id} style={{ borderTop: `1px solid ${palette.border}` }}>
                  <td className="px-3 py-3 text-sm">{formatDate(transaction.transactionDate, lang)}</td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{transactionTypeLabel(transaction.type, lang)}</span>
                      {transaction.reversedAt ? (
                        <Badge bg="rgba(107,106,98,0.13)" fg="#77756e">{text.reversed}</Badge>
                      ) : null}
                    </div>
                    {transaction.notes ? (
                      <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                        {transaction.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <div>{transactionReference(transaction, lang)}</div>
                    {transaction.paymentMethod ? (
                      <div className="mt-1 text-xs" style={{ color: palette.muted }}>
                        {formatPaymentMethod(null, transaction.paymentMethod, lang)}
                      </div>
                    ) : null}
                  </td>
                  <td
                    className="px-3 py-3 text-sm font-bold"
                    style={{
                      color:
                        transaction.direction === "CREDIT" ? "#4d8a6a" : "#b46a66",
                    }}
                  >
                    {transaction.direction === "CREDIT" ? "+" : "-"}
                    {formatMoney(transaction.amount, lang)}
                  </td>
                  <td className="px-3 py-3 text-sm font-bold">
                    {formatMoney(transaction.balanceAfter, lang)}
                  </td>
                  <td className="px-3 py-3">
                    {!transaction.reversedAt && transaction.type !== "REVERSAL" ? (
                      <button
                        type="button"
                        onClick={() => setReversing(transaction)}
                        className="inline-flex items-center gap-1 text-xs font-bold"
                        style={{ color: palette.muted }}
                      >
                        <RotateCcw size={13} /> {text.reverse}
                      </button>
                    ) : (
                      <span style={{ color: palette.muted }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: palette.border, color: palette.muted }}>
          {text.empty}
        </div>
      )}

      <CreditMoneyModal
        operation={moneyOperation}
        customerId={customerId}
        availableCredit={credit.availableCredit}
        onClose={() => setMoneyOperation(null)}
        onSaved={onChanged}
      />
      <ApplyCreditModal
        open={applyOpen}
        customerId={customerId}
        availableCredit={credit.availableCredit}
        targets={credit.targets}
        onClose={() => setApplyOpen(false)}
        onSaved={onChanged}
      />
      <ReverseCreditModal
        customerId={customerId}
        transaction={reversing}
        onClose={() => setReversing(null)}
        onSaved={onChanged}
      />
    </section>
  );
}

function CreditMetric({
  label,
  value,
  lang,
  primary = false,
}: {
  label: string;
  value: number;
  lang: "ar" | "fr";
  primary?: boolean;
}) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: primary ? "rgba(77,138,106,0.15)" : palette.bg }}>
      <div style={{ color: palette.muted, fontSize: 12 }}>{label}</div>
      <div className="mt-1" style={{ color: primary ? "#4d8a6a" : palette.text, fontSize: 20, fontWeight: 900 }}>
        {formatMoney(value, lang)}
      </div>
    </div>
  );
}

function CreditMoneyModal({
  operation,
  customerId,
  availableCredit,
  onClose,
  onSaved,
}: {
  operation: MoneyOperation | null;
  customerId: number;
  availableCredit: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operation) return;
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("CASH");
    setReference("");
    setNotes("");
    setError(null);
  }, [operation]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!operation) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(lang === "ar" ? "أدخل مبلغاً صحيحاً أكبر من صفر." : "Saisissez un montant valide supérieur à zéro.");
      return;
    }
    if (operation === "refund" && numericAmount > availableCredit) {
      setError(lang === "ar" ? "مبلغ الإرجاع يتجاوز الرصيد المتاح." : "Le remboursement dépasse le crédit disponible.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/customers/${customerId}/credit/${operation}`, {
        method: "POST",
        body: JSON.stringify({
          amount: numericAmount,
          date,
          paymentMethod,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });
      onClose();
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save credit operation");
    } finally {
      setSaving(false);
    }
  }

  const isAdvance = operation === "advance";
  return (
    <ModalShell
      open={Boolean(operation)}
      onClose={onClose}
      title={
        lang === "ar"
          ? isAdvance
            ? "إضافة دفعة مسبقة"
            : "إرجاع مبلغ للزبون"
          : isAdvance
            ? "Ajouter un paiement anticipé"
            : "Rembourser un crédit"
      }
      maxWidth={580}
    >
      <form onSubmit={submit} className="p-6">
        {!isAdvance ? (
          <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: "rgba(77,138,106,0.12)" }}>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "الرصيد المتاح" : "Crédit disponible"}</span>{" "}
            <strong style={{ color: "#4d8a6a" }}>{formatMoney(availableCredit, lang)}</strong>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "المبلغ *" : "Montant *"}>
            <TextInput required type="number" min="0.01" step="0.01" max={isAdvance ? undefined : availableCredit} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label={lang === "ar" ? "التاريخ *" : "Date *"}>
            <TextInput required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
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
        {error ? <FormError message={error} /> : null}
        <ModalButtons saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function ApplyCreditModal({
  open,
  customerId,
  availableCredit,
  targets,
  onClose,
  onSaved,
}: {
  open: boolean;
  customerId: number;
  availableCredit: number;
  targets: CustomerCreditTarget[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [targetKey, setTargetKey] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = targets.find(
    (target) => `${target.targetType}:${target.targetId}` === targetKey,
  );
  const maximum = Math.min(availableCredit, selected?.remainingAmount ?? 0);

  useEffect(() => {
    if (!open) return;
    setTargetKey("");
    setAmount("");
    setNotes("");
    setError(null);
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!selected || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > maximum) {
      setError(lang === "ar" ? "اختر مستحقاً وأدخل مبلغاً لا يتجاوز الحد الأقصى." : "Choisissez une créance et saisissez un montant inférieur au maximum.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/customers/${customerId}/credit/apply`, {
        method: "POST",
        body: JSON.stringify({
          targetType: selected.targetType,
          targetId: selected.targetId,
          amount: numericAmount,
          notes: notes || undefined,
        }),
      });
      onClose();
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to apply customer credit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "استخدام رصيد الزبون" : "Utiliser le crédit client"} maxWidth={620}>
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-2 gap-3">
          <CreditMetric label={lang === "ar" ? "الرصيد المتاح" : "Crédit disponible"} value={availableCredit} lang={lang} primary />
          <CreditMetric label={lang === "ar" ? "الحد الأقصى للعملية" : "Maximum pour la sélection"} value={maximum} lang={lang} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "المستحق المراد تسديده *" : "Créance à régler *"}>
            <Select value={targetKey} onChange={(event) => { setTargetKey(event.target.value); setAmount(""); }}>
              <option value="">{lang === "ar" ? "اختر مستحقاً" : "Choisir une créance"}</option>
              {targets.map((target) => (
                <option key={`${target.targetType}:${target.targetId}`} value={`${target.targetType}:${target.targetId}`}>
                  {target.targetType === "INVOICE" ? (lang === "ar" ? "فاتورة" : "Facture") : (lang === "ar" ? "مستحق سابق" : "Créance antérieure")} · {target.label} · {formatMoney(target.remainingAmount, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={lang === "ar" ? "المبلغ المستخدم *" : "Montant à utiliser *"}>
            <TextInput required disabled={!selected} type="number" min="0.01" step="0.01" max={maximum} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
            <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </div>
        {error ? <FormError message={error} /> : null}
        <ModalButtons saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function ReverseCreditModal({
  customerId,
  transaction,
  onClose,
  onSaved,
}: {
  customerId: number;
  transaction: CustomerCreditTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction) return;
    setReason("");
    setError(null);
  }, [transaction]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!transaction || reason.trim().length < 3) {
      setError(lang === "ar" ? "اذكر سبب الإلغاء بوضوح." : "Indiquez clairement le motif de l'annulation.");
      return;
    }
    setSaving(true);
    try {
      await fetchJson(`/customers/${customerId}/credit/transactions/${transaction.id}/reverse`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      onClose();
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reverse credit transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={Boolean(transaction)} onClose={onClose} title={lang === "ar" ? "تأكيد إلغاء عملية الرصيد" : "Confirmer l'annulation"} maxWidth={540}>
      <form onSubmit={submit} className="p-6">
        {transaction ? (
          <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: "rgba(201,138,134,0.12)" }}>
            <strong>{transactionTypeLabel(transaction.type, lang)}</strong>
            <div className="mt-1" style={{ color: "#b46a66", fontSize: 18, fontWeight: 900 }}>
              {formatMoney(transaction.amount, lang)}
            </div>
          </div>
        ) : null}
        <Field label={lang === "ar" ? "سبب الإلغاء *" : "Motif de l'annulation *"}>
          <Textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        {error ? <FormError message={error} /> : null}
        <ModalButtons saving={saving} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function ModalButtons({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? (lang === "ar" ? "جارٍ الحفظ..." : "Enregistrement...") : (lang === "ar" ? "تأكيد" : "Confirmer")}
      </Button>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ color: "#a94f4a", backgroundColor: "rgba(201,138,134,0.12)" }}>{message}</div>;
}

function transactionTypeLabel(type: CustomerCreditTransaction["type"], lang: "ar" | "fr") {
  const labels: Record<CustomerCreditTransaction["type"], { ar: string; fr: string }> = {
    OVERPAYMENT: { ar: "مبلغ زائد عن الفاتورة", fr: "Paiement excédentaire" },
    MANUAL_ADVANCE: { ar: "دفعة مسبقة", fr: "Paiement anticipé" },
    SALE_USAGE: { ar: "استخدام على فاتورة", fr: "Utilisation sur facture" },
    LEGACY_DEBT_USAGE: { ar: "تسديد مستحق سابق", fr: "Utilisation sur créance antérieure" },
    REFUND: { ar: "إرجاع مبلغ للزبون", fr: "Remboursement au client" },
    ADJUSTMENT: { ar: "تصحيح إداري", fr: "Ajustement administratif" },
    REVERSAL: { ar: "عكس عملية", fr: "Annulation d'opération" },
  };
  return labels[type][lang];
}

function transactionReference(transaction: CustomerCreditTransaction, lang: "ar" | "fr") {
  if (transaction.invoiceNumber) return transaction.invoiceNumber;
  if (transaction.legacyDebtId) return `${lang === "ar" ? "مستحق سابق" : "Créance antérieure"} #${transaction.legacyDebtId}`;
  return transaction.reference || "—";
}
