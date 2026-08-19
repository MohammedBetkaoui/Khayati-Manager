import { palette } from "../content";

export type Lang = "ar" | "fr";
export type Bilingual = { ar: string; fr: string };

export type ExpenseCategory = "fabric" | "thread" | "rent" | "utilities" | "maintenance" | "salaries" | "transport" | "other";
export type ExpenseType = "fixed" | "variable" | "recurring";
export type PaymentMethod = "cash" | "transfer" | "later";
export type LinkedTo = "stock" | "production" | "salary" | "order" | "general";

export type ExpenseRecord = {
  id: string;
  name: Bilingual;
  category: ExpenseCategory;
  type: ExpenseType;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  supplier: string;
  linkedTo: LinkedTo;
  isRecurring: boolean;
  notes: Bilingual;
  lastUpdated: string;
};

export const categoryLabels: Record<ExpenseCategory, Bilingual> = {
  fabric: { ar: "أقمشة", fr: "Tissus" },
  thread: { ar: "خيوط وإكسسوارات", fr: "Fils et accessoires" },
  rent: { ar: "كراء", fr: "Loyer" },
  utilities: { ar: "كهرباء وماء", fr: "Électricité & Eau" },
  maintenance: { ar: "صيانة آلات", fr: "Maintenance" },
  salaries: { ar: "أجور العمال", fr: "Salaires" },
  transport: { ar: "نقل", fr: "Transport" },
  other: { ar: "أخرى", fr: "Autre" },
};

export const typeLabels: Record<ExpenseType, Bilingual> = {
  fixed: { ar: "ثابت", fr: "Fixe" },
  variable: { ar: "متغير", fr: "Variable" },
  recurring: { ar: "متكرر", fr: "Récurrent" },
};

export const typeColors: Record<ExpenseType, string> = {
  fixed: "#6b8aa0", // soft blue
  variable: "#a87d3c", // soft amber
  recurring: "#8a6ea0", // soft purple
};

export const methodLabels: Record<PaymentMethod, Bilingual> = {
  cash: { ar: "نقداً", fr: "Espèces" },
  transfer: { ar: "تحويل", fr: "Virement" },
  later: { ar: "دفع لاحق", fr: "Paiement différé" },
};

export const methodColors: Record<PaymentMethod, string> = {
  cash: "#4d8a6a",
  transfer: "#123c4a",
  later: "#b46a66",
};

export const linkLabels: Record<LinkedTo, Bilingual> = {
  stock: { ar: "المخزون", fr: "Stock" },
  production: { ar: "الإنتاج", fr: "Production" },
  salary: { ar: "الرواتب", fr: "Salaires" },
  order: { ar: "طلبية", fr: "Commande" },
  general: { ar: "عام", fr: "Général" },
};

export const mockExpenses: ExpenseRecord[] = [
  {
    id: "exp_1",
    name: { ar: "شراء قماش قطني", fr: "Achat tissu coton" },
    category: "fabric",
    type: "variable",
    date: "2026-06-12",
    amount: 18000,
    paymentMethod: "cash",
    supplier: "مورد النسيج - أحمد",
    linkedTo: "stock",
    isRecurring: false,
    notes: { ar: "تكفي لـ 4 طلبيات قادمة", fr: "Suffisant pour 4 commandes" },
    lastUpdated: "2026-06-12"
  },
  {
    id: "exp_2",
    name: { ar: "كراء المحل", fr: "Loyer de l'atelier" },
    category: "rent",
    type: "fixed",
    date: "2026-06-01",
    amount: 35000,
    paymentMethod: "transfer",
    supplier: "مالك العقار",
    linkedTo: "general",
    isRecurring: true,
    notes: { ar: "تم الدفع عن طريق البنك", fr: "Payé par virement bancaire" },
    lastUpdated: "2026-06-01"
  },
  {
    id: "exp_3",
    name: { ar: "صيانة آلة خياطة", fr: "Maintenance machine" },
    category: "maintenance",
    type: "variable",
    date: "2026-06-08",
    amount: 6500,
    paymentMethod: "cash",
    supplier: "تقني الصيانة سعيد",
    linkedTo: "general",
    isRecurring: false,
    notes: { ar: "تغيير محرك الآلة رقم 03", fr: "Changement moteur machine 03" },
    lastUpdated: "2026-06-08"
  },
  {
    id: "exp_4",
    name: { ar: "رواتب العمال (الأسبوع الأول)", fr: "Salaires (1ère semaine)" },
    category: "salaries",
    type: "recurring",
    date: "2026-06-07",
    amount: 45000,
    paymentMethod: "cash",
    supplier: "العمال",
    linkedTo: "salary",
    isRecurring: true,
    notes: { ar: "رواتب أسبوعية لـ 4 عمال", fr: "Salaires hebdo de 4 ouvriers" },
    lastUpdated: "2026-06-07"
  },
  {
    id: "exp_5",
    name: { ar: "فاتورة الكهرباء والغاز", fr: "Facture électricité & gaz" },
    category: "utilities",
    type: "recurring",
    date: "2026-06-10",
    amount: 12500,
    paymentMethod: "later",
    supplier: "سونلغاز",
    linkedTo: "general",
    isRecurring: true,
    notes: { ar: "تُدفع قبل نهاية الشهر", fr: "À payer avant la fin du mois" },
    lastUpdated: "2026-06-10"
  }
];

