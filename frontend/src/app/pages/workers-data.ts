import type { Lang } from "../content";

export type RoleId =
  | "tailor"
  | "assistant"
  | "cutter"
  | "ironing"
  | "packaging"
  | "seller"
  | "supervisor";

export type SalaryId = "daily" | "weekly" | "monthly" | "piece" | "mixed";
export type StatusId = "active" | "leave" | "stopped";

type Bilingual = { ar: string; fr: string };

export const roleLabels: Record<RoleId, Bilingual> = {
  tailor: { ar: "خياط", fr: "Couturier" },
  assistant: { ar: "مساعد", fr: "Assistant" },
  cutter: { ar: "قاطع قماش", fr: "Coupeur" },
  ironing: { ar: "مسؤول كي", fr: "Repassage" },
  packaging: { ar: "مسؤول تغليف", fr: "Emballage" },
  seller: { ar: "بائع", fr: "Vendeur" },
  supervisor: { ar: "مشرف", fr: "Superviseur" },
};

export const roleColors: Record<RoleId, { bg: string; fg: string }> = {
  tailor: { bg: "rgba(18,60,74,0.10)", fg: "#123c4a" },
  assistant: { bg: "rgba(138,136,127,0.14)", fg: "#6b6a62" },
  cutter: { bg: "rgba(195,154,91,0.16)", fg: "#a87d3c" },
  ironing: { bg: "rgba(201,138,134,0.16)", fg: "#b46a66" },
  packaging: { bg: "rgba(90,130,120,0.14)", fg: "#4d7a6b" },
  seller: { bg: "rgba(96,120,160,0.14)", fg: "#4f6a99" },
  supervisor: { bg: "rgba(18,60,74,0.14)", fg: "#0d2d38" },
};

export const salaryLabels: Record<SalaryId, Bilingual> = {
  daily: { ar: "يومي", fr: "Journalier" },
  weekly: { ar: "أسبوعي", fr: "Hebdomadaire" },
  monthly: { ar: "شهري", fr: "Mensuel" },
  piece: { ar: "حسب القطعة", fr: "À la pièce" },
  mixed: { ar: "مختلط", fr: "Mixte" },
};

export const statusLabels: Record<StatusId, Bilingual> = {
  active: { ar: "نشط", fr: "Actif" },
  leave: { ar: "في عطلة", fr: "En congé" },
  stopped: { ar: "متوقف", fr: "Arrêté" },
};

export const statusColors: Record<StatusId, string> = {
  active: "#4d8a6a",
  leave: "#c39a5b",
  stopped: "#b46a66",
};

export type Attendance = "present" | "absent";

export type Worker = {
  id: string;
  name: Bilingual;
  role: RoleId;
  phone: string;
  startDate: string;
  salaryType: SalaryId;
  salaryValue?: number;
  salaryRate: Bilingual;
  attendance: Attendance;
  pieces: number;
  productivity: number; // 0 - 100
  status: StatusId;
  note: Bilingual;
};

