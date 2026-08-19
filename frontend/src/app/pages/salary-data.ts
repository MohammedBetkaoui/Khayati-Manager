import { palette } from "../content";

export type Lang = "ar" | "fr";
export type Bilingual = { ar: string; fr: string };

export type SalaryType = "daily" | "weekly" | "monthly" | "piece" | "mixed";
export type PaymentStatus = "paid" | "partial" | "unpaid";
export type WorkerRole = "tailor" | "assistant" | "cutter" | "ironer" | "packer" | "seller" | "supervisor";

export type PayrollRecord = {
  id: string;
  workerName: Bilingual;
  role: WorkerRole;
  salaryType: SalaryType;
  period: string; // e.g. "جوان 2026"
  workDays: number;
  absentDays: number;
  lateHours: number;
  piecesCount: number;
  pieceRate: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  advances: number;
  netSalary: number;
  paidAmount: number;
  paymentDate: string | null;
  status: PaymentStatus;
  notes: Bilingual;
};

export const roleLabels: Record<WorkerRole, Bilingual> = {
  tailor: { ar: "خياط", fr: "Tailleur" },
  assistant: { ar: "مساعد", fr: "Assistant" },
  cutter: { ar: "قاطع قماش", fr: "Coupeur" },
  ironer: { ar: "مسؤول كي", fr: "Repasseur" },
  packer: { ar: "مسؤول تغليف", fr: "Emballeur" },
  seller: { ar: "بائع", fr: "Vendeur" },
  supervisor: { ar: "مشرف", fr: "Superviseur" },
};

export const salaryTypeLabels: Record<SalaryType, Bilingual> = {
  daily: { ar: "يومي", fr: "Journalier" },
  weekly: { ar: "أسبوعي", fr: "Hebdomadaire" },
  monthly: { ar: "شهري", fr: "Mensuel" },
  piece: { ar: "حسب القطعة", fr: "À la pièce" },
  mixed: { ar: "مختلط", fr: "Mixte" },
};

export const paymentStatusLabels: Record<PaymentStatus, Bilingual> = {
  paid: { ar: "مدفوع", fr: "Payé" },
  partial: { ar: "مدفوع جزئياً", fr: "Paiement partiel" },
  unpaid: { ar: "غير مدفوع", fr: "Non payé" },
};

export const paymentStatusColors: Record<PaymentStatus, string> = {
  paid: "#4d8a6a",
  partial: "#a87d3c",
  unpaid: "#b46a66",
};

