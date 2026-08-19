import { useEffect, useState } from "react";
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
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [notes, setNotes] = useState("");
  const [advances, setAdvances] = useState<BalanceRecord[]>([]);
  const [loans, setLoans] = useState<BalanceRecord[]>([]);
  const [advanceAmounts, setAdvanceAmounts] = useState<Record<number, string>>({});
  const [loanAmounts, setLoanAmounts] = useState<Record<number, string>>({});
  const [monthAllocated, setMonthAllocated] = useState(0);
  const [monthPaid, setMonthPaid] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const worker = workers.find((item) => String(item.id) === workerId);
  const salaryType = worker ? salaryTypeCode(worker.salaryType) : "monthly";
  const calculated = salaryType === "piece"
    ? (Number(pieces) || 0) * (Number(piecePrice) || 0)
    : (worker?.monthlySalary ?? 0) / Math.max(1, Number(installments) || 4);
  const selectedAdvance = Object.values(advanceAmounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const selectedLoan = Object.values(loanAmounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const net = Math.max(0, calculated - selectedAdvance - selectedLoan - (Number(otherDeductions) || 0));

  useEffect(() => {
    if (!open) return;
    setStart(periodStart);
    setEnd(periodEnd);
    setSalaryMonth(periodStart.slice(0, 7));
    setWorkerId((current) => current || String(workers[0]?.id ?? ""));
    setError(null);
  }, [open, periodEnd, periodStart, workers]);

  useEffect(() => {
    if (!open || !workerId) return;
    let cancelled = false;
    async function loadBalances() {
      try {
        const [advancePayload, loanPayload, payrollPayload] = await Promise.all([
          fetchJson<unknown>(`/payroll/advances?workerId=${workerId}`),
          fetchJson<unknown>(`/payroll/loans?workerId=${workerId}`),
          fetchJson<unknown>(`/payroll?workerId=${workerId}&startDate=${salaryMonth}-01&endDate=${salaryMonth}-31&limit=100`),
        ]);
        if (cancelled) return;
        setAdvances((getArrayFromPayload(advancePayload) as BalanceRecord[]).filter((item) => item.remainingAmount > 0));
        setLoans((getArrayFromPayload(loanPayload) as BalanceRecord[]).filter((item) => item.remainingAmount > 0));
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
          otherDeductions: Number(otherDeductions) || 0,
          advanceDeductions: Object.entries(advanceAmounts).filter(([, amount]) => Number(amount) > 0).map(([id, amount]) => ({ id: Number(id), amount: Number(amount) })),
          loanDeductions: Object.entries(loanAmounts).filter(([, amount]) => Number(amount) > 0).map(([id, amount]) => ({ id: Number(id), amount: Number(amount) })),
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
        <Field label={lang === "ar" ? "العامل" : "Travailleur"}><WorkerSelect workers={workers} value={workerId} onChange={(value) => { setWorkerId(value); setAdvanceAmounts({}); setLoanAmounts({}); }} /></Field>
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
        {loans.length ? <BalanceInputs title={lang === "ar" ? "اقتطاع من القروض" : "Retenues sur prêts"} rows={loans} values={loanAmounts} onChange={setLoanAmounts} lang={lang} /> : null}
        <Field label={lang === "ar" ? "اقتطاعات أخرى" : "Autres retenues"}><TextInput type="number" min="0" step="0.01" value={otherDeductions} onChange={(event) => setOtherDeductions(event.target.value)} /></Field>
        <div className="rounded-xl p-3" style={{ backgroundColor: `${palette.accent}12` }}><div className="text-xs" style={{ color: palette.muted }}>{lang === "ar" ? "المبلغ المتوقع للدفع" : "Montant estimé à verser"}</div><strong className="mt-1 block text-lg" style={{ color: palette.primary }}>{money(net, lang)}</strong></div>
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

function WorkerMoneyModal({ kind, open, onClose, onSaved, workers }: { kind: "advance" | "loan"; open: boolean; onClose: () => void; onSaved: () => void; workers: WorkerOption[] }) {
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
      await fetchJson(kind === "advance" ? "/payroll/advances" : "/payroll/loans", { method: "POST", body: JSON.stringify({ workerId: Number(workerId), amount: Number(amount), date, notes }) });
      setAmount(""); setNotes(""); onSaved(); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save."); }
    finally { setSaving(false); }
  }

  const title = kind === "advance" ? (lang === "ar" ? "تسجيل سلفة" : "Enregistrer une avance") : (lang === "ar" ? "تسجيل قرض" : "Enregistrer un prêt");
  return <ModalShell open={open} onClose={onClose} title={title}><form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}><div className="sm:col-span-2"><Field label={lang === "ar" ? "العامل" : "Travailleur"}><WorkerSelect workers={workers} value={workerId} onChange={setWorkerId} /></Field></div><Field label={lang === "ar" ? "المبلغ" : "Montant"}><TextInput required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label={lang === "ar" ? "التاريخ" : "Date"}><TextInput required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><div className="sm:col-span-2"><Field label={lang === "ar" ? "ملاحظات" : "Notes"}><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div><div className="sm:col-span-2"><ErrorMessage message={error} /></div><div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button><Button variant="primary" type="submit" disabled={saving || !workerId}>{lang === "ar" ? "حفظ" : "Enregistrer"}</Button></div></form></ModalShell>;
}

export function AdvanceModal(props: Omit<Parameters<typeof WorkerMoneyModal>[0], "kind">) { return <WorkerMoneyModal {...props} kind="advance" />; }
export function LoanModal(props: Omit<Parameters<typeof WorkerMoneyModal>[0], "kind">) { return <WorkerMoneyModal {...props} kind="loan" />; }

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

export function LoanRepaymentModal({ open, onClose, onSaved, loan }: { open: boolean; onClose: () => void; onSaved: () => void; loan: BalanceRecord | null }) {
  const { lang } = useLanguage();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState("CASH");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open && loan) { setAmount(String(loan.remainingAmount)); setError(null); } }, [loan, open]);
  async function submit() { if (!loan) return; try { await fetchJson(`/payroll/loans/${loan.id}/repayments`, { method: "POST", body: JSON.stringify({ amount: Number(amount), date, method }) }); onSaved(); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save repayment."); } }
  return <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "تسجيل تسديد قرض" : "Remboursement du prêt"}><form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}><Field label={lang === "ar" ? "المبلغ" : "Montant"}><TextInput required type="number" min="0.01" max={loan?.remainingAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field><Field label={lang === "ar" ? "التاريخ" : "Date"}><TextInput required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><div className="sm:col-span-2"><Field label={lang === "ar" ? "طريقة الدفع" : "Mode"}><Select value={method} onChange={(event) => setMethod(event.target.value)}><option value="CASH">{lang === "ar" ? "نقداً" : "Espèces"}</option><option value="TRANSFER">{lang === "ar" ? "تحويل" : "Virement"}</option><option value="OTHER">{lang === "ar" ? "أخرى" : "Autre"}</option></Select></Field></div><div className="sm:col-span-2"><ErrorMessage message={error} /></div><div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button><Button variant="primary" type="submit">{lang === "ar" ? "تسجيل" : "Enregistrer"}</Button></div></form></ModalShell>;
}
