import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Coins,
  CreditCard,
  Edit,
  Eye,
  FileText,
  Gauge,
  HandCoins,
  History,
  MinusCircle,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Scissors,
  StickyNote,
  Timer,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { palette, type Lang } from "../content";
import { AppHeader } from "../components/app-header";
import { Avatar, Badge, Button, Field, ProgressBar, Select, TextInput } from "../components/kit";
import { PageBackground, StitchDivider } from "../components/page-background";
import { ModalShell, Textarea } from "../components/production/modal-shell";
import { useLanguage } from "../language-context";

type Bilingual = Record<Lang, string>;
type WorkerTab = "overview" | "production" | "attendance" | "payroll" | "adjustments" | "notes";
type WorkerStatus = "active" | "stopped";
type SalaryType = "piece" | "daily" | "monthly" | "mixed";
type AttendanceStatus = "present" | "absent" | "late";
type PayrollStatus = "paid" | "partial" | "unpaid";
type AdjustmentType = "bonus" | "deduction";

type WorkerProfile = {
  name: Bilingual;
  role: Bilingual;
  salaryType: SalaryType;
  pieceRate: number;
  startDate: string;
  status: WorkerStatus;
  phone: string;
};

type ProductionEntry = {
  id: string;
  date: string;
  order: string;
  task: Bilingual;
  pieces: number;
  pieceRate: number;
  notes: Bilingual;
};

type AttendanceEntry = {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  late: string;
  reason?: Bilingual;
};

type PayrollEntry = {
  id: string;
  period: Bilingual;
  salaryType: SalaryType;
  baseSalary: number;
  productionBonus: number;
  bonuses: number;
  deductions: number;
  advances: number;
  netSalary: number;
  paidAmount: number;
  status: PayrollStatus;
};

type AdvanceEntry = {
  id: string;
  date: string;
  amount: number;
  method: Bilingual;
  status: Bilingual;
};

type AdjustmentEntry = {
  id: string;
  type: AdjustmentType;
  amount: number;
  reason: Bilingual;
  date: string;
};

type ActivityEntry = {
  title: Bilingual;
  detail: Bilingual;
};

type Notice = {
  title: Bilingual;
  detail: Bilingual;
};

