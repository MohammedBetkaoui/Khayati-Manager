import { palette } from "../content";

export type SalaryType = "monthly" | "piece";
export type PayrollStatus = "draft" | "calculated" | "partial" | "paid" | "cancelled";

export type WorkerOption = {
  id: number;
  fullName: string;
  role: string;
  salaryType: string;
  monthlySalary: number;
  status: string;
};

export type SalaryPayment = {
  id: number;
  amount: number;
  date: string;
  method: string;
  reference: string;
  notes: string;
};

export type PayrollRecord = {
  id: number;
  workerId: number;
  workerName: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  salaryMonth: string | null;
  salaryType: string;
  monthlySalary: number;
  installmentsInMonth: number;
  installmentNumber: number;
  piecesCompleted: number;
  piecePrice: number;
  grossAmount: number;
  advanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  amountDue: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  notes: string;
  paymentDate: string | null;
  payments: SalaryPayment[];
};

export type DashboardStats = {
  activeWorkers: number;
  salariesDueThisWeek: number;
  paidThisWeek: number;
  remainingToPay: number;
  activeAdvances: number;
};

export type BalanceRecord = {
  id: number;
  workerId: number;
  amount?: number;
  initialAmount?: number;
  deductedAmount?: number;
  repaidAmount?: number;
  remainingAmount: number;
  date: string;
  status: string;
  notes: string;
};

export const salaryTypeLabels = {
  monthly: { ar: "شهري مقسّم أسبوعياً", fr: "Mensuel par tranches" },
  piece: { ar: "حسب القطعة", fr: "À la pièce" },
};

export const payrollStatusLabels = {
  draft: { ar: "قيد الإعداد", fr: "À calculer" },
  calculated: { ar: "محسوب", fr: "Calculé" },
  partial: { ar: "مدفوع جزئياً", fr: "Partiellement payé" },
  paid: { ar: "مدفوع", fr: "Payé" },
  cancelled: { ar: "ملغى", fr: "Annulé" },
};

export const payrollStatusColors: Record<PayrollStatus, string> = {
  draft: "#8a887f",
  calculated: "#a87d3c",
  partial: "#c07d4f",
  paid: "#4d8a6a",
  cancelled: "#b46a66",
};

export function salaryTypeCode(value: string): SalaryType {
  return value === "حسب القطعة" || value === "PIECE" ? "piece" : "monthly";
}

export function payrollStatusCode(value: string): PayrollStatus {
  if (value === "PAID") return "paid";
  if (value === "PARTIALLY_PAID") return "partial";
  if (value === "CANCELLED") return "cancelled";
  if (value === "DRAFT") return "draft";
  return "calculated";
}

export function money(value: number, lang: "ar" | "fr") {
  return `${Number(value || 0).toLocaleString("fr-DZ", { maximumFractionDigits: 2 })} ${lang === "ar" ? "د.ج" : "DA"}`;
}

export { palette };
