import { Ban, CalendarDays, Coins, HandCoins, Trash2, Wallet, WalletCards, X } from "lucide-react";
import { useLanguage } from "../../language-context";
import {
  money,
  palette,
  payrollStatusCode,
  payrollStatusColors,
  payrollStatusLabels,
  salaryTypeCode,
  salaryTypeLabels,
  type PayrollRecord,
} from "../../pages/salary-data";
import { Badge, Button } from "../kit";

function AmountLine({ label, value, color = palette.text }: { label: string; value: string; color?: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span style={{ color: palette.muted }}>{label}</span><strong style={{ color }}>{value}</strong></div>;
}

export function SalaryDetailsBar({
  record,
  onClose,
  onPay,
  onCancel,
  onDelete,
}: {
  record: PayrollRecord;
  onClose: () => void;
  onPay: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { lang } = useLanguage();
  const status = payrollStatusCode(record.status);
  const type = salaryTypeCode(record.salaryType);

  return (
    <section
      style={{
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        background: `linear-gradient(120deg, ${palette.surface}, ${palette.accent}0a)`,
        padding: 20,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 style={{ color: palette.text, fontSize: 18, fontWeight: 800 }}>{record.workerName}</h2>
            <Badge bg={`${payrollStatusColors[status]}18`} fg={payrollStatusColors[status]}>{payrollStatusLabels[status][lang]}</Badge>
            <Badge bg={`${palette.primary}12`} fg={palette.primary}>{salaryTypeLabels[type][lang]}</Badge>
          </div>
          <div className="mt-2 flex items-center gap-2" style={{ color: palette.muted, fontSize: 13 }}><CalendarDays size={15} />{record.periodStart} → {record.periodEnd}</div>
        </div>
        <div className="flex items-center gap-2">
          {record.remainingAmount > 0 && status !== "cancelled" ? <Button variant="primary" onClick={onPay}><Wallet size={15} />{lang === "ar" ? "تسجيل دفع" : "Enregistrer un paiement"}</Button> : null}
          {record.paidAmount === 0 && status !== "cancelled" ? <Button variant="secondary" onClick={onCancel}><Ban size={15} />{lang === "ar" ? "إلغاء مسجل" : "Annuler avec trace"}</Button> : null}
          <Button variant="secondary" onClick={onDelete}><Trash2 size={15} />{lang === "ar" ? "حذف نهائي" : "Supprimer"}</Button>
          <button type="button" aria-label="close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: palette.muted, border: `1px solid ${palette.border}` }}><X size={17} /></button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          <div className="mb-3 flex items-center gap-2 font-bold" style={{ color: palette.text }}><Coins size={16} color={palette.accent} />{lang === "ar" ? "أساس الحساب" : "Base du calcul"}</div>
          <div className="space-y-2.5">
            {type === "monthly" ? (
              <>
                <AmountLine label={lang === "ar" ? "الراتب الشهري" : "Salaire mensuel"} value={money(record.monthlySalary, lang)} />
                <AmountLine label={lang === "ar" ? "الدفعة" : "Tranche"} value={`${record.installmentNumber}/${record.installmentsInMonth}`} />
              </>
            ) : (
              <>
                <AmountLine label={lang === "ar" ? "القطع" : "Pièces"} value={record.piecesCompleted.toLocaleString()} />
                <AmountLine label={lang === "ar" ? "سعر القطعة" : "Prix par pièce"} value={money(record.piecePrice, lang)} />
              </>
            )}
            <AmountLine label={lang === "ar" ? "المبلغ المحسوب" : "Montant calculé"} value={money(record.grossAmount, lang)} color={palette.primary} />
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          <div className="mb-3 flex items-center gap-2 font-bold" style={{ color: palette.text }}><HandCoins size={16} color="#c07d4f" />{lang === "ar" ? "الاقتطاعات الموثقة" : "Retenues tracées"}</div>
          <div className="space-y-2.5">
            <AmountLine label={lang === "ar" ? "خصم السلف" : "Avances déduites"} value={money(record.advanceDeduction, lang)} />
            <AmountLine label={lang === "ar" ? "اقتطاعات أخرى" : "Autres retenues"} value={money(record.otherDeductions, lang)} />
            <AmountLine label={lang === "ar" ? "الصافي المستحق" : "Net dû"} value={money(record.amountDue, lang)} color="#a87d3c" />
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          <div className="mb-3 flex items-center gap-2 font-bold" style={{ color: palette.text }}><WalletCards size={16} color="#4f6a99" />{lang === "ar" ? "سجل الدفع" : "Règlements"}</div>
          {record.payments?.length ? (
            <div className="space-y-2">
              {record.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 text-sm"><span style={{ color: palette.muted }}>{payment.date} · {payment.method}</span><strong style={{ color: "#4d8a6a" }}>{money(payment.amount, lang)}</strong></div>
              ))}
            </div>
          ) : <p className="text-sm" style={{ color: palette.muted }}>{lang === "ar" ? "لم يسجل أي دفع بعد." : "Aucun paiement enregistré."}</p>}
          <div className="mt-3 border-t pt-3" style={{ borderColor: palette.border }}><AmountLine label={lang === "ar" ? "الباقي" : "Reste"} value={money(record.remainingAmount, lang)} color={record.remainingAmount > 0 ? "#b46a66" : "#4d8a6a"} /></div>
        </div>
      </div>
      {record.notes ? <p className="mt-4 text-sm" style={{ color: palette.muted }}>{record.notes}</p> : null}
    </section>
  );
}
