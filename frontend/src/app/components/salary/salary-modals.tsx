import { useEffect, useState } from "react";
import { AlertTriangle, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import { useLanguage } from "../../language-context";
import { fetchJson, getArrayFromPayload } from "../../lib/api";
import {
  money,
  palette,
  salaryTypeCode,
  type BalanceRecord,
  type PayrollRecord,
  type WorkerOption,
} from "../../pages/salary-data";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "../modal-shell";

const today = () => new Date().toISOString().slice(0, 10);

function ErrorMessage({ message }: { message: string | null }) {
  return message ? <p className="rounded-xl px-3 py-2 text-sm" style={{ color: "#b46a66", backgroundColor: "rgba(180,106,102,.1)" }}>{message}</p> : null;
}

function WorkerSelect({ workers, value, onChange }: { workers: WorkerOption[]; value: string; onChange: (value: string) => void }) {
  return (
    <Select required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.fullName}</option>)}
    </Select>
  );
}

export function CalculateSalaryModal({
  open,
  onClose,
  onSaved,
  workers,
  periodStart,
  periodEnd,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  workers: WorkerOption[];
  periodStart: string;
  periodEnd: string;
}) {
  const { lang } = useLanguage();
  const [workerId, setWorkerId] = useState("");
  const [start, setStart] = useState(periodStart);
  const [end, setEnd] = useState(periodEnd);
  const [salaryMonth, setSalaryMonth] = useState(periodStart.slice(0, 7));
  const [installments, setInstallments] = useState("4");
  const [installmentNumber, setInstallmentNumber] = useState("1");
  const [pieces, setPieces] = useState("");
  const [piecePrice, setPiecePrice] = useState("");
  const [manualAmountOpen, setManualAmountOpen] = useState(false);
  const [manualGrossAmount, setManualGrossAmount] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [notes, setNotes] = useState("");
  const [advances, setAdvances] = useState<BalanceRecord[]>([]);
  const [advanceAmounts, setAdvanceAmounts] = useState<Record<number, string>>({});
  const [monthAllocated, setMonthAllocated] = useState(0);
  const [monthPaid, setMonthPaid] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const worker = workers.find((item) => String(item.id) === workerId);
  const salaryType = worker ? salaryTypeCode(worker.salaryType) : "monthly";
  const calculated = salaryType === "piece"
    ? (Number(pieces) || 0) * (Number(piecePrice) || 0)
    : (worker?.monthlySalary ?? 0) / Math.max(1, Number(installments) || 4);
  const grossAmount = salaryType === "monthly" && manualAmountOpen
    ? Number(manualGrossAmount) || 0
    : calculated;
  const selectedAdvance = Object.values(advanceAmounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const net = Math.max(0, grossAmount - selectedAdvance - (Number(otherDeductions) || 0));

  useEffect(() => {
    if (!open) return;
    setStart(periodStart);
    setEnd(periodEnd);
    setSalaryMonth(periodStart.slice(0, 7));
    setWorkerId((current) => current || String(workers[0]?.id ?? ""));
    setManualAmountOpen(false);
    setManualGrossAmount("");
    setError(null);
  }, [open, periodEnd, periodStart, workers]);

  useEffect(() => {
    if (salaryType !== "monthly") {
      setManualAmountOpen(false);
      setManualGrossAmount("");
    }
  }, [salaryType]);

  useEffect(() => {
    if (!open || !workerId) return;
    let cancelled = false;
    async function loadBalances() {
      try {
        const [advancePayload, payrollPayload] = await Promise.all([
          fetchJson<unknown>(`/payroll/advances?workerId=${workerId}`),
          fetchJson<unknown>(`/payroll?workerId=${workerId}&startDate=${salaryMonth}-01&endDate=${salaryMonth}-31&limit=100`),
        ]);
        if (cancelled) return;
        setAdvances((getArrayFromPayload(advancePayload) as BalanceRecord[]).filter((item) => item.remainingAmount > 0));
        const payrolls = getArrayFromPayload(payrollPayload) as PayrollRecord[];
        setMonthAllocated(payrolls.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + Number(item.grossAmount || 0), 0));
        setMonthPaid(payrolls.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load balances.");
      }
    }
    void loadBalances();
    return () => { cancelled = true; };
  }, [open, salaryMonth, workerId]);

  async function submit() {
    if (!worker) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/payroll", {
        method: "POST",
        body: JSON.stringify({
          workerId: worker.id,
          periodStart: start,
          periodEnd: end,
          ...(salaryType === "monthly" ? {
            salaryMonth,
            installmentsInMonth: Number(installments),
            installmentNumber: Number(installmentNumber),
          } : {
            piecesCompleted: Number(pieces),
            piecePrice: Number(piecePrice),
          }),
          ...(salaryType === "monthly" && manualAmountOpen ? { manualGrossAmount: Number(manualGrossAmount) } : {}),
          otherDeductions: Number(otherDeductions) || 0,
          advanceDeductions: Object.entries(advanceAmounts).filter(([, amount]) => Number(amount) > 0).map(([id, amount]) => ({ id: Number(id), amount: Number(amount) })),
          notes,
        }),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save payroll.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "حساب راتب أسبوعي" : "Nouvelle paie hebdomadaire"} maxWidth={720}>
      <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <Field label={lang === "ar" ? "العامل" : "Travailleur"}><WorkerSelect workers={workers} value={workerId} onChange={(value) => { setWorkerId(value); setAdvanceAmounts({}); setManualAmountOpen(false); setManualGrossAmount(""); }} /></Field>
        <Field label={lang === "ar" ? "نوع الأجر" : "Type de rémunération"}><TextInput readOnly value={salaryType === "monthly" ? (lang === "ar" ? "شهري مقسّم أسبوعياً" : "Mensuel par tranches") : (lang === "ar" ? "حسب القطعة" : "À la pièce")} /></Field>
        <Field label={lang === "ar" ? "بداية الفترة" : "Début de période"}><TextInput required type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
        <Field label={lang === "ar" ? "نهاية الفترة" : "Fin de période"}><TextInput required type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>

        {salaryType === "monthly" ? (
          <>
            <Field label={lang === "ar" ? "الشهر" : "Mois concerné"}><TextInput required type="month" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)} /></Field>
            <Field label={lang === "ar" ? "الراتب الشهري" : "Salaire mensuel"}><TextInput readOnly value={String(worker?.monthlySalary ?? 0)} /></Field>
            <Field label={lang === "ar" ? "عدد الدفعات في الشهر" : "Tranches dans le mois"}><TextInput required type="number" min="1" max="6" value={installments} onChange={(event) => setInstallments(event.target.value)} /></Field>
            <Field label={lang === "ar" ? "رقم الدفعة" : "Numéro de tranche"}><TextInput required type="number" min="1" max={installments || "6"} value={installmentNumber} onChange={(event) => setInstallmentNumber(event.target.value)} /></Field>
            <div className="rounded-xl p-3 text-sm sm:col-span-2" style={{ color: palette.muted, backgroundColor: palette.bg }}>
              {lang === "ar" ? "المحسوب سابقاً" : "Déjà calculé"}: {money(monthAllocated, lang)} · {lang === "ar" ? "المدفوع" : "Déjà payé"}: {money(monthPaid, lang)}
            </div>
          </>
        ) : (
          <>
            <Field label={lang === "ar" ? "عدد القطع المنجزة" : "Pièces réalisées"}><TextInput required type="number" min="1" value={pieces} onChange={(event) => setPieces(event.target.value)} /></Field>
            <Field label={lang === "ar" ? "السعر المطبق للقطعة" : "Prix appliqué par pièce"}><TextInput required type="number" min="0.01" step="0.01" value={piecePrice} onChange={(event) => setPiecePrice(event.target.value)} /></Field>
          </>
        )}

        {advances.length ? <BalanceInputs title={lang === "ar" ? "السلف المراد خصمها" : "Avances à déduire"} rows={advances} values={advanceAmounts} onChange={setAdvanceAmounts} lang={lang} /> : null}
        <Field label={lang === "ar" ? "اقتطاعات أخرى" : "Autres retenues"}><TextInput type="number" min="0" step="0.01" value={otherDeductions} onChange={(event) => setOtherDeductions(event.target.value)} /></Field>
        <div className="rounded-xl p-3" style={{ backgroundColor: `${palette.accent}12` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs" style={{ color: palette.muted }}>{lang === "ar" ? "المبلغ المتوقع للدفع" : "Montant estimé à verser"}</div>
            {salaryType === "monthly" ? (
              <button
                type="button"
                onClick={() => {
                  if (manualAmountOpen) {
                    setManualAmountOpen(false);
                    setManualGrossAmount("");
                    return;
                  }
                  setManualAmountOpen(true);
                  setManualGrossAmount(String(calculated));
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold"
                style={{ color: manualAmountOpen ? "#b46a66" : palette.primary, backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}
              >
                {manualAmountOpen ? <RotateCcw size={13} /> : <PencilLine size={13} />}
                {manualAmountOpen ? (lang === "ar" ? "إرجاع" : "Réinitialiser") : (lang === "ar" ? "تعديل" : "Modifier")}
              </button>
            ) : null}
          </div>
          {salaryType === "monthly" && manualAmountOpen ? (
            <div className="mt-2">
              <TextInput required type="number" min="0.01" step="0.01" value={manualGrossAmount} onChange={(event) => setManualGrossAmount(event.target.value)} />
              <div className="mt-2 text-xs" style={{ color: palette.muted }}>{lang === "ar" ? "الصافي بعد الاقتطاعات" : "Net après retenues"}: <strong style={{ color: palette.primary }}>{money(net, lang)}</strong></div>
            </div>
          ) : <strong className="mt-1 block text-lg" style={{ color: palette.primary }}>{money(net, lang)}</strong>}
        </div>
        <div className="sm:col-span-2"><Field label={lang === "ar" ? "ملاحظات" : "Notes"}><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>
        <div className="sm:col-span-2"><ErrorMessage message={error} /></div>
        <div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button><Button variant="primary" type="submit" disabled={saving || !worker}>{saving ? (lang === "ar" ? "جاري الحفظ..." : "Enregistrement...") : (lang === "ar" ? "حفظ الحساب" : "Enregistrer la paie")}</Button></div>
      </form>
    </ModalShell>
  );
}

function BalanceInputs({ title, rows, values, onChange, lang }: { title: string; rows: BalanceRecord[]; values: Record<number, string>; onChange: (value: Record<number, string>) => void; lang: "ar" | "fr" }) {
  return (
    <div className="rounded-2xl p-4 sm:col-span-2" style={{ border: `1px solid ${palette.border}`, backgroundColor: palette.bg }}>
      <div className="mb-3 text-sm font-bold" style={{ color: palette.text }}>{title}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <Field key={row.id} label={`${row.date} · ${lang === "ar" ? "الباقي" : "reste"} ${money(row.remainingAmount, lang)}`}>
            <TextInput type="number" min="0" max={row.remainingAmount} step="0.01" placeholder="0" value={values[row.id] ?? ""} onChange={(event) => onChange({ ...values, [row.id]: event.target.value })} />
          </Field>
        ))}
      </div>
    </div>
  );
}