export const salaryText: Record<Lang, any> = {
  ar: {
    currency: "د.ج",
    breadcrumbHome: "الرئيسية",
    breadcrumb: "تسيير الرواتب",
    title: "تسيير الرواتب",
    subtitle: "حساب أجور العمال حسب اليوم، الأسبوع، الشهر أو عدد القطع مع متابعة السلفيات والخصومات والمكافآت",
    summary: {
      total: "إجمالي الرواتب", totalHelp: "مجموع الرواتب للفترة المحددة",
      paid: "رواتب مدفوعة", paidHelp: "العمال الذين تم دفع أجورهم",
      unpaid: "رواتب غير مدفوعة", unpaidHelp: "العمال في انتظار الدفع",
      advances: "إجمالي السلفيات", advancesHelp: "المبالغ المسجلة كسلف",
      bonuses: "المكافآت والخصومات", bonusesHelp: "تأثير الإضافات والخصومات",
    },
    tabs: {
      all: "كل الرواتب",
      paid: "مدفوعة",
      unpaid: "غير مدفوعة",
      advances: "السلفيات",
      bonuses: "المكافآت والخصومات",
      reports: "تقارير الرواتب",
    },
    actions: {
      search: "البحث عن عامل...",
      calcSalary: "حساب راتب",
      addAdvance: "تسجيل سلفة",
      addBonus: "مكافأة / خصم",
      export: "تصدير",
      print: "طباعة التقرير",
      allTypes: "الكل (النوع)",
      allStatus: "الكل (الحالة)",
      allRoles: "الكل (الوظيفة)",
      allDates: "كل الفترات",
      today: "اليوم",
      thisWeek: "هذا الأسبوع",
      thisMonth: "هذا الشهر",
    },
    table: {
      title: "قائمة الرواتب",
      worker: "العامل",
      role: "الوظيفة",
      type: "نوع الأجر",
      period: "الفترة",
      base: "الأجر الأساسي",
      pieces: "القطع",
      bonus: "المكافآت",
      deduction: "الخصومات",
      advance: "السلفيات",
      net: "الصافي للدفع",
      status: "حالة الدفع",
      actions: "إجراءات",
      empty: "لا توجد رواتب مطابقة للبحث",
    },
    preview: {
      title: "تفاصيل الراتب",
      payslipTitle: "كشف راتب",
      empty: "اختر راتب عامل لعرض التفاصيل",
      workshopName: "خياطتي Manager",
      workerName: "اسم العامل",
      role: "الوظيفة",
      type: "نوع الأجر",
      period: "الفترة",
      workDays: "أيام العمل",
      absentDays: "أيام الغياب",
      lateHours: "ساعات التأخر",
      piecesCount: "القطع المنجزة",
      pieceRate: "سعر القطعة",
      baseSalary: "الأجر الأساسي",
      bonus: "المكافآت",
      deduction: "الخصومات",
      advance: "السلفيات",
      netSalary: "صافي الراتب",
      status: "حالة الدفع",
      payDate: "تاريخ الدفع",
      notes: "ملاحظات",
      actions: {
        confirmPay: "تأكيد الدفع",
        partialPay: "دفع جزئي",
        addAdvance: "إضافة سلفة",
        addBonus: "إضافة مكافأة/خصم",
        print: "طباعة الكشف",
      }
    },
    modals: {
      calc: {
        title: "حساب راتب عامل",
        worker: "اختيار العامل",
        type: "نوع الأجر",
        period: "الفترة",
        workDays: "عدد أيام العمل",
        absentDays: "عدد أيام الغياب",
        piecesCount: "عدد القطع المنجزة",
        pieceRate: "سعر القطعة",
        base: "الأجر الأساسي",
        bonus: "المكافآت",
        deduction: "الخصومات",
        advance: "السلفيات",
        net: "صافي الراتب",
        methodTitle: "طريقة الحساب",
        methodDaily: "أجر يومي = عدد أيام العمل × قيمة اليوم",
        methodPiece: "أجر حسب القطعة = عدد القطع × سعر القطعة",
        methodMixed: "أجر مختلط = راتب ثابت + مكافأة الإنتاج - الخصومات - السلفيات",
        save: "حفظ",
        savePay: "حفظ وتأكيد الدفع",
        cancel: "إلغاء",
      },
      advance: {
        title: "تسجيل سلفة",
        worker: "اختيار العامل",
        amount: "مبلغ السلفة",
        date: "التاريخ",
        deductMethod: "طريقة الخصم",
        deductMonth: "تخصم من راتب هذا الشهر",
        deductPart: "تخصم بالتقسيط",
        deductLater: "تخصم لاحقاً",
        notes: "ملاحظات",
        save: "تسجيل السلفة",
      },
      bonus: {
        title: "إضافة مكافأة أو خصم",
        worker: "اختيار العامل",
        type: "النوع",
        amount: "المبلغ",
        reason: "السبب",
        date: "التاريخ",
        notes: "ملاحظات",
        typeProd: "مكافأة إنتاج",
        typeQual: "مكافأة جودة",
        typeAbs: "خصم غياب",
        typeLate: "خصم تأخر",
        typeErr: "خصم خطأ في العمل",
        typeOther: "آخر",
        save: "حفظ العملية",
      },
      pay: {
        title: "تأكيد دفع الراتب",
        worker: "العامل",
        net: "صافي الراتب",
        paid: "المبلغ المدفوع",
        method: "طريقة الدفع",
        date: "تاريخ الدفع",
        notes: "ملاحظات",
        methodCash: "نقداً",
        methodTransfer: "تحويل",
        methodPartial: "دفع جزئي",
        save: "تأكيد الدفع",
        remaining: "المتبقي",
      }
    },
    helpers: {
      title: "أنواع الأجور",
      daily: "يومي: مبلغ ثابت لكل يوم عمل",
      weekly: "أسبوعي: حساب نهاية كل أسبوع",
      monthly: "شهري: راتب ثابت كل شهر",
      piece: "حسب القطعة: عدد القطع × سعر القطعة",
      mixed: "مختلط: راتب ثابت + مكافآت الإنتاج",
    },
    alerts: {
      title: "تنبيهات الرواتب",
      adv: "عامل لديه سلفة غير مخصومة",
      latePay: "راتب غير مدفوع منذ أكثر من 7 أيام",
      absReview: "خصم غياب يحتاج إلى مراجعة",
      pieceCalc: "عامل بنظام القطعة لم يتم حساب إنتاجه بعد",
    }
  },
  fr: {
    currency: "DA",
    breadcrumbHome: "Accueil",
    breadcrumb: "Gestion des salaires",
    title: "Gestion des salaires",
    subtitle: "Calcul des salaires par jour, semaine, mois ou à la pièce avec suivi des avances et primes",
    summary: {
      total: "Total des salaires", totalHelp: "Somme des salaires de la période",
      paid: "Salaires payés", paidHelp: "Travailleurs ayant reçu leur salaire",
      unpaid: "Salaires impayés", unpaidHelp: "Travailleurs en attente de paiement",
      advances: "Total des avances", advancesHelp: "Montants enregistrés comme avances",
      bonuses: "Primes & Retenues", bonusesHelp: "Impact des ajouts et déductions",
    },
    tabs: {
      all: "Tous les salaires",
      paid: "Payés",
      unpaid: "Impayés",
      advances: "Avances",
      bonuses: "Primes et Retenues",
      reports: "Rapports",
    },
    actions: {
      search: "Chercher un travailleur...",
      calcSalary: "Calculer salaire",
      addAdvance: "Avance",
      addBonus: "Prime / Retenue",
      export: "Exporter",
      print: "Imprimer rapport",
      allTypes: "Tous (Type)",
      allStatus: "Tous (Statut)",
      allRoles: "Tous (Rôle)",
      allDates: "Toutes périodes",
      today: "Aujourd'hui",
      thisWeek: "Cette semaine",
      thisMonth: "Ce mois",
    },
    table: {
      title: "Liste des salaires",
      worker: "Travailleur",
      role: "Rôle",
      type: "Type",
      period: "Période",
      base: "Salaire de base",
      pieces: "Pièces",
      bonus: "Primes",
      deduction: "Retenues",
      advance: "Avances",
      net: "Net à payer",
      status: "Statut",
      actions: "Actions",
      empty: "Aucun salaire trouvé",
    },
    preview: {
      title: "Détails du salaire",
      payslipTitle: "Fiche de paie",
      empty: "Sélectionnez un salaire pour voir les détails",
      workshopName: "Khayti Manager",
      workerName: "Travailleur",
      role: "Rôle",
      type: "Type",
      period: "Période",
      workDays: "Jours travaillés",
      absentDays: "Jours d'absence",
      lateHours: "Heures de retard",
      piecesCount: "Pièces",
      pieceRate: "Prix unitaire",
      baseSalary: "Salaire de base",
      bonus: "Primes",
      deduction: "Retenues",
      advance: "Avances",
      netSalary: "Salaire Net",
      status: "Statut",
      payDate: "Date de paiement",
      notes: "Notes",
      actions: {
        confirmPay: "Confirmer paiement",
        partialPay: "Paiement partiel",
        addAdvance: "Ajouter avance",
        addBonus: "Prime/Retenue",
        print: "Imprimer fiche",
      }
    },
    modals: {
      calc: {
        title: "Calculer un salaire",
        worker: "Travailleur",
        type: "Type",
        period: "Période",
        workDays: "Jours travaillés",
        absentDays: "Jours d'absence",
        piecesCount: "Pièces réalisées",
        pieceRate: "Prix unitaire",
        base: "Salaire de base",
        bonus: "Primes",
        deduction: "Retenues",
        advance: "Avances",
        net: "Salaire net",
        methodTitle: "Méthode de calcul",
        methodDaily: "Journalier = Jours travaillés × Prix par jour",
        methodPiece: "À la pièce = Nombre de pièces × Prix unitaire",
        methodMixed: "Mixte = Salaire fixe + Primes - Retenues - Avances",
        save: "Enregistrer",
        savePay: "Enregistrer & Payer",
        cancel: "Annuler",
      },
      advance: {
        title: "Enregistrer une avance",
        worker: "Travailleur",
        amount: "Montant",
        date: "Date",
        deductMethod: "Méthode de retenue",
        deductMonth: "Retenir ce mois",
        deductPart: "Retenir par tranches",
        deductLater: "Retenir plus tard",
        notes: "Notes",
        save: "Enregistrer l'avance",
      },
      bonus: {
        title: "Prime ou Retenue",
        worker: "Travailleur",
        type: "Type",
        amount: "Montant",
        reason: "Raison",
        date: "Date",
        notes: "Notes",
        typeProd: "Prime de production",
        typeQual: "Prime de qualité",
        typeAbs: "Retenue absence",
        typeLate: "Retenue retard",
        typeErr: "Retenue erreur",
        typeOther: "Autre",
        save: "Enregistrer",
      },
      pay: {
        title: "Confirmer paiement",
        worker: "Travailleur",
        net: "Salaire Net",
        paid: "Montant payé",
        method: "Méthode",
        date: "Date",
        notes: "Notes",
        methodCash: "Espèces",
        methodTransfer: "Virement",
        methodPartial: "Paiement partiel",
        save: "Confirmer paiement",
        remaining: "Reste",
      }
    },
    helpers: {
      title: "Types de salaires",
      daily: "Journalier : Montant fixe par jour travaillé",
      weekly: "Hebdomadaire : Calcul en fin de semaine",
      monthly: "Mensuel : Salaire fixe chaque mois",
      piece: "Pièce : Nombre de pièces × Prix",
      mixed: "Mixte : Fixe + Prime de production",
    },
    alerts: {
      title: "Alertes Salaires",
      adv: "Travailleur avec avance non retenue",
      latePay: "Salaire impayé depuis plus de 7 jours",
      absReview: "Retenue d'absence à réviser",
      pieceCalc: "Production non calculée pour travailleur à la pièce",
    }
  }
};

export { palette };