const workerText = {
  ar: {
    currency: "دج",
    breadcrumb: ["الرئيسية", "تسيير الرواتب", "العمال", "ملف العامل"],
    title: "ملف العامل",
    workerName: "أحمد بن علي",
    subtitle: "متابعة الإنتاج، الحضور، الرواتب، والسجل المالي للعامل",
    back: "العودة إلى قائمة العمال",
    actions: {
      editWorker: "تعديل معلومات العامل",
      attendance: "تسجيل حضور",
      addProduction: "إضافة إنتاج",
      calculateSalary: "حساب راتب",
      printPayslip: "طباعة كشف الراتب",
      call: "اتصال",
      edit: "تعديل",
      stopWorker: "إيقاف العامل",
      activateWorker: "إعادة تفعيل العامل",
      view: "عرض",
      save: "حفظ",
      cancel: "إلغاء",
      paySalary: "دفع الراتب",
      addAdvance: "إضافة سلفة",
      addBonus: "إضافة مكافأة",
      addDeduction: "إضافة خصم",
      addNote: "إضافة ملاحظة",
      print: "طباعة",
      viewPayslip: "عرض الكشف",
    },
    profile: {
      name: "الاسم",
      role: "الوظيفة",
      salaryType: "نوع الأجر",
      pieceRate: "سعر القطعة",
      startDate: "تاريخ بداية العمل",
      status: "الحالة",
      phone: "رقم الهاتف",
      active: "عامل نشط",
      stopped: "متوقف",
    },
    summary: {
      production: "إجمالي الإنتاج",
      productionHelp: "كل القطع المسجلة لهذا العامل",
      salaries: "إجمالي الرواتب",
      salariesHelp: "إجمالي كشوف الرواتب المحسوبة",
      currentSalary: "راتب الشهر الحالي",
      currentSalaryHelp: "الصافي المستحق لهذا الشهر",
      workDays: "أيام العمل",
      workDaysHelp: "أيام الحضور المسجلة",
      advances: "السلفيات",
      advancesHelp: "سلفيات لم تغلق بالكامل",
      bonuses: "المكافآت",
      bonusesHelp: "مكافآت الأداء والجودة",
    },
    tabs: {
      overview: "نظرة عامة",
      production: "الإنتاج",
      attendance: "الحضور",
      payroll: "الرواتب",
      adjustments: "السلفيات والمكافآت",
      notes: "الملاحظات",
    },
    sections: {
      workerProduction: "إنتاج العامل",
      latestOps: "آخر العمليات",
      productionLog: "سجل الإنتاج",
      attendanceLog: "سجل الحضور",
      payrollHistory: "تاريخ الرواتب",
      advances: "السلفيات",
      bonusesDeductions: "المكافآت والخصومات",
      notes: "ملاحظات العامل",
      sidebar: "ملخص العامل",
      salaryStatus: "حالة الراتب",
      productivity: "الإنتاجية",
      lastActivity: "آخر نشاط",
      salaryMethod: "طريقة حساب الراتب",
      calculation: "الحساب",
      net: "الصافي",
    },
    overview: {
      thisMonth: "هذا الشهر",
      thisWeek: "هذا الأسبوع",
      dailyAverage: "متوسط يومي",
      pieces: "قطعة",
      day: "يوم",
      presentDays: "أيام الحضور",
      absentDays: "أيام الغياب",
      lateDays: "أيام التأخير",
    },
    productionTable: {
      date: "التاريخ",
      order: "الطلبية",
      task: "نوع المهمة",
      pieces: "عدد القطع",
      pieceRate: "سعر القطعة",
      amount: "المبلغ",
      actions: "الإجراءات",
    },
    attendanceTable: {
      date: "التاريخ",
      status: "الحالة",
      checkIn: "وقت الدخول",
      checkOut: "وقت الخروج",
      late: "التأخير",
    },
    payrollTable: {
      period: "الفترة",
      salaryType: "نوع الأجر",
      base: "الأجر الأساسي",
      production: "الإنتاج",
      bonuses: "المكافآت",
      deductions: "الخصومات",
      advances: "السلفيات",
      net: "الصافي",
      status: "الحالة",
      actions: "الإجراءات",
    },
    adjustmentTable: {
      date: "التاريخ",
      amount: "المبلغ",
      method: "طريقة الخصم",
      status: "الحالة",
      type: "النوع",
      reason: "السبب",
    },
    statuses: {
      present: "حاضر",
      absent: "غائب",
      late: "متأخر",
      paid: "مدفوع",
      partial: "مدفوع جزئياً",
      unpaid: "غير مدفوع",
      piece: "حسب القطعة",
      daily: "يومي",
      monthly: "شهري",
      mixed: "مختلط",
      bonus: "مكافأة",
      deduction: "خصم",
    },
    sidebar: {
      monthSalary: "راتب الشهر",
      status: "الحالة",
      productionLevel: "مستوى الإنتاج",
      rank: "الترتيب",
      rankValue: "الثالث بين العمال",
      lastAttendance: "آخر حضور",
      today: "اليوم",
      lastProduction: "آخر إنتاج",
      lastSalary: "آخر راتب",
      period: "جوان 2026",
      bonus: "مكافأة",
      deduction: "خصم",
      advance: "سلفة",
    },
    modals: {
      productionTitle: "إضافة إنتاج",
      salaryTitle: "حساب راتب",
      absenceTitle: "تسجيل حضور / غياب",
      advanceTitle: "إضافة سلفة",
      adjustmentTitle: "مكافأة أو خصم",
      noteTitle: "إضافة ملاحظة",
      editTitle: "تعديل معلومات العامل",
      detailTitle: "تفاصيل العملية",
      worker: "العامل",
      date: "التاريخ",
      task: "نوع المهمة",
      pieces: "عدد القطع",
      pieceRate: "سعر القطعة",
      notes: "ملاحظات",
      period: "الفترة",
      salaryType: "نوع الأجر",
      days: "عدد الأيام",
      bonuses: "المكافآت",
      deductions: "الخصومات",
      advances: "السلفيات",
      absenceType: "نوع الغياب",
      dayCount: "عدد الأيام",
      reason: "السبب",
      amount: "المبلغ",
      deductionMethod: "طريقة الخصم",
      monthlyDeduction: "تخصم من راتب هذا الشهر",
      installments: "تخصم بالتقسيط",
      later: "تؤجل للشهر القادم",
      create: "حفظ العملية",
    },
  },
  fr: {
    currency: "DA",
    breadcrumb: ["Accueil", "Gestion des salaires", "Travailleurs", "Fiche travailleur"],
    title: "Fiche travailleur",
    workerName: "Ahmed Ben Ali",
    subtitle: "Suivi de la production, presence, salaires et historique financier du travailleur",
    back: "Retour a la liste des travailleurs",
    actions: {
      editWorker: "Modifier le travailleur",
      attendance: "Marquer presence",
      addProduction: "Ajouter production",
      calculateSalary: "Calculer salaire",
      printPayslip: "Imprimer fiche de paie",
      call: "Appeler",
      edit: "Modifier",
      stopWorker: "Arreter le travailleur",
      activateWorker: "Reactiver le travailleur",
      view: "Voir",
      save: "Enregistrer",
      cancel: "Annuler",
      paySalary: "Payer salaire",
      addAdvance: "Ajouter avance",
      addBonus: "Ajouter prime",
      addDeduction: "Ajouter retenue",
      addNote: "Ajouter une note",
      print: "Imprimer",
      viewPayslip: "Voir fiche",
    },
    profile: {
      name: "Nom",
      role: "Poste",
      salaryType: "Type de salaire",
      pieceRate: "Prix piece",
      startDate: "Date de debut",
      status: "Statut",
      phone: "Telephone",
      active: "Travailleur actif",
      stopped: "Arrete",
    },
    summary: {
      production: "Production totale",
      productionHelp: "Toutes les pieces enregistrees",
      salaries: "Total salaires",
      salariesHelp: "Total des fiches calculees",
      currentSalary: "Salaire du mois",
      currentSalaryHelp: "Net a payer ce mois",
      workDays: "Jours travailles",
      workDaysHelp: "Presences enregistrees",
      advances: "Avances",
      advancesHelp: "Avances non soldees",
      bonuses: "Primes",
      bonusesHelp: "Primes de rendement et qualite",
    },
    tabs: {
      overview: "Vue d'ensemble",
      production: "Production",
      attendance: "Presence",
      payroll: "Salaires",
      adjustments: "Avances et primes",
      notes: "Notes",
    },
    sections: {
      workerProduction: "Production du travailleur",
      latestOps: "Dernieres operations",
      productionLog: "Historique de production",
      attendanceLog: "Historique de presence",
      payrollHistory: "Historique des salaires",
      advances: "Avances",
      bonusesDeductions: "Primes et retenues",
      notes: "Notes du travailleur",
      sidebar: "Resume travailleur",
      salaryStatus: "Etat du salaire",
      productivity: "Productivite",
      lastActivity: "Derniere activite",
      salaryMethod: "Methode de calcul du salaire",
      calculation: "Calcul",
      net: "Net",
    },
    overview: {
      thisMonth: "Ce mois",
      thisWeek: "Cette semaine",
      dailyAverage: "Moyenne/jour",
      pieces: "pieces",
      day: "jour",
      presentDays: "Jours presents",
      absentDays: "Jours absents",
      lateDays: "Retards",
    },
    productionTable: {
      date: "Date",
      order: "Commande",
      task: "Tache",
      pieces: "Pieces",
      pieceRate: "Prix piece",
      amount: "Montant",
      actions: "Actions",
    },
    attendanceTable: {
      date: "Date",
      status: "Statut",
      checkIn: "Entree",
      checkOut: "Sortie",
      late: "Retard",
    },
    payrollTable: {
      period: "Periode",
      salaryType: "Type",
      base: "Base",
      production: "Production",
      bonuses: "Primes",
      deductions: "Retenues",
      advances: "Avances",
      net: "Net",
      status: "Statut",
      actions: "Actions",
    },
    adjustmentTable: {
      date: "Date",
      amount: "Montant",
      method: "Methode de retenue",
      status: "Statut",
      type: "Type",
      reason: "Raison",
    },
    statuses: {
      present: "Present",
      absent: "Absent",
      late: "En retard",
      paid: "Paye",
      partial: "Partiel",
      unpaid: "Non paye",
      piece: "A la piece",
      daily: "Journalier",
      monthly: "Mensuel",
      mixed: "Mixte",
      bonus: "Prime",
      deduction: "Retenue",
    },
    sidebar: {
      monthSalary: "Salaire du mois",
      status: "Statut",
      productionLevel: "Niveau production",
      rank: "Classement",
      rankValue: "Troisieme parmi les travailleurs",
      lastAttendance: "Derniere presence",
      today: "Aujourd'hui",
      lastProduction: "Derniere production",
      lastSalary: "Dernier salaire",
      period: "Juin 2026",
      bonus: "Prime",
      deduction: "Retenue",
      advance: "Avance",
    },
    modals: {
      productionTitle: "Ajouter production",
      salaryTitle: "Calculer salaire",
      absenceTitle: "Presence / absence",
      advanceTitle: "Ajouter avance",
      adjustmentTitle: "Prime ou retenue",
      noteTitle: "Ajouter une note",
      editTitle: "Modifier le travailleur",
      detailTitle: "Detail",
      worker: "Travailleur",
      date: "Date",
      task: "Tache",
      pieces: "Pieces",
      pieceRate: "Prix piece",
      notes: "Notes",
      period: "Periode",
      salaryType: "Type de salaire",
      days: "Nombre de jours",
      bonuses: "Primes",
      deductions: "Retenues",
      advances: "Avances",
      absenceType: "Type absence",
      dayCount: "Nombre de jours",
      reason: "Raison",
      amount: "Montant",
      deductionMethod: "Methode de retenue",
      monthlyDeduction: "Retenue ce mois",
      installments: "Retenue par tranches",
      later: "Reporter au mois prochain",
      create: "Enregistrer",
    },
  },
} satisfies Record<Lang, Record<string, unknown>>;

const initialWorker: WorkerProfile = {
  name: { ar: "أحمد بن علي", fr: "Ahmed Ben Ali" },
  role: { ar: "خياط", fr: "Couturier" },
  salaryType: "piece",
  pieceRate: 80,
  startDate: "2025-03-10",
  status: "active",
  phone: "0550 24 18 07",
};

const initialProduction: ProductionEntry[] = [
  { id: "prod-1", date: "2026-06-20", order: "#1024", task: { ar: "خياطة", fr: "Couture" }, pieces: 25, pieceRate: 80, notes: { ar: "قميص رجالي", fr: "Chemise homme" } },
  { id: "prod-2", date: "2026-06-18", order: "#1019", task: { ar: "تركيب أزرار", fr: "Boutons" }, pieces: 18, pieceRate: 55, notes: { ar: "قمصان مدرسية", fr: "Chemises scolaires" } },
  { id: "prod-3", date: "2026-06-16", order: "#1012", task: { ar: "خياطة نهائية", fr: "Finition" }, pieces: 32, pieceRate: 80, notes: { ar: "سراويل عمل", fr: "Pantalons de travail" } },
  { id: "prod-4", date: "2026-06-13", order: "#1008", task: { ar: "تصحيح قياس", fr: "Retouche" }, pieces: 15, pieceRate: 60, notes: { ar: "تعديل كتف", fr: "Ajustement epaule" } },
  { id: "prod-5", date: "2026-06-10", order: "#1001", task: { ar: "خياطة", fr: "Couture" }, pieces: 55, pieceRate: 80, notes: { ar: "دفعة قمصان", fr: "Lot de chemises" } },
];

const initialAttendance: AttendanceEntry[] = [
  { id: "att-1", date: "2026-06-20", status: "present", checkIn: "08:02", checkOut: "17:05", late: "-" },
  { id: "att-2", date: "2026-06-19", status: "late", checkIn: "08:34", checkOut: "17:00", late: "34 د" },
  { id: "att-3", date: "2026-06-18", status: "present", checkIn: "07:58", checkOut: "17:12", late: "-" },
  { id: "att-4", date: "2026-06-17", status: "absent", checkIn: "-", checkOut: "-", late: "-", reason: { ar: "غياب شخصي", fr: "Absence personnelle" } },
  { id: "att-5", date: "2026-06-16", status: "present", checkIn: "08:00", checkOut: "17:08", late: "-" },
  { id: "att-6", date: "2026-06-15", status: "present", checkIn: "08:03", checkOut: "17:00", late: "-" },
];