function AdvanceMoneyModal({ open, onClose, onSaved, workers }: { open: boolean; onClose: () => void; onSaved: () => void; workers: WorkerOption[] }) {
  const { lang } = useLanguage();
  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setWorkerId((current) => current || String(workers[0]?.id ?? "")); setError(null); } }, [open, workers]);

  async function submit() {
    setSaving(true); setError(null);
    try {
      await fetchJson("/payroll/advances", { method: "POST", body: JSON.stringify({ workerId: Number(workerId), amount: Number(amount), date, notes }) });
      setAmount(""); setNotes(""); onSaved(); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save."); }
    finally { setSaving(false); }
  }

  const title = lang === "ar" ? "تسجيل سلفة" : "Enregistrer une avance";
  return <ModalShell open={open} onClose={onClose} title={title}><form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}><div className="sm:col-span-2"><Field label={lang === "ar" ? "العامل" : "Travailleur"}><WorkerSelect workers={workers} value={workerId} onChange={setWorkerId} /></Field></div><Field label={lang === "ar" ? "المبلغ" : "Montant"}><TextInput required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label={lang === "ar" ? "التاريخ" : "Date"}><TextInput required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><div className="sm:col-span-2"><Field label={lang === "ar" ? "ملاحظات" : "Notes"}><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div><div className="sm:col-span-2"><ErrorMessage message={error} /></div><div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button><Button variant="primary" type="submit" disabled={saving || !workerId}>{lang === "ar" ? "حفظ" : "Enregistrer"}</Button></div></form></ModalShell>;
}

