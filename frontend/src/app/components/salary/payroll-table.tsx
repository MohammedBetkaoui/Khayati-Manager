import { Eye, Wallet } from "lucide-react";
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
import { Badge } from "../kit";

export function PayrollTable({
  records,
  selectedId,
  onSelect,
  onPay,
}: {
  records: PayrollRecord[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onPay: (record: PayrollRecord) => void;
}) {
  const { lang } = useLanguage();
  const labels = lang === "ar"
    ? ["العامل", "الوظيفة", "نوع الأجر", "الفترة", "المستحق", "المدفوع", "الباقي", "الحالة", "الإجراءات"]
    : ["Travailleur", "Poste", "Type", "Période", "Dû", "Payé", "Reste", "Statut", "Actions"];

  if (records.length === 0) {
    return (
      <div className="flex min-h-[260px] items-center justify-center px-6 text-center" style={{ color: palette.muted }}>
        {lang === "ar" ? "لا توجد رواتب مسجلة لهذه الفترة." : "Aucune paie enregistrée pour cette période."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 1040 }}>
        <thead>
          <tr style={{ backgroundColor: palette.bg }}>
            {labels.map((label) => (
              <th key={label} className="px-4 py-3 text-start" style={{ color: palette.muted, fontSize: 12, fontWeight: 700 }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const status = payrollStatusCode(record.status);
            const salaryType = salaryTypeCode(record.salaryType);
            return (
              <tr
                key={record.id}
                onClick={() => onSelect(record.id)}
                className="cursor-pointer transition-colors"
                style={{
                  borderTop: `1px solid ${palette.border}`,
                  backgroundColor: selectedId === record.id ? `${palette.accent}0d` : palette.surface,
                }}
              >
                <td className="px-4 py-3.5" style={{ fontWeight: 700, color: palette.text }}>{record.workerName}</td>
                <td className="px-4 py-3.5" style={{ color: palette.muted, fontSize: 13 }}>{record.role || "-"}</td>
                <td className="px-4 py-3.5"><Badge bg={`${palette.primary}12`} fg={palette.primary}>{salaryTypeLabels[salaryType][lang]}</Badge></td>
                <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: palette.muted, fontSize: 12.5 }}>{record.periodStart} → {record.periodEnd}</td>
                <td className="px-4 py-3.5 whitespace-nowrap" style={{ fontWeight: 700 }}>{money(record.amountDue, lang)}</td>
                <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#4d8a6a" }}>{money(record.paidAmount, lang)}</td>
                <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: record.remainingAmount > 0 ? "#b46a66" : palette.muted }}>{money(record.remainingAmount, lang)}</td>
                <td className="px-4 py-3.5"><Badge bg={`${payrollStatusColors[status]}18`} fg={payrollStatusColors[status]} dot={payrollStatusColors[status]}>{payrollStatusLabels[status][lang]}</Badge></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={lang === "ar" ? "التفاصيل" : "Détails"} onClick={(event) => { event.stopPropagation(); onSelect(record.id); }} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: palette.primary, border: `1px solid ${palette.border}` }}><Eye size={15} /></button>
                    {record.remainingAmount > 0 && status !== "cancelled" ? (
                      <button type="button" aria-label={lang === "ar" ? "دفع" : "Payer"} onClick={(event) => { event.stopPropagation(); onPay(record); }} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: "#4d8a6a", border: `1px solid ${palette.border}` }}><Wallet size={15} /></button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