export const ar = {
  breadcrumbHome: "الرئيسية",
  breadcrumbWorkers: "تسيير العمال",
  title: "تسيير العمال",
  subtitle: "إدارة معلومات العمال، الحضور، الإنتاجية وأنواع الأجور بطريقة واضحة ومنظمة",
  summary: {
    total: "إجمالي العمال",
    present: "الحاضرون اليوم",
    absent: "الغائبون اليوم",
    pieces: "القطع المنجزة هذا الشهر",
  },
  search: "البحث عن عامل...",
  allRoles: "كل الوظائف",
  allSalary: "كل أنواع الأجر",
  allStatus: "كل الحالات",
  period: "فترة الإنتاجية",
  addWorker: "إضافة عامل",
  export: "تصدير",
  markToday: "تسجيل حضور اليوم",
  tabs: {
    all: "جميع العمال",
    attendance: "الحضور والغياب",
    productivity: "الإنتاجية",
    notes: "الملاحظات",
  },
  cols: {
    name: "الاسم",
    role: "الوظيفة",
    phone: "رقم الهاتف",
    start: "تاريخ البداية",
    salary: "نوع الأجر",
    attendance: "الحضور",
    pieces: "القطع المنجزة",
    productivity: "الإنتاجية",
    status: "الحالة",
    actions: "إجراءات",
  },
  present: "حاضر",
  absent: "غائب",
  view: "عرض",
  edit: "تعديل",
  notes: "ملاحظات",
  delete: "حذف",
  emptyPanelTitle: "لم يتم اختيار عامل",
  emptyPanelText: "اختر عاملاً من القائمة لعرض تفاصيله الكاملة.",
  panel: {
    phone: "رقم الهاتف",
    start: "تاريخ البداية",
    salaryType: "نوع الأجر",
    salaryRate: "قيمة الأجر",
    attendance: "ملخص الحضور",
    pieces: "إجمالي القطع",
    performance: "مستوى الأداء",
    latestNote: "آخر ملاحظة",
    editData: "تعديل البيانات",
    markAttendance: "تسجيل حضور",
    addNote: "إضافة ملاحظة",
    fullDetails: "عرض التفاصيل الكاملة",
  },
  attendanceWidget: {
    title: "حضور اليوم",
    present: "حاضرون",
    absent: "غائبون",
    action: "تسجيل الحضور",
  },
  topProductive: "أكثر العمال إنتاجية هذا الأسبوع",
  pieceUnit: "قطعة",
  modal: {
    title: "إضافة عامل جديد",
    fullName: "الاسم الكامل",
    phone: "رقم الهاتف",
    role: "الوظيفة",
    startDate: "تاريخ بداية العمل",
    salaryType: "نوع الأجر",
    salaryRate: "قيمة الأجر",
    notes: "ملاحظات",
    status: "الحالة",
    save: "حفظ",
    cancel: "إلغاء",
  },
  showing: "عرض",
  of: "من",
  workers: "عامل",
};

export const fr: typeof ar = {
  breadcrumbHome: "Accueil",
  breadcrumbWorkers: "Gestion des travailleurs",
  title: "Gestion des travailleurs",
  subtitle:
    "Gérez les informations du personnel, la présence, la productivité et les types de salaire de façon claire et organisée",
  summary: {
    total: "Total des travailleurs",
    present: "Présents aujourd'hui",
    absent: "Absents aujourd'hui",
    pieces: "Pièces produites ce mois",
  },
  search: "Rechercher un travailleur...",
  allRoles: "Tous les postes",
  allSalary: "Tous les salaires",
  allStatus: "Tous les statuts",
  period: "Période de productivité",
  addWorker: "Ajouter",
  export: "Exporter",
  markToday: "Marquer la présence",
  tabs: {
    all: "Tous les travailleurs",
    attendance: "Présences",
    productivity: "Productivité",
    notes: "Notes",
  },
  cols: {
    name: "Nom",
    role: "Poste",
    phone: "Téléphone",
    start: "Date de début",
    salary: "Salaire",
    attendance: "Présence",
    pieces: "Pièces",
    productivity: "Productivité",
    status: "Statut",
    actions: "Actions",
  },
  present: "Présent",
  absent: "Absent",
  view: "Voir",
  edit: "Modifier",
  notes: "Notes",
  delete: "Supprimer",
  emptyPanelTitle: "Aucun travailleur sélectionné",
  emptyPanelText: "Sélectionnez un travailleur dans la liste pour voir ses détails.",
  panel: {
    phone: "Téléphone",
    start: "Date de début",
    salaryType: "Type de salaire",
    salaryRate: "Montant du salaire",
    attendance: "Résumé de présence",
    pieces: "Total des pièces",
    performance: "Niveau de performance",
    latestNote: "Dernière note",
    editData: "Modifier les données",
    markAttendance: "Marquer présence",
    addNote: "Ajouter une note",
    fullDetails: "Voir tous les détails",
  },
  attendanceWidget: {
    title: "Présence du jour",
    present: "Présents",
    absent: "Absents",
    action: "Marquer la présence",
  },
  topProductive: "Travailleurs les plus productifs cette semaine",
  pieceUnit: "pièces",
  modal: {
    title: "Ajouter un nouveau travailleur",
    fullName: "Nom complet",
    phone: "Téléphone",
    role: "Poste",
    startDate: "Date de début",
    salaryType: "Type de salaire",
    salaryRate: "Montant du salaire",
    notes: "Notes",
    status: "Statut",
    save: "Enregistrer",
    cancel: "Annuler",
  },
  showing: "Affichage de",
  of: "sur",
  workers: "travailleurs",
};

export const workersText = { ar, fr };