export const expensesText: Record<Lang, any> = {
  ar: {
    currency: "د.ج",
    breadcrumbHome: "الرئيسية",
    breadcrumb: "تسيير المصاريف",
    title: "تسيير المصاريف",
    subtitle: "تسجيل ومتابعة مصاريف الورشة لمعرفة الربح الحقيقي والتحكم في التكاليف",
    summary: {
      today: "مصاريف اليوم", todayHelp: "إجمالي المصاريف المسجلة اليوم",
      month: "مصاريف هذا الشهر", monthHelp: "مجموع مصاريف الفترة الحالية",
      topCat: "أكبر فئة مصروف", topCatHelp: "الفئة الأكثر استهلاكاً للمال",
      fixed: "المصاريف الثابتة", fixedHelp: "كراء، كهرباء، أجور وغيرها",
      netProfit: "الربح الصافي التقريبي", netProfitHelp: "المبيعات ناقص المصاريف",
    },
    tabs: {
      all: "كل المصاريف",
      fixed: "المصاريف الثابتة",
      variable: "المصاريف المتغيرة",
      recurring: "المصاريف المتكررة",
      category: "حسب الفئة",
      reports: "تقارير المصاريف",
    },
    actions: {
      search: "البحث عن مصروف...",
      addExp: "إضافة مصروف",
      addRecurring: "مصروف متكرر",
      export: "تصدير",
      print: "طباعة التقرير",
      allCat: "الكل (فئة)",
      allType: "الكل (نوع)",
      allMethod: "الكل (طريقة الدفع)",
      allDates: "كل الفترات",
      today: "اليوم",
      thisWeek: "هذا الأسبوع",
      thisMonth: "هذا الشهر",
    },
    table: {
      title: "قائمة المصاريف",
      id: "رقم العملية",
      name: "اسم المصروف",
      category: "الفئة",
      type: "النوع",
      date: "التاريخ",
      amount: "المبلغ",
      method: "طريقة الدفع",
      linkedTo: "مرتبط بـ",
      notes: "ملاحظات",
      actions: "إجراءات",
      empty: "لا توجد مصاريف مطابقة للبحث",
    },
    preview: {
      title: "تفاصيل المصروف",
      empty: "اختر مصروفاً لعرض التفاصيل",
      name: "اسم المصروف",
      category: "الفئة",
      type: "نوع المصروف",
      date: "التاريخ",
      amount: "المبلغ",
      method: "طريقة الدفع",
      supplier: "المورد أو الجهة",
      linkedTo: "مرتبط بـ",
      isRecurring: "مصروف متكرر؟",
      yes: "نعم", no: "لا",
      notes: "ملاحظات",
      lastUpdated: "تاريخ آخر تعديل",
      actions: {
        edit: "تعديل المصروف",
        repeat: "تكرار المصروف",
        linkStock: "ربط بالمخزون",
        linkProd: "ربط بالإنتاج",
        print: "طباعة الإيصال",
      }
    },
    breakdown: {
      title: "توزيع المصاريف",
    },
    netProfitCard: {
      title: "الربح الحقيقي",
      sales: "إجمالي المبيعات",
      expenses: "إجمالي المصاريف",
      net: "صافي الربح",
      ratio: "نسبة المصاريف من المبيعات",
    },
    alerts: {
      title: "تنبيهات المصاريف",
      recurringDue: "مصروف متكرر قريب من تاريخ الدفع",
      highCost: "ارتفاع مصاريف القماش هذا الشهر",
      unlinked: "مصروف غير مرتبط بأي قسم",
      laterDue: "دفع لاحق يحتاج إلى متابعة",
    },
    modals: {
      add: {
        title: "إضافة مصروف جديد",
        name: "اسم المصروف",
        category: "الفئة",
        type: "نوع المصروف",
        amount: "المبلغ",
        method: "طريقة الدفع",
        date: "التاريخ",
        supplier: "المورد أو الجهة",
        linkedTo: "مرتبط بـ",
        notes: "ملاحظات",
        save: "حفظ المصروف",
        saveAndAdd: "حفظ وإضافة آخر",
        cancel: "إلغاء",
      },
      recurring: {
        title: "إضافة مصروف متكرر",
        name: "اسم المصروف",
        category: "الفئة",
        amount: "المبلغ",
        freq: "التكرار",
        freqMonthly: "شهري",
        freqWeekly: "أسبوعي",
        freqDaily: "يومي",
        freqAsNeeded: "حسب الحاجة",
        startDate: "تاريخ البداية",
        dueDate: "تاريخ الاستحقاق (كل شهر/أسبوع)",
        method: "طريقة الدفع",
        alertBefore: "تنبيه قبل الدفع (أيام)",
        notes: "ملاحظات",
        save: "حفظ المصروف المتكرر",
        cancel: "إلغاء",
      }
    }
  },
  fr: {
    currency: "DA",
    breadcrumbHome: "Accueil",
    breadcrumb: "Gestion des Dépenses",
    title: "Gestion des Dépenses",
    subtitle: "Enregistrez et suivez les dépenses pour connaître le bénéfice réel",
    summary: {
      today: "Dépenses du jour", todayHelp: "Total des dépenses aujourd'hui",
      month: "Dépenses du mois", monthHelp: "Total de la période actuelle",
      topCat: "Plus grande dépense", topCatHelp: "Catégorie la plus coûteuse",
      fixed: "Dépenses fixes", fixedHelp: "Loyer, électricité, salaires...",
      netProfit: "Bénéfice Net", netProfitHelp: "Ventes moins dépenses",
    },
    tabs: {
      all: "Toutes les dépenses",
      fixed: "Dépenses fixes",
      variable: "Dépenses variables",
      recurring: "Dépenses récurrentes",
      category: "Par catégorie",
      reports: "Rapports",
    },
    actions: {
      search: "Chercher une dépense...",
      addExp: "Ajouter dépense",
      addRecurring: "Dépense récurrente",
      export: "Exporter",
      print: "Imprimer rapport",
      allCat: "Toutes (Catégories)",
      allType: "Tous (Types)",
      allMethod: "Toutes (Méthodes)",
      allDates: "Toutes les dates",
      today: "Aujourd'hui",
      thisWeek: "Cette semaine",
      thisMonth: "Ce mois",
    },
    table: {
      title: "Liste des dépenses",
      id: "N°",
      name: "Désignation",
      category: "Catégorie",
      type: "Type",
      date: "Date",
      amount: "Montant",
      method: "Méthode",
      linkedTo: "Lié à",
      notes: "Notes",
      actions: "Actions",
      empty: "Aucune dépense trouvée",
    },
    preview: {
      title: "Détails de la dépense",
      empty: "Sélectionnez une dépense",
      name: "Désignation",
      category: "Catégorie",
      type: "Type",
      date: "Date",
      amount: "Montant",
      method: "Méthode de paiement",
      supplier: "Fournisseur / Tiers",
      linkedTo: "Lié à",
      isRecurring: "Est récurrente ?",
      yes: "Oui", no: "Non",
      notes: "Notes",
      lastUpdated: "Dernière modif",
      actions: {
        edit: "Modifier",
        repeat: "Répéter",
        linkStock: "Lier au stock",
        linkProd: "Lier production",
        print: "Imprimer reçu",
      }
    },
    breakdown: {
      title: "Répartition",
    },
    netProfitCard: {
      title: "Bénéfice Réel",
      sales: "Total des ventes",
      expenses: "Total des dépenses",
      net: "Bénéfice Net",
      ratio: "Ratio dépenses/ventes",
    },
    alerts: {
      title: "Alertes Dépenses",
      recurringDue: "Dépense récurrente à l'approche",
      highCost: "Hausse des achats tissus ce mois",
      unlinked: "Dépense non classifiée",
      laterDue: "Paiement différé à suivre",
    },
    modals: {
      add: {
        title: "Nouvelle dépense",
        name: "Désignation",
        category: "Catégorie",
        type: "Type",
        amount: "Montant",
        method: "Méthode",
        date: "Date",
        supplier: "Fournisseur",
        linkedTo: "Lié à",
        notes: "Notes",
        save: "Enregistrer",
        saveAndAdd: "Enregistrer et Ajouter",
        cancel: "Annuler",
      },
      recurring: {
        title: "Dépense récurrente",
        name: "Désignation",
        category: "Catégorie",
        amount: "Montant estimé",
        freq: "Fréquence",
        freqMonthly: "Mensuel",
        freqWeekly: "Hebdomadaire",
        freqDaily: "Journalier",
        freqAsNeeded: "Selon besoin",
        startDate: "Date de début",
        dueDate: "Jour d'échéance",
        method: "Méthode",
        alertBefore: "Alerte avant (jours)",
        notes: "Notes",
        save: "Enregistrer",
        cancel: "Annuler",
      }
    }
  }
};

export { palette };