export function AdvanceModal(props: Parameters<typeof AdvanceMoneyModal>[0]) { return <AdvanceMoneyModal {...props} />; }

export function CancelPayrollModal({ open, onClose, onCancelled, record }: { open: boolean; onClose: () => void; onCancelled: () => void; record: PayrollRecord | null }) {
  const { lang } = useLanguage();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(null);
  }, [open, record?.id]);

  const canCancel = Boolean(record && reason.trim().length >= 3);

  async function submit() {
    if (!record || !canCancel) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/payroll/${record.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      onCancelled();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel payroll.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "إلغاء تسجيل الراتب" : "Annuler l'enregistrement de paie"} maxWidth={620}>
      <form className="space-y-4 px-6 py-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(192,125,79,.35)", backgroundColor: "rgba(192,125,79,.1)" }}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(192,125,79,.16)", color: "#a87d3c" }}><AlertTriangle size={20} /></div>
            <div>
              <h3 style={{ color: "#8a5f26", fontWeight: 800 }}>{lang === "ar" ? "تأكيد إلغاء مسجل" : "Confirmation d'annulation"}</h3>
              <p className="mt-1 text-sm leading-6" style={{ color: "#8a5f26" }}>
                {lang === "ar"
                  ? "سيتم إلغاء هذا الراتب مع حفظ السبب في السجل. لا يمكن إلغاء راتب يحتوي على دفعات مسجلة؛ في هذه الحالة استخدم التصحيح أو الحذف النهائي عند الحاجة."
                  : "Cette paie sera marquée comme annulée avec un motif conservé dans l'historique. Une paie qui contient déjà des paiements ne peut pas être annulée par cette action."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <span style={{ color: palette.muted }}>{lang === "ar" ? "العامل" : "Travailleur"}</span><strong style={{ color: palette.text }}>{record?.workerName ?? "-"}</strong>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "الفترة" : "Période"}</span><strong style={{ color: palette.text }}>{record ? `${record.periodStart} -> ${record.periodEnd}` : "-"}</strong>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "الصافي المستحق" : "Net dû"}</span><strong style={{ color: palette.primary }}>{money(record?.amountDue ?? 0, lang)}</strong>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "المدفوع" : "Payé"}</span><strong style={{ color: "#4d8a6a" }}>{money(record?.paidAmount ?? 0, lang)}</strong>
          </div>
        </div>

        <Field label={lang === "ar" ? "سبب الإلغاء *" : "Motif d'annulation *"}>
          <Textarea
            required
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={lang === "ar" ? "مثال: خطأ في الفترة أو المبلغ..." : "Exemple : erreur de période ou de montant..."}
          />
        </Field>

        <ErrorMessage message={error} />

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{lang === "ar" ? "رجوع" : "Retour"}</Button>
          <button
            type="submit"
            disabled={!canCancel || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity"
            style={{ backgroundColor: "#a87d3c", color: "#fff", opacity: !canCancel || saving ? 0.55 : 1, cursor: !canCancel || saving ? "not-allowed" : "pointer" }}
          >
            <RotateCcw size={15} />{saving ? (lang === "ar" ? "جاري الإلغاء..." : "Annulation...") : (lang === "ar" ? "تأكيد الإلغاء" : "Confirmer l'annulation")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function DeletePayrollModal({ open, onClose, onDeleted, record }: { open: boolean; onClose: () => void; onDeleted: () => void; record: PayrollRecord | null }) {
  const { lang } = useLanguage();
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmation("");
    setAcknowledged(false);
    setError(null);
  }, [open, record?.id]);

  const expectedName = record?.workerName.trim() ?? "";
  const canDelete = Boolean(record && acknowledged && confirmation.trim().toLocaleLowerCase() === expectedName.toLocaleLowerCase());

  async function submit() {
    if (!record || !canDelete) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/payroll/${record.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          confirmation: confirmation.trim(),
          acknowledgePermanentDeletion: acknowledged,
        }),
      });
      onDeleted();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete payroll.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "حذف الراتب نهائياً" : "Suppression définitive de la paie"} maxWidth={560}>
      <form className="space-y-4 px-6 py-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(180,106,102,.35)", backgroundColor: "rgba(180,106,102,.1)" }}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(180,106,102,.14)", color: "#b46a66" }}><AlertTriangle size={20} /></div>
            <div>
              <h3 style={{ color: "#7c3935", fontWeight: 800 }}>{lang === "ar" ? "تنبيه قبل الحذف" : "Alerte avant suppression"}</h3>
              <p className="mt-1 text-sm leading-6" style={{ color: "#7c3935" }}>
                {lang === "ar"
                  ? "سيتم حذف هذا الراتب وكل الدفعات المرتبطة به نهائياً. سيتم أيضاً إرجاع السلف المخصومة من هذا الراتب إلى أرصدتها."
                  : "Cette paie et tous ses paiements liés seront supprimés définitivement. Les avances déduites par cette paie seront aussi restaurées dans leurs soldes."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <span style={{ color: palette.muted }}>{lang === "ar" ? "العامل" : "Travailleur"}</span><strong style={{ color: palette.text }}>{record?.workerName ?? "-"}</strong>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "الفترة" : "Période"}</span><strong style={{ color: palette.text }}>{record ? `${record.periodStart} -> ${record.periodEnd}` : "-"}</strong>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "المبلغ المدفوع" : "Montant payé"}</span><strong style={{ color: "#4d8a6a" }}>{money(record?.paidAmount ?? 0, lang)}</strong>
            <span style={{ color: palette.muted }}>{lang === "ar" ? "الاقتطاعات" : "Retenues"}</span><strong style={{ color: "#b46a66" }}>{money(record?.totalDeductions ?? 0, lang)}</strong>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl p-3 text-sm" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.text }}>
          <input className="mt-1" type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
          <span>{lang === "ar" ? "أفهم أن هذا حذف نهائي من النظام." : "Je comprends que cette suppression est définitive dans le système."}</span>
        </label>

        <Field label={lang === "ar" ? `اكتب اسم العامل للتأكيد: ${expectedName}` : `Tapez le nom du travailleur pour confirmer : ${expectedName}`}>
          <TextInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        </Field>

        <ErrorMessage message={error} />

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button>
          <button
            type="submit"
            disabled={!canDelete || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity"
            style={{ backgroundColor: "#b46a66", color: "#fff", opacity: !canDelete || saving ? 0.55 : 1, cursor: !canDelete || saving ? "not-allowed" : "pointer" }}
          >
            <Trash2 size={15} />{saving ? (lang === "ar" ? "جاري الحذف..." : "Suppression...") : (lang === "ar" ? "حذف نهائي" : "Supprimer définitivement")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function PaymentModal({ open, onClose, onSaved, record }: { open: boolean; onClose: () => void; onSaved: () => void; record: PayrollRecord | null }) {
  const { lang } = useLanguage();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && record) { setAmount(String(record.remainingAmount)); setError(null); } }, [open, record]);
  async function submit() { if (!record) return; setSaving(true); setError(null); try { await fetchJson(`/payroll/${record.id}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(amount), date, method, reference, notes }) }); onSaved(); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save payment."); } finally { setSaving(false); } }
  return <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "تسجيل دفع الراتب" : "Enregistrer un paiement"}><form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}><div className="rounded-xl p-3 sm:col-span-2" style={{ backgroundColor: palette.bg }}><strong>{record?.workerName}</strong><div className="mt-1 text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "المتبقي" : "Reste dû"}: {money(record?.remainingAmount ?? 0, lang)}</div></div><Field label={lang === "ar" ? "المبلغ المدفوع" : "Montant payé"}><TextInput required type="number" min="0.01" max={record?.remainingAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label={lang === "ar" ? "التاريخ" : "Date"}><TextInput required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label={lang === "ar" ? "طريقة الدفع" : "Mode de paiement"}><Select value={method} onChange={(event) => setMethod(event.target.value)}><option value="CASH">{lang === "ar" ? "نقداً" : "Espèces"}</option><option value="TRANSFER">{lang === "ar" ? "تحويل" : "Virement"}</option><option value="OTHER">{lang === "ar" ? "أخرى" : "Autre"}</option></Select></Field><Field label={lang === "ar" ? "المرجع" : "Référence"}><TextInput value={reference} onChange={(event) => setReference(event.target.value)} /></Field><div className="sm:col-span-2"><Field label={lang === "ar" ? "ملاحظات" : "Notes"}><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div><div className="sm:col-span-2"><ErrorMessage message={error} /></div><div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button><Button variant="primary" type="submit" disabled={saving || !record}>{lang === "ar" ? "تأكيد الدفع" : "Confirmer le paiement"}</Button></div></form></ModalShell>;
}