const initialPayroll: PayrollEntry[] = [
  {
    id: "pay-1",
    period: { ar: "جوان 2026", fr: "Juin 2026" },
    salaryType: "piece",
    baseSalary: 14500,
    productionBonus: 2000,
    bonuses: 2000,
    deductions: 500,
    advances: 3000,
    netSalary: 13000,
    paidAmount: 0,
    status: "unpaid",
  },
  {
    id: "pay-2",
    period: { ar: "ماي 2026", fr: "Mai 2026" },
    salaryType: "piece",
    baseSalary: 13200,
    productionBonus: 1600,
    bonuses: 1600,
    deductions: 0,
    advances: 2000,
    netSalary: 12800,
    paidAmount: 12800,
    status: "paid",
  },
];

const initialAdvances: AdvanceEntry[] = [
  { id: "adv-1", date: "2026-06-15", amount: 5000, method: { ar: "تخصم من راتب هذا الشهر", fr: "Retenue ce mois" }, status: { ar: "مفتوحة", fr: "Ouverte" } },
  { id: "adv-2", date: "2026-05-11", amount: 10000, method: { ar: "خصمت من راتب ماي", fr: "Retenue sur mai" }, status: { ar: "مغلقة", fr: "Soldee" } },
];

const initialAdjustments: AdjustmentEntry[] = [
  { id: "adj-1", type: "bonus", amount: 2000, reason: { ar: "سرعة الإنجاز", fr: "Rapidite" }, date: "2026-06-20" },
  { id: "adj-2", type: "bonus", amount: 5800, reason: { ar: "جودة العمل", fr: "Qualite" }, date: "2026-06-12" },
  { id: "adj-3", type: "deduction", amount: 500, reason: { ar: "تأخير", fr: "Retard" }, date: "2026-06-19" },
];

const initialNotes: Bilingual[] = [
  { ar: "متخصص في خياطة القمصان", fr: "Specialise dans les chemises" },
  { ar: "جودة عمل ممتازة", fr: "Excellente qualite de travail" },
  { ar: "يحتاج متابعة في سرعة الإنجاز", fr: "A suivre sur la vitesse d'execution" },
];

const initialActivity: ActivityEntry[] = [
  { title: { ar: "20 جوان", fr: "20 juin" }, detail: { ar: "إنجاز 15 قطعة قميص", fr: "15 chemises terminees" } },
  { title: { ar: "18 جوان", fr: "18 juin" }, detail: { ar: "حضور كامل", fr: "Presence complete" } },
  { title: { ar: "15 جوان", fr: "15 juin" }, detail: { ar: "استلام سلفة 5000 دج", fr: "Avance recue 5000 DA" } },
];

const salaryTypeColors: Record<SalaryType, string> = {
  piece: palette.primary,
  daily: "#6b8aa0",
  monthly: "#4d8a6a",
  mixed: "#a87d3c",
};

const attendanceColors: Record<AttendanceStatus, string> = {
  present: "#4d8a6a",
  absent: "#b46a66",
  late: "#a87d3c",
};

const payrollColors: Record<PayrollStatus, string> = {
  paid: "#4d8a6a",
  partial: "#a87d3c",
  unpaid: "#b46a66",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number, currency: string) {
  return `${value.toLocaleString()} ${currency}`;
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function Panel({ children, className = "", padding = 20 }: { children: ReactNode; className?: string; padding?: number }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(18,60,74,0.08)", color: palette.primary }}
        >
          <Icon size={18} strokeWidth={1.9} />
        </div>
        <h2 style={{ fontSize: 15.5, fontWeight: 800, color: palette.text }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: palette.muted }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{value}</div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
  description,
  color,
  tint,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
  color: string;
  tint: string;
}) {
  return (
    <Panel padding={18} className="min-h-[118px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: tint, color }}>
          <Icon size={21} strokeWidth={1.9} />
        </div>
        <div style={{ textAlign: "end", fontSize: 22, fontWeight: 800, color: palette.text, lineHeight: 1.15 }}>{value}</div>
      </div>
      <div className="mt-4">
        <div style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>{label}</div>
        <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 2 }}>{description}</div>
      </div>
    </Panel>
  );
}

function TextAction({ icon: Icon, children, onClick }: { icon: LucideIcon; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-black/5"
      style={{ color: palette.primary, fontSize: 12, fontWeight: 800 }}
    >
      <Icon size={13} strokeWidth={2} />
      {children}
    </button>
  );
}

const thStyle: CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  fontWeight: 800,
  color: palette.muted,
  textAlign: "start",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "14px",
  fontSize: 13.5,
  color: palette.text,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

function TabsNav({ active, labels, onChange }: { active: WorkerTab; labels: Record<WorkerTab, string>; onChange: (tab: WorkerTab) => void }) {
  const tabs: WorkerTab[] = ["overview", "production", "attendance", "payroll", "adjustments", "notes"];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs.map((tab) => {
        const selected = active === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className="transition-colors"
            style={{
              padding: "9px 16px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: selected ? 700 : 500,
              color: selected ? "#fff" : palette.muted,
              backgroundColor: selected ? palette.primary : palette.surface,
              border: `1px solid ${selected ? palette.primary : palette.border}`,
            }}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}

function NoticeBanner({ notice, lang, onClose }: { notice: Notice | null; lang: Lang; onClose: () => void }) {
  if (!notice) return null;

  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: "rgba(77,138,106,0.10)", borderColor: "rgba(77,138,106,0.22)" }}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} strokeWidth={2} style={{ color: "#4d8a6a", marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>{notice.title[lang]}</div>
          <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2 }}>{notice.detail[lang]}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-1.5 transition-colors hover:bg-black/5"
        style={{ fontSize: 12, fontWeight: 800, color: palette.primary }}
      >
        {lang === "ar" ? "إخفاء" : "Masquer"}
      </button>
    </div>
  );
}

function ProductionMiniChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-5 flex h-24 items-end gap-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <div
            className="w-full rounded-t-lg"
            style={{
              height: `${Math.max(18, (value / max) * 88)}%`,
              backgroundColor: index === values.length - 1 ? palette.accent : palette.primary,
              opacity: index === values.length - 1 ? 0.95 : 0.72,
            }}
          />
          <span style={{ fontSize: 10.5, color: palette.muted }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: ActivityEntry[] }) {
  const { lang } = useLanguage();
  return (
    <div className="mt-5 flex flex-col gap-4">
      {items.map((item, index) => (
        <div key={`${item.title.ar}-${index}`} className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: index === 0 ? palette.accent : palette.primary }} />
            {index < items.length - 1 ? <span className="mt-1 flex-1" style={{ width: 1, backgroundColor: palette.border }} /> : null}
          </div>
          <div className="pb-1">
            <div style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>{item.title[lang]}</div>
            <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2 }}>{item.detail[lang]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewTab({
  t,
  lang,
  production,
  attendance,
  activity,
}: {
  t: typeof workerText.ar;
  lang: Lang;
  production: ProductionEntry[];
  attendance: AttendanceEntry[];
  activity: ActivityEntry[];
}) {
  const thisMonth = production.reduce((sum, item) => sum + item.pieces, 0);
  const thisWeek = production.slice(0, 2).reduce((sum, item) => sum + item.pieces, 0);
  const presentDays = attendance.filter((item) => item.status === "present" || item.status === "late").length;
  const avg = Math.round(thisMonth / Math.max(1, presentDays));
  const chartValues = production.slice().reverse().map((item) => item.pieces);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel>
        <SectionHeader icon={Gauge} title={t.sections.workerProduction} />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <InfoBlock label={t.overview.thisMonth} value={`${thisMonth} ${t.overview.pieces}`} />
          <InfoBlock label={t.overview.thisWeek} value={`${thisWeek} ${t.overview.pieces}`} />
          <InfoBlock label={t.overview.dailyAverage} value={`${avg} ${t.overview.pieces}`} />
        </div>
        <ProductionMiniChart values={chartValues} />
      </Panel>
      <Panel>
        <SectionHeader icon={History} title={t.sections.latestOps} />
        <Timeline items={activity} />
      </Panel>
    </div>
  );
}

function ProductionTable({
  t,
  lang,
  rows,
  onAdd,
  onView,
  onEdit,
}: {
  t: typeof workerText.ar;
  lang: Lang;
  rows: ProductionEntry[];
  onAdd: () => void;
  onView: (entry: ProductionEntry) => void;
  onEdit: (entry: ProductionEntry) => void;
}) {
  return (
    <Panel padding={0}>
      <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
        <div className="flex items-center gap-2">
          <PackageCheck size={17} style={{ color: palette.primary }} />
          <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.productionLog}</span>
        </div>
        <Button variant="primary" onClick={onAdd}>
          <Plus size={15} />
          {t.actions.addProduction}
        </Button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 850 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              <th style={thStyle}>{t.productionTable.date}</th>
              <th style={thStyle}>{t.productionTable.order}</th>
              <th style={thStyle}>{t.productionTable.task}</th>
              <th style={thStyle}>{t.productionTable.pieces}</th>
              <th style={thStyle}>{t.productionTable.pieceRate}</th>
              <th style={thStyle}>{t.productionTable.amount}</th>
              <th style={thStyle}>{t.productionTable.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-black/5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{row.date}</td>
                <td style={{ ...tdStyle, direction: "ltr", fontWeight: 800, color: palette.primary }}>{row.order}</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{row.task[lang]}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{row.pieces}</td>
                <td style={tdStyle}>{money(row.pieceRate, t.currency)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{money(row.pieces * row.pieceRate, t.currency)}</td>
                <td style={tdStyle}>
                  <div className="flex items-center gap-1">
                    <TextAction icon={Eye} onClick={() => onView(row)}>{t.actions.view}</TextAction>
                    <TextAction icon={Edit} onClick={() => onEdit(row)}>{t.actions.edit}</TextAction>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AttendanceTable({
  t,
  rows,
  onAdd,
}: {
  t: typeof workerText.ar;
  rows: AttendanceEntry[];
  onAdd: () => void;
}) {
  const present = rows.filter((row) => row.status === "present" || row.status === "late").length;
  const absent = rows.filter((row) => row.status === "absent").length;
  const late = rows.filter((row) => row.status === "late").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={CalendarCheck} label={t.overview.presentDays} value={String(present)} description={t.overview.day} color="#4d8a6a" tint="rgba(77,138,106,0.12)" />
        <SummaryCard icon={AlertCircle} label={t.overview.absentDays} value={String(absent)} description={t.overview.day} color="#b46a66" tint="rgba(180,106,102,0.12)" />
        <SummaryCard icon={Timer} label={t.overview.lateDays} value={String(late)} description={t.overview.day} color="#a87d3c" tint="rgba(195,154,91,0.16)" />
      </div>
      <Panel padding={0}>
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={17} style={{ color: palette.primary }} />
            <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.attendanceLog}</span>
          </div>
          <Button variant="primary" onClick={onAdd}>
            <CalendarCheck size={15} />
            {t.actions.attendance}
          </Button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                <th style={thStyle}>{t.attendanceTable.date}</th>
                <th style={thStyle}>{t.attendanceTable.status}</th>
                <th style={thStyle}>{t.attendanceTable.checkIn}</th>
                <th style={thStyle}>{t.attendanceTable.checkOut}</th>
                <th style={thStyle}>{t.attendanceTable.late}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const color = attendanceColors[row.status];
                return (
                  <tr key={row.id} className="transition-colors hover:bg-black/5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                    <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{row.date}</td>
                    <td style={tdStyle}>
                      <Badge bg={`${color}1f`} fg={color} dot={color}>{t.statuses[row.status]}</Badge>
                    </td>
                    <td style={{ ...tdStyle, direction: "ltr" }}>{row.checkIn}</td>
                    <td style={{ ...tdStyle, direction: "ltr" }}>{row.checkOut}</td>
                    <td style={{ ...tdStyle, color: row.status === "late" ? "#a87d3c" : palette.muted }}>{row.late}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function PayrollTable({
  t,
  lang,
  rows,
  onView,
  onPay,
  onPrint,
}: {
  t: typeof workerText.ar;
  lang: Lang;
  rows: PayrollEntry[];
  onView: (row: PayrollEntry) => void;
  onPay: (row: PayrollEntry) => void;
  onPrint: (row: PayrollEntry) => void;
}) {
  return (
    <Panel padding={0}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
        <ReceiptText size={17} style={{ color: palette.primary }} />
        <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.payrollHistory}</span>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 1080 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              <th style={thStyle}>{t.payrollTable.period}</th>
              <th style={thStyle}>{t.payrollTable.salaryType}</th>
              <th style={thStyle}>{t.payrollTable.base}</th>
              <th style={thStyle}>{t.payrollTable.production}</th>
              <th style={thStyle}>{t.payrollTable.bonuses}</th>
              <th style={thStyle}>{t.payrollTable.deductions}</th>
              <th style={thStyle}>{t.payrollTable.advances}</th>
              <th style={thStyle}>{t.payrollTable.net}</th>
              <th style={thStyle}>{t.payrollTable.status}</th>
              <th style={thStyle}>{t.payrollTable.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const color = payrollColors[row.status];
              return (
                <tr key={row.id} className="transition-colors hover:bg-black/5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{row.period[lang]}</td>
                  <td style={tdStyle}>
                    <Badge bg={`${salaryTypeColors[row.salaryType]}18`} fg={salaryTypeColors[row.salaryType]}>{t.statuses[row.salaryType]}</Badge>
                  </td>
                  <td style={tdStyle}>{row.baseSalary.toLocaleString()}</td>
                  <td style={{ ...tdStyle, color: "#4d8a6a", fontWeight: 700 }}>+{row.productionBonus.toLocaleString()}</td>
                  <td style={{ ...tdStyle, color: "#4d8a6a" }}>{row.bonuses.toLocaleString()}</td>
                  <td style={{ ...tdStyle, color: "#b46a66" }}>{row.deductions > 0 ? `${row.deductions.toLocaleString()}-` : "-"}</td>
                  <td style={{ ...tdStyle, color: "#a87d3c" }}>{row.advances > 0 ? `${row.advances.toLocaleString()}-` : "-"}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{money(row.netSalary, t.currency)}</td>
                  <td style={tdStyle}>
                    <Badge bg={`${color}1f`} fg={color} dot={color}>{t.statuses[row.status]}</Badge>
                  </td>
                  <td style={tdStyle}>
                    <div className="flex items-center gap-1">
                      <TextAction icon={Eye} onClick={() => onView(row)}>{t.actions.viewPayslip}</TextAction>
                      <TextAction icon={CreditCard} onClick={() => onPay(row)}>{t.actions.paySalary}</TextAction>
                      <TextAction icon={Printer} onClick={() => onPrint(row)}>{t.actions.print}</TextAction>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AdjustmentsTab({
  t,
  lang,
  advances,
  adjustments,
  onAdvance,
  onBonus,
  onDeduction,
}: {
  t: typeof workerText.ar;
  lang: Lang;
  advances: AdvanceEntry[];
  adjustments: AdjustmentEntry[];
  onAdvance: () => void;
  onBonus: () => void;
  onDeduction: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel padding={0}>
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <div className="flex items-center gap-2">
            <HandCoins size={17} style={{ color: palette.primary }} />
            <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.advances}</span>
          </div>
          <Button variant="primary" onClick={onAdvance}>
            <Plus size={15} />
            {t.actions.addAdvance}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                <th style={thStyle}>{t.adjustmentTable.date}</th>
                <th style={thStyle}>{t.adjustmentTable.amount}</th>
                <th style={thStyle}>{t.adjustmentTable.method}</th>
                <th style={thStyle}>{t.adjustmentTable.status}</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{row.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{money(row.amount, t.currency)}</td>
                  <td style={{ ...tdStyle, color: palette.muted }}>{row.method[lang]}</td>
                  <td style={tdStyle}>{row.status[lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel padding={0}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <div className="flex items-center gap-2">
            <Award size={17} style={{ color: palette.primary }} />
            <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.bonusesDeductions}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBonus}>
              <Plus size={15} />
              {t.actions.addBonus}
            </Button>
            <Button variant="secondary" onClick={onDeduction}>
              <MinusCircle size={15} />
              {t.actions.addDeduction}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                <th style={thStyle}>{t.adjustmentTable.type}</th>
                <th style={thStyle}>{t.adjustmentTable.amount}</th>
                <th style={thStyle}>{t.adjustmentTable.reason}</th>
                <th style={thStyle}>{t.adjustmentTable.date}</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={tdStyle}>
                    <Badge bg={row.type === "bonus" ? "rgba(77,138,106,0.12)" : "rgba(180,106,102,0.12)"} fg={row.type === "bonus" ? "#4d8a6a" : "#b46a66"}>
                      {t.statuses[row.type]}
                    </Badge>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{money(row.amount, t.currency)}</td>
                  <td style={{ ...tdStyle, color: palette.muted }}>{row.reason[lang]}</td>
                  <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function NotesTab({ t, lang, notes, onAdd }: { t: typeof workerText.ar; lang: Lang; notes: Bilingual[]; onAdd: () => void }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader icon={StickyNote} title={t.sections.notes} />
        <Button variant="primary" onClick={onAdd}>
          <Plus size={15} />
          {t.actions.addNote}
        </Button>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {notes.map((note, index) => (
          <div
            key={`${note.ar}-${index}`}
            className="flex items-start gap-3"
            style={{
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              backgroundColor: index === 0 ? "rgba(195,154,91,0.08)" : palette.bg,
              padding: "13px 15px",
            }}
          >
            <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: index === 0 ? palette.accent : palette.primary }} />
            <span style={{ fontSize: 13.5, color: palette.text, lineHeight: 1.75 }}>{note[lang]}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function WorkerSidebar({
  t,
  lang,
  payroll,
  production,
  onPay,
}: {
  t: typeof workerText.ar;
  lang: Lang;
  payroll: PayrollEntry[];
  production: ProductionEntry[];
  onPay: () => void;
}) {
  const current = payroll[0];
  const lastProduction = production[0]?.pieces ?? 0;

  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <Panel>
        <SectionHeader icon={UserRound} title={t.sections.sidebar} />
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.sections.salaryStatus}</div>
            <Badge bg={`${payrollColors[current.status]}1f`} fg={payrollColors[current.status]} dot={payrollColors[current.status]}>
              {t.statuses[current.status]}
            </Badge>
          </div>
          <div
            className="mt-3 rounded-2xl p-4"
            style={{ backgroundColor: "rgba(180,106,102,0.08)", border: "1px solid rgba(180,106,102,0.18)" }}
          >
            <div style={{ fontSize: 12, color: palette.muted }}>{t.sidebar.monthSalary}</div>
            <div className="mt-1" style={{ fontSize: 23, fontWeight: 800, color: current.status === "paid" ? "#4d8a6a" : "#b46a66" }}>
              {money(current.netSalary, t.currency)}
            </div>
          </div>
          <Button variant="primary" full onClick={onPay} disabled={current.status === "paid"}>
            <CreditCard size={15} />
            {t.actions.paySalary}
          </Button>
        </div>

        <div className="my-5" style={{ height: 1, backgroundColor: palette.border }} />

        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.sections.productivity}</div>
          <div className="mt-3">
            <div className="flex items-center justify-between" style={{ fontSize: 12, color: palette.muted }}>
              <span>{t.sidebar.productionLevel}</span>
              <strong style={{ color: palette.primary }}>82%</strong>
            </div>
            <div className="mt-2">
              <ProgressBar value={82} />
            </div>
            <div className="mt-3 flex items-center justify-between" style={{ fontSize: 12.5 }}>
              <span style={{ color: palette.muted }}>{t.sidebar.rank}</span>
              <span style={{ fontWeight: 800, color: palette.text }}>{t.sidebar.rankValue}</span>
            </div>
          </div>
        </div>

        <div className="my-5" style={{ height: 1, backgroundColor: palette.border }} />

        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.sections.lastActivity}</div>
          <div className="mt-4 flex flex-col gap-3">
            <InfoBlock label={t.sidebar.lastAttendance} value={t.sidebar.today} />
            <InfoBlock label={t.sidebar.lastProduction} value={`${lastProduction} ${t.overview.pieces}`} />
            <InfoBlock label={t.sidebar.lastSalary} value={t.sidebar.period} />
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={BadgeDollarSign} title={t.sections.salaryMethod} />
        <div className="mt-5 flex flex-col gap-3">
          <InfoBlock label={t.profile.salaryType} value={t.statuses.piece} />
          <div className="rounded-2xl border p-4" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
            <div style={{ fontSize: 12, color: palette.muted }}>{t.sections.calculation}</div>
            <div className="mt-2" style={{ fontSize: 18, fontWeight: 800, color: palette.primary }}>
              145 × 80 {t.currency}
            </div>
            <div className="my-3" style={{ height: 1, backgroundColor: palette.border }} />
            <div className="flex justify-between" style={{ fontSize: 13 }}>
              <span>{t.sidebar.bonus}</span>
              <strong style={{ color: "#4d8a6a" }}>+2,000 {t.currency}</strong>
            </div>
            <div className="mt-2 flex justify-between" style={{ fontSize: 13 }}>
              <span>{t.sidebar.deduction}</span>
              <strong style={{ color: "#b46a66" }}>-500 {t.currency}</strong>
            </div>
            <div className="mt-2 flex justify-between" style={{ fontSize: 13 }}>
              <span>{t.sidebar.advance}</span>
              <strong style={{ color: "#a87d3c" }}>-3,000 {t.currency}</strong>
            </div>
            <div className="my-3" style={{ height: 1, backgroundColor: palette.borderStrong }} />
            <div className="flex justify-between" style={{ fontSize: 14.5 }}>
              <span style={{ fontWeight: 800 }}>{t.sections.net}</span>
              <strong style={{ color: palette.primary }}>13,100 {t.currency}</strong>
            </div>
          </div>
        </div>
      </Panel>
    </aside>
  );
}

function DetailModal({
  open,
  title,
  rows,
  onClose,
}: {
  open: boolean;
  title: string;
  rows: { label: string; value: ReactNode }[];
  onClose: () => void;
}) {
  return (
    <ModalShell open={open} onClose={onClose} title={title} maxWidth={560}>
      <div className="grid grid-cols-1 gap-3 px-6 py-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border px-3 py-2.5" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
            <div style={{ fontSize: 12, color: palette.muted }}>{row.label}</div>
            <div className="mt-1" style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>{row.value}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function ProductionModal({
  open,
  onClose,
  t,
  lang,
  worker,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof workerText.ar;
  lang: Lang;
  worker: WorkerProfile;
  initial: ProductionEntry | null;
  onSave: (entry: ProductionEntry) => void;
}) {
  const [form, setForm] = useState({ date: todayIso(), order: "#1024", task: "خياطة", pieces: "0", pieceRate: String(worker.pieceRate), notes: "" });

  useEffect(() => {
    if (!open) return;
    setForm({
      date: initial?.date ?? todayIso(),
      order: initial?.order ?? "#1024",
      task: initial?.task[lang] ?? (lang === "ar" ? "خياطة" : "Couture"),
      pieces: String(initial?.pieces ?? ""),
      pieceRate: String(initial?.pieceRate ?? worker.pieceRate),
      notes: initial?.notes[lang] ?? "",
    });
  }, [initial, lang, open, worker.pieceRate]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.productionTitle} maxWidth={620}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: initial?.id ?? nextId("prod"),
            date: form.date,
            order: form.order,
            task: { ar: form.task, fr: form.task },
            pieces: Number(form.pieces) || 0,
            pieceRate: Number(form.pieceRate) || worker.pieceRate,
            notes: { ar: form.notes, fr: form.notes },
          });
          onClose();
        }}
      >
        <Field label={t.modals.worker}><TextInput value={worker.name[lang]} readOnly /></Field>
        <Field label={t.modals.date}><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label={t.productionTable.order}><TextInput value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} style={{ direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }} /></Field>
        <Field label={t.modals.task}><TextInput value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} /></Field>
        <Field label={t.modals.pieces}><TextInput type="number" min={1} value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} /></Field>
        <Field label={t.modals.pieceRate}><TextInput type="number" min={0} value={form.pieceRate} onChange={(e) => setForm({ ...form, pieceRate: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label={t.modals.notes}><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div className="mt-1 flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit" disabled={(Number(form.pieces) || 0) <= 0}>
            <Save size={15} />
            {t.modals.create}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function AttendanceModal({
  open,
  onClose,
  t,
  lang,
  worker,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof workerText.ar;
  lang: Lang;
  worker: WorkerProfile;
  onSave: (entry: AttendanceEntry) => void;
}) {
  const [form, setForm] = useState({ date: todayIso(), status: "present" as AttendanceStatus, checkIn: "08:00", checkOut: "17:00", late: "-", reason: "" });

  useEffect(() => {
    if (open) setForm({ date: todayIso(), status: "present", checkIn: "08:00", checkOut: "17:00", late: "-", reason: "" });
  }, [open]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.absenceTitle} maxWidth={560}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: nextId("att"),
            date: form.date,
            status: form.status,
            checkIn: form.status === "absent" ? "-" : form.checkIn,
            checkOut: form.status === "absent" ? "-" : form.checkOut,
            late: form.status === "late" ? form.late : "-",
            reason: form.reason ? { ar: form.reason, fr: form.reason } : undefined,
          });
          onClose();
        }}
      >
        <Field label={t.modals.worker}><TextInput value={worker.name[lang]} readOnly /></Field>
        <Field label={t.modals.date}><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label={t.attendanceTable.status}>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceStatus })}>
            <option value="present">{t.statuses.present}</option>
            <option value="absent">{t.statuses.absent}</option>
            <option value="late">{t.statuses.late}</option>
          </Select>
        </Field>
        <Field label={t.attendanceTable.late}><TextInput value={form.late} onChange={(e) => setForm({ ...form, late: e.target.value })} /></Field>
        <Field label={t.attendanceTable.checkIn}><TextInput type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field>
        <Field label={t.attendanceTable.checkOut}><TextInput type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label={t.modals.reason}><Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        </div>
        <div className="mt-1 flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit"><Save size={15} />{t.modals.create}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function SalaryModal({
  open,
  onClose,
  t,
  lang,
  worker,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof workerText.ar;
  lang: Lang;
  worker: WorkerProfile;
  onSave: (row: PayrollEntry) => void;
}) {
  const [form, setForm] = useState({ period: "جوان 2026", days: "24", pieces: "145", bonuses: "2000", deductions: "500", advances: "3000" });
  const pieces = Number(form.pieces) || 0;
  const base = pieces * worker.pieceRate;
  const bonuses = Number(form.bonuses) || 0;
  const deductions = Number(form.deductions) || 0;
  const advances = Number(form.advances) || 0;
  const net = Math.max(0, base + bonuses - deductions - advances);

  useEffect(() => {
    if (open) setForm({ period: lang === "ar" ? "جوان 2026" : "Juin 2026", days: "24", pieces: "145", bonuses: "2000", deductions: "500", advances: "3000" });
  }, [lang, open]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.salaryTitle} maxWidth={640}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: nextId("pay"),
            period: { ar: form.period, fr: form.period },
            salaryType: "piece",
            baseSalary: base,
            productionBonus: bonuses,
            bonuses,
            deductions,
            advances,
            netSalary: net,
            paidAmount: 0,
            status: "unpaid",
          });
          onClose();
        }}
      >
        <Field label={t.modals.worker}><TextInput value={worker.name[lang]} readOnly /></Field>
        <Field label={t.modals.period}><TextInput value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></Field>
        <Field label={t.modals.days}><TextInput type="number" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></Field>
        <Field label={t.modals.pieces}><TextInput type="number" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} /></Field>
        <Field label={t.modals.bonuses}><TextInput type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} /></Field>
        <Field label={t.modals.deductions}><TextInput type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} /></Field>
        <Field label={t.modals.advances}><TextInput type="number" value={form.advances} onChange={(e) => setForm({ ...form, advances: e.target.value })} /></Field>
        <div className="rounded-xl border p-3" style={{ backgroundColor: palette.bg, borderColor: palette.border }}>
          <div style={{ fontSize: 12, color: palette.muted }}>{t.sections.net}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: palette.primary }}>{money(net, t.currency)}</div>
        </div>
        <div className="mt-1 flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit"><Save size={15} />{t.actions.calculateSalary}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function AdvanceModal({
  open,
  onClose,
  t,
  lang,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof workerText.ar;
  lang: Lang;
  onSave: (row: AdvanceEntry) => void;
}) {
  const [form, setForm] = useState({ amount: "", date: todayIso(), method: "month" });

  useEffect(() => {
    if (open) setForm({ amount: "", date: todayIso(), method: "month" });
  }, [open]);

  const methods: Record<string, Bilingual> = {
    month: { ar: t.modals.monthlyDeduction, fr: t.modals.monthlyDeduction },
    installments: { ar: t.modals.installments, fr: t.modals.installments },
    later: { ar: t.modals.later, fr: t.modals.later },
  };

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.advanceTitle} maxWidth={500}>
      <form
        className="flex flex-col gap-4 px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: nextId("adv"),
            date: form.date,
            amount: Number(form.amount) || 0,
            method: methods[form.method],
            status: { ar: "مفتوحة", fr: "Ouverte" },
          });
          onClose();
        }}
      >
        <Field label={t.modals.amount}><TextInput type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label={t.modals.date}><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label={t.modals.deductionMethod}>
          <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="month">{t.modals.monthlyDeduction}</option>
            <option value="installments">{t.modals.installments}</option>
            <option value="later">{t.modals.later}</option>
          </Select>
        </Field>
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit" disabled={(Number(form.amount) || 0) <= 0}><Save size={15} />{t.modals.create}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function AdjustmentModal({
  open,
  type,
  onClose,
  t,
  onSave,
}: {
  open: boolean;
  type: AdjustmentType;
  onClose: () => void;
  t: typeof workerText.ar;
  onSave: (row: AdjustmentEntry) => void;
}) {
  const [form, setForm] = useState({ amount: "", date: todayIso(), reason: "" });

  useEffect(() => {
    if (open) setForm({ amount: "", date: todayIso(), reason: "" });
  }, [open]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.adjustmentTitle} maxWidth={500}>
      <form
        className="flex flex-col gap-4 px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            id: nextId("adj"),
            type,
            amount: Number(form.amount) || 0,
            date: form.date,
            reason: { ar: form.reason || t.statuses[type], fr: form.reason || t.statuses[type] },
          });
          onClose();
        }}
      >
        <Field label={t.adjustmentTable.type}><TextInput value={t.statuses[type]} readOnly /></Field>
        <Field label={t.modals.amount}><TextInput type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label={t.modals.reason}><TextInput value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        <Field label={t.modals.date}><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit" disabled={(Number(form.amount) || 0) <= 0}><Save size={15} />{t.modals.create}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function NoteModal({ open, onClose, t, onSave }: { open: boolean; onClose: () => void; t: typeof workerText.ar; onSave: (note: string) => void }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.noteTitle} maxWidth={520}>
      <form
        className="px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(note);
          onClose();
        }}
      >
        <Field label={t.modals.notes}><Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit" disabled={!note.trim()}><Plus size={15} />{t.actions.addNote}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditWorkerModal({
  open,
  onClose,
  t,
  lang,
  worker,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof workerText.ar;
  lang: Lang;
  worker: WorkerProfile;
  onSave: (worker: WorkerProfile) => void;
}) {
  const [form, setForm] = useState(worker);

  useEffect(() => {
    if (open) setForm(worker);
  }, [open, worker]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modals.editTitle} maxWidth={620}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
          onClose();
        }}
      >
        <Field label={t.profile.name}><TextInput value={form.name[lang]} onChange={(e) => setForm({ ...form, name: { ...form.name, [lang]: e.target.value } })} /></Field>
        <Field label={t.profile.role}><TextInput value={form.role[lang]} onChange={(e) => setForm({ ...form, role: { ...form.role, [lang]: e.target.value } })} /></Field>
        <Field label={t.profile.phone}><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }} /></Field>
        <Field label={t.profile.pieceRate}><TextInput type="number" value={String(form.pieceRate)} onChange={(e) => setForm({ ...form, pieceRate: Number(e.target.value) || 0 })} /></Field>
        <Field label={t.profile.startDate}><TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
        <Field label={t.profile.status}>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkerStatus })}>
            <option value="active">{t.profile.active}</option>
            <option value="stopped">{t.profile.stopped}</option>
          </Select>
        </Field>
        <div className="mt-1 flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" type="submit"><Save size={15} />{t.actions.save}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function WorkerProfilePage() {
  const { lang, dir } = useLanguage();
  const t = workerText[lang] as typeof workerText.ar;
  const navigate = useNavigate();

  const [worker, setWorker] = useState<WorkerProfile>(initialWorker);
  const [tab, setTab] = useState<WorkerTab>("overview");
  const [productionRows, setProductionRows] = useState(initialProduction);
  const [attendanceRows, setAttendanceRows] = useState(initialAttendance);
  const [payrollRows, setPayrollRows] = useState(initialPayroll);
  const [advanceRows, setAdvanceRows] = useState(initialAdvances);
  const [adjustmentRows, setAdjustmentRows] = useState(initialAdjustments);
  const [noteRows, setNoteRows] = useState(initialNotes);
  const [activityRows, setActivityRows] = useState(initialActivity);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [productionOpen, setProductionOpen] = useState(false);
  const [productionEdit, setProductionEdit] = useState<ProductionEntry | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editWorkerOpen, setEditWorkerOpen] = useState(false);
  const [detailRows, setDetailRows] = useState<{ label: string; value: ReactNode }[] | null>(null);
  const [detailTitle, setDetailTitle] = useState("");

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const productionTotal = productionRows.reduce((sum, row) => sum + row.pieces, 0);
  const totalSalaries = payrollRows.reduce((sum, row) => sum + row.netSalary, 0);
  const currentSalary = payrollRows[0]?.netSalary ?? 0;
  const workDays = attendanceRows.filter((row) => row.status === "present" || row.status === "late").length;
  const advancesTotal = advanceRows.filter((row) => row.status.ar === "مفتوحة").reduce((sum, row) => sum + row.amount, 0);
  const bonusesTotal = adjustmentRows.filter((row) => row.type === "bonus").reduce((sum, row) => sum + row.amount, 0);

  const showNotice = (title: Bilingual, detail: Bilingual) => setNotice({ title, detail });
  const pushActivity = (detail: Bilingual) => setActivityRows((current) => [{ title: { ar: "الآن", fr: "Maintenant" }, detail }, ...current].slice(0, 5));

  const summaryCards = [
    { icon: PackageCheck, value: `${productionTotal} ${t.overview.pieces}`, label: t.summary.production, description: t.summary.productionHelp, color: palette.primary, tint: "rgba(18,60,74,0.08)" },
    { icon: Wallet, value: money(totalSalaries, t.currency), label: t.summary.salaries, description: t.summary.salariesHelp, color: "#6b8aa0", tint: "rgba(107,138,160,0.12)" },
    { icon: Coins, value: money(currentSalary, t.currency), label: t.summary.currentSalary, description: t.summary.currentSalaryHelp, color: "#b46a66", tint: "rgba(180,106,102,0.12)" },
    { icon: CalendarCheck, value: `${workDays} ${t.overview.day}`, label: t.summary.workDays, description: t.summary.workDaysHelp, color: "#4d8a6a", tint: "rgba(77,138,106,0.12)" },
    { icon: HandCoins, value: money(advancesTotal, t.currency), label: t.summary.advances, description: t.summary.advancesHelp, color: "#a87d3c", tint: "rgba(195,154,91,0.16)" },
    { icon: Award, value: money(bonusesTotal, t.currency), label: t.summary.bonuses, description: t.summary.bonusesHelp, color: palette.accent, tint: "rgba(195,154,91,0.16)" },
  ];

  const openProduction = (entry: ProductionEntry | null = null) => {
    setProductionEdit(entry);
    setProductionOpen(true);
  };

  const handleSaveProduction = (entry: ProductionEntry) => {
    setProductionRows((current) => {
      const exists = current.some((row) => row.id === entry.id);
      return exists ? current.map((row) => (row.id === entry.id ? entry : row)) : [entry, ...current];
    });
    setTab("production");
    pushActivity({ ar: `إنتاج ${entry.pieces} قطعة`, fr: `Production ${entry.pieces} pieces` });
    showNotice({ ar: "تم حفظ الإنتاج", fr: "Production enregistree" }, { ar: "تم تحديث سجل إنتاج العامل.", fr: "L'historique de production est mis a jour." });
  };

  const payCurrentSalary = (row = payrollRows[0]) => {
    setPayrollRows((current) => current.map((item) => item.id === row.id ? { ...item, paidAmount: item.netSalary, status: "paid" } : item));
    pushActivity({ ar: "تم دفع الراتب", fr: "Salaire paye" });
    showNotice({ ar: "تم دفع الراتب", fr: "Salaire paye" }, { ar: `تم تأكيد دفع ${money(row.netSalary, t.currency)}.`, fr: `${money(row.netSalary, t.currency)} ont ete marques comme payes.` });
  };

  const printPayslip = (row = payrollRows[0]) => {
    showNotice({ ar: "تم تجهيز كشف الراتب", fr: "Fiche preparee" }, { ar: `كشف ${row.period[lang]} جاهز للطباعة.`, fr: `La fiche ${row.period[lang]} est prete a imprimer.` });
    window.setTimeout(() => window.print(), 80);
  };

  const openProductionDetail = (row: ProductionEntry) => {
    setDetailTitle(`${t.actions.view} ${row.order}`);
    setDetailRows([
      { label: t.productionTable.date, value: row.date },
      { label: t.productionTable.order, value: row.order },
      { label: t.productionTable.task, value: row.task[lang] },
      { label: t.productionTable.pieces, value: row.pieces },
      { label: t.productionTable.amount, value: money(row.pieces * row.pieceRate, t.currency) },
      { label: t.modals.notes, value: row.notes[lang] },
    ]);
  };

  const openPayrollDetail = (row: PayrollEntry) => {
    setDetailTitle(`${t.actions.viewPayslip} - ${row.period[lang]}`);
    setDetailRows([
      { label: t.payrollTable.period, value: row.period[lang] },
      { label: t.payrollTable.base, value: money(row.baseSalary, t.currency) },
      { label: t.payrollTable.production, value: money(row.productionBonus, t.currency) },
      { label: t.payrollTable.bonuses, value: money(row.bonuses, t.currency) },
      { label: t.payrollTable.deductions, value: money(row.deductions, t.currency) },
      { label: t.payrollTable.advances, value: money(row.advances, t.currency) },
      { label: t.payrollTable.net, value: money(row.netSalary, t.currency) },
      { label: t.payrollTable.status, value: t.statuses[row.status] },
    ]);
  };

  return (
    <PageBackground>
      <AppHeader />
      <StitchDivider className="mt-6" />

      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={() => navigate("/workers")}
            className="flex shrink-0 items-center justify-center transition-colors hover:opacity-80"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}
          >
            <BackArrow size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
              {t.breadcrumb.map((item, index) => (
                <span key={item} className="flex items-center gap-1.5">
                  {index === 0 ? (
                    <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">{item}</button>
                  ) : index === 1 ? (
                    <button type="button" onClick={() => navigate("/salary")} className="transition-colors hover:opacity-80">{item}</button>
                  ) : (
                    <span style={{ color: index === t.breadcrumb.length - 1 ? palette.text : palette.muted, fontWeight: index === t.breadcrumb.length - 1 ? 700 : 500 }}>{item}</span>
                  )}
                  {index < t.breadcrumb.length - 1 ? <CrumbChevron size={14} /> : null}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>{t.title}</h1>
              <span style={{ width: 1, height: 22, backgroundColor: palette.border }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: palette.primary }}>{worker.name[lang]}</span>
            </div>
            <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 3, maxWidth: 680 }}>{t.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setEditWorkerOpen(true)}><Edit size={15} />{t.actions.editWorker}</Button>
          <Button variant="secondary" onClick={() => setAttendanceOpen(true)}><CalendarCheck size={15} />{t.actions.attendance}</Button>
          <Button variant="primary" onClick={() => openProduction()}><PackageCheck size={15} />{t.actions.addProduction}</Button>
          <Button variant="secondary" onClick={() => setSalaryOpen(true)}><Coins size={15} />{t.actions.calculateSalary}</Button>
          <Button variant="secondary" onClick={() => printPayslip()}><Printer size={15} />{t.actions.printPayslip}</Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/workers")}
        className="mt-4 inline-flex w-fit items-center gap-2 transition-colors hover:opacity-80"
        style={{ color: palette.primary, fontSize: 13, fontWeight: 800 }}
      >
        <BackArrow size={16} />
        {t.back}
      </button>

      <NoticeBanner notice={notice} lang={lang} onClose={() => setNotice(null)} />

      <Panel className="mt-5" padding={24}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center">
            <Avatar name={worker.name[lang]} size={86} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>{worker.name[lang]}</h2>
                <Badge bg={worker.status === "active" ? "rgba(77,138,106,0.12)" : "rgba(180,106,102,0.12)"} fg={worker.status === "active" ? "#4d8a6a" : "#b46a66"} dot={worker.status === "active" ? "#4d8a6a" : "#b46a66"}>
                  {worker.status === "active" ? t.profile.active : t.profile.stopped}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 lg:grid-cols-4">
                <InfoBlock label={t.profile.name} value={worker.name[lang]} />
                <InfoBlock label={t.profile.role} value={worker.role[lang]} />
                <InfoBlock label={t.profile.salaryType} value={t.statuses[worker.salaryType]} />
                <InfoBlock label={t.profile.pieceRate} value={money(worker.pieceRate, t.currency)} />
                <InfoBlock label={t.profile.startDate} value={<span style={{ direction: "ltr" }}>{worker.startDate}</span>} />
                <InfoBlock label={t.profile.status} value={worker.status === "active" ? t.profile.active : t.profile.stopped} />
                <InfoBlock label={t.profile.phone} value={<span style={{ direction: "ltr" }}>{worker.phone}</span>} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(worker.phone).catch(() => undefined);
                showNotice({ ar: "تم تجهيز الاتصال", fr: "Appel prepare" }, { ar: `تم نسخ رقم ${worker.phone}.`, fr: `Le numero ${worker.phone} a ete copie.` });
              }}
            >
              <Phone size={15} />
              {t.actions.call}
            </Button>
            <Button variant="secondary" onClick={() => setEditWorkerOpen(true)}><Edit size={15} />{t.actions.edit}</Button>
            <Button
              variant={worker.status === "active" ? "secondary" : "primary"}
              onClick={() => {
                setWorker((current) => ({ ...current, status: current.status === "active" ? "stopped" : "active" }));
                showNotice({ ar: "تم تحديث حالة العامل", fr: "Statut mis a jour" }, { ar: "تم تغيير حالة العامل داخل الملف.", fr: "Le statut du travailleur a ete modifie." });
              }}
            >
              <AlertCircle size={15} />
              {worker.status === "active" ? t.actions.stopWorker : t.actions.activateWorker}
            </Button>
          </div>
        </div>
      </Panel>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <main className="mt-5 grid grid-cols-1 gap-5 pb-10 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <section className="min-w-0">
          <TabsNav active={tab} labels={t.tabs} onChange={setTab} />
          <div className="mt-5">
            {tab === "overview" ? <OverviewTab t={t} lang={lang} production={productionRows} attendance={attendanceRows} activity={activityRows} /> : null}
            {tab === "production" ? <ProductionTable t={t} lang={lang} rows={productionRows} onAdd={() => openProduction()} onView={openProductionDetail} onEdit={openProduction} /> : null}
            {tab === "attendance" ? <AttendanceTable t={t} rows={attendanceRows} onAdd={() => setAttendanceOpen(true)} /> : null}
            {tab === "payroll" ? <PayrollTable t={t} lang={lang} rows={payrollRows} onView={openPayrollDetail} onPay={payCurrentSalary} onPrint={printPayslip} /> : null}
            {tab === "adjustments" ? (
              <AdjustmentsTab
                t={t}
                lang={lang}
                advances={advanceRows}
                adjustments={adjustmentRows}
                onAdvance={() => setAdvanceOpen(true)}
                onBonus={() => setAdjustmentType("bonus")}
                onDeduction={() => setAdjustmentType("deduction")}
              />
            ) : null}
            {tab === "notes" ? <NotesTab t={t} lang={lang} notes={noteRows} onAdd={() => setNoteOpen(true)} /> : null}
          </div>
        </section>

        <WorkerSidebar t={t} lang={lang} payroll={payrollRows} production={productionRows} onPay={() => payCurrentSalary()} />
      </main>

      <ProductionModal open={productionOpen} onClose={() => setProductionOpen(false)} t={t} lang={lang} worker={worker} initial={productionEdit} onSave={handleSaveProduction} />
      <AttendanceModal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        t={t}
        lang={lang}
        worker={worker}
        onSave={(entry) => {
          setAttendanceRows((current) => [entry, ...current]);
          setTab("attendance");
          pushActivity({ ar: "تسجيل حضور جديد", fr: "Presence enregistree" });
          showNotice({ ar: "تم تسجيل الحضور", fr: "Presence enregistree" }, { ar: "تم تحديث سجل الحضور.", fr: "L'historique de presence est mis a jour." });
        }}
      />
      <SalaryModal
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
        t={t}
        lang={lang}
        worker={worker}
        onSave={(row) => {
          setPayrollRows((current) => [row, ...current]);
          setTab("payroll");
          pushActivity({ ar: "حساب راتب جديد", fr: "Salaire calcule" });
          showNotice({ ar: "تم حساب الراتب", fr: "Salaire calcule" }, { ar: `الصافي الجديد ${money(row.netSalary, t.currency)}.`, fr: `Nouveau net ${money(row.netSalary, t.currency)}.` });
        }}
      />
      <AdvanceModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        t={t}
        lang={lang}
        onSave={(row) => {
          setAdvanceRows((current) => [row, ...current]);
          setTab("adjustments");
          pushActivity({ ar: "إضافة سلفة", fr: "Avance ajoutee" });
          showNotice({ ar: "تمت إضافة السلفة", fr: "Avance ajoutee" }, { ar: `تم تسجيل ${money(row.amount, t.currency)} كسلفة.`, fr: `${money(row.amount, t.currency)} enregistres comme avance.` });
        }}
      />
      <AdjustmentModal
        open={!!adjustmentType}
        type={adjustmentType ?? "bonus"}
        onClose={() => setAdjustmentType(null)}
        t={t}
        onSave={(row) => {
          setAdjustmentRows((current) => [row, ...current]);
          setTab("adjustments");
          pushActivity({ ar: row.type === "bonus" ? "إضافة مكافأة" : "إضافة خصم", fr: row.type === "bonus" ? "Prime ajoutee" : "Retenue ajoutee" });
          showNotice({ ar: "تم حفظ العملية", fr: "Operation enregistree" }, { ar: "تم تحديث المكافآت والخصومات.", fr: "Primes et retenues mises a jour." });
        }}
      />
      <NoteModal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        t={t}
        onSave={(note) => {
          if (!note.trim()) return;
          setNoteRows((current) => [{ ar: note, fr: note }, ...current]);
          setTab("notes");
          pushActivity({ ar: "إضافة ملاحظة", fr: "Note ajoutee" });
          showNotice({ ar: "تمت إضافة الملاحظة", fr: "Note ajoutee" }, { ar: "ظهرت الملاحظة في ملف العامل.", fr: "La note est visible dans la fiche travailleur." });
        }}
      />
      <EditWorkerModal
        open={editWorkerOpen}
        onClose={() => setEditWorkerOpen(false)}
        t={t}
        lang={lang}
        worker={worker}
        onSave={(nextWorker) => {
          setWorker(nextWorker);
          showNotice({ ar: "تم حفظ معلومات العامل", fr: "Travailleur enregistre" }, { ar: "تم تحديث بطاقة العامل.", fr: "La fiche travailleur est mise a jour." });
        }}
      />
      <DetailModal open={!!detailRows} title={detailTitle || t.modals.detailTitle} rows={detailRows ?? []} onClose={() => setDetailRows(null)} />
    </PageBackground>
  );
}
