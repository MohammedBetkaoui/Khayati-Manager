import { palette } from "../content";

export type Lang = "ar" | "fr";
export type Bilingual = { ar: string; fr: string };

export type PaymentStatus = "paid" | "partial" | "unpaid";
export type PaymentMethod = "cash" | "transfer" | "check";

export type CustomerDebt = {
  totalInvoices: number;
  totalAmount: number;
  remainingAmount: number;
  lastPurchase: string;
};

export type InvoiceItem = {
  id: string;
  description: Bilingual;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoicePayment = {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
};

export type Invoice = {
  id: string;
  number: string;
  customerName: Bilingual;
  customerPhone: string;
  date: string;
  orderId?: string; // e.g. "o1024"
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
  methods: PaymentMethod[]; // Methods used so far
  payments: InvoicePayment[];
  notes: Bilingual;
  customerDebt: CustomerDebt; // attached for easy UI
};

export const paymentStatusColors: Record<PaymentStatus, string> = {
  paid: "#4d8a6a", // green
  partial: "#a87d3c", // amber
  unpaid: "#b46a66", // red
};

export const paymentMethodLabels: Record<PaymentMethod, Bilingual> = {
  cash: { ar: "نقداً", fr: "Espèces" },
  transfer: { ar: "تحويل", fr: "Virement" },
  check: { ar: "صك", fr: "Chèque" },
};

export const paymentStatusLabels: Record<PaymentStatus, Bilingual> = {
  paid: { ar: "مدفوعة", fr: "Payée" },
  partial: { ar: "مدفوعة جزئياً", fr: "Partiel" },
  unpaid: { ar: "غير مدفوعة", fr: "Non payée" },
};

/* ------------------------------- Mock Data -------------------------------- */

export const mockInvoices: Invoice[] = [
  {
    id: "inv_1",
    number: "INV-1024",
    customerName: { ar: "سعاد مرزوق", fr: "Souad Merzouk" },
    customerPhone: "0661 24 18 07",
    date: "2026-06-28",
    orderId: "1024",
    items: [
      { id: "it_1", description: { ar: "فستان سهرة", fr: "Robe de soirée" }, quantity: 3, unitPrice: 3266, total: 9800 }
    ],
    subtotal: 9800,
    discount: 0,
    total: 9800,
    paid: 4000,
    remaining: 5800,
    status: "partial",
    methods: ["cash"],
    payments: [
      { id: "p_1", date: "2026-06-28", amount: 4000, method: "cash" }
    ],
    notes: { ar: "تسديد الباقي عند الاستلام", fr: "Reste à payer à la livraison" },
    customerDebt: { totalInvoices: 2, totalAmount: 15800, remainingAmount: 5800, lastPurchase: "2026-06-28" }
  },
  {
    id: "inv_2",
    number: "INV-1025",
    customerName: { ar: "مدرسة الأمل", fr: "École El Amel" },
    customerPhone: "0770 55 12 39",
    date: "2026-06-20",
    orderId: "1025",
    items: [
      { id: "it_2", description: { ar: "زي مدرسي (40 قطعة)", fr: "Uniforme scolaire (40 pcs)" }, quantity: 40, unitPrice: 1050, total: 42000 }
    ],
    subtotal: 42000,
    discount: 2000,
    total: 40000,
    paid: 20000,
    remaining: 20000,
    status: "partial",
    methods: ["transfer"],
    payments: [
      { id: "p_2", date: "2026-06-21", amount: 20000, method: "transfer" }
    ],
    notes: { ar: "تخفيض 2000 دج للكمية", fr: "Remise 2000 DA pour quantité" },
    customerDebt: { totalInvoices: 4, totalAmount: 180000, remainingAmount: 20000, lastPurchase: "2026-06-20" }
  },
  {
    id: "inv_3",
    number: "INV-1026",
    customerName: { ar: "كريم حاجي", fr: "Karim Hadji" },
    customerPhone: "0555 08 44 21",
    date: "2026-06-27",
    orderId: "1026",
    items: [
      { id: "it_3", description: { ar: "قمصان كلاسيكية", fr: "Chemises classiques" }, quantity: 6, unitPrice: 1900, total: 11400 }
    ],
    subtotal: 11400,
    discount: 0,
    total: 11400,
    paid: 0,
    remaining: 11400,
    status: "unpaid",
    methods: [],
    payments: [],
    notes: { ar: "الدفع لاحقاً عند التسليم", fr: "Paiement à la livraison" },
    customerDebt: { totalInvoices: 1, totalAmount: 11400, remainingAmount: 11400, lastPurchase: "2026-06-27" }
  },
  {
    id: "inv_4",
    number: "INV-1028",
    customerName: { ar: "فاطمة الزهراء", fr: "Fatima Zohra" },
    customerPhone: "0662 90 17 44",
    date: "2026-06-22",
    orderId: "1028",
    items: [
      { id: "it_4", description: { ar: "فستان سهرة بتطريز يدوي", fr: "Robe de soirée brodée" }, quantity: 1, unitPrice: 8600, total: 8600 }
    ],
    subtotal: 8600,
    discount: 0,
    total: 8600,
    paid: 8600,
    remaining: 0,
    status: "paid",
    methods: ["cash"],
    payments: [
      { id: "p_4", date: "2026-06-22", amount: 4000, method: "cash" },
      { id: "p_5", date: "2026-06-25", amount: 4600, method: "cash" }
    ],
    notes: { ar: "دفعت كاملاً", fr: "Payée intégralement" },
    customerDebt: { totalInvoices: 5, totalAmount: 32000, remainingAmount: 0, lastPurchase: "2026-06-22" }
  },
  {
    id: "inv_5",
    number: "INV-1029",
    customerName: { ar: "عمر بوعلام", fr: "Omar Boualem" },
    customerPhone: "0771 36 22 90",
    date: "2026-06-24",
    orderId: "1029",
    items: [
      { id: "it_5", description: { ar: "سروال جينز", fr: "Pantalon jean" }, quantity: 8, unitPrice: 1600, total: 12800 }
    ],
    subtotal: 12800,
    discount: 0,
    total: 12800,
    paid: 5000,
    remaining: 7800,
    status: "partial",
    methods: ["cash"],
    payments: [
      { id: "p_6", date: "2026-06-24", amount: 5000, method: "cash" }
    ],
    notes: { ar: "", fr: "" },
    customerDebt: { totalInvoices: 3, totalAmount: 45000, remainingAmount: 7800, lastPurchase: "2026-06-24" }
  }
];

export const salesText: Record<Lang, any> = {
  ar: {
    currency: "د.ج",
    breadcrumbHome: "الرئيسية",
    breadcrumb: "المبيعات والفواتير",
    title: "المبيعات والفواتير",
    subtitle: "تسجيل المبيعات، إصدار الفواتير، متابعة المدفوعات والمبالغ المتبقية بطريقة واضحة ومنظمة",
    summary: {
      today: "مبيعات اليوم", todayHelp: "إجمالي المداخيل المسجلة اليوم",
      month: "مبيعات هذا الشهر", monthHelp: "إجمالي المبيعات الشهرية",
      unpaid: "الفواتير غير المدفوعة", unpaidHelp: "فواتير تحتوي على مبالغ متبقية",
      remaining: "المبالغ المتبقية", remainingHelp: "مجموع الديون غير المسددة",
      count: "عدد الفواتير", countHelp: "الفواتير المسجلة هذا الشهر",
    },
    tabs: {
      all: "كل الفواتير",
      paid: "المدفوعة",
      partial: "المدفوعة جزئياً",
      unpaid: "غير المدفوعة",
      customers: "الزبائن",
      reports: "التقارير",
    },
    actions: {
      search: "البحث عن فاتورة أو زبون...",
      addInvoice: "+ إنشاء فاتورة",
      recordPayment: "تسجيل دفعة",
      export: "تصدير",
      print: "طباعة",
      allStatus: "الكل (الحالة)",
      allMethods: "الكل (طريقة الدفع)",
      allDates: "كل التواريخ",
      today: "اليوم",
      thisWeek: "هذا الأسبوع",
      thisMonth: "هذا الشهر",
    },
    table: {
      title: "قائمة الفواتير",
      number: "رقم الفاتورة",
      customer: "الزبون",
      order: "الطلبية / المنتج",
      date: "التاريخ",
      total: "المبلغ الإجمالي",
      discount: "التخفيض",
      paid: "المدفوع",
      remaining: "المتبقي",
      method: "طريقة الدفع",
      status: "الحالة",
      actions: "إجراءات",
      empty: "لا توجد فواتير مطابقة للبحث",
    },
    preview: {
      title: "تفاصيل الفاتورة",
      empty: "اختر فاتورة لعرض تفاصيلها",
      workshopName: "خياطتي Manager",
      invoiceNumber: "رقم الفاتورة",
      date: "التاريخ",
      customer: "الزبون",
      phone: "رقم الهاتف",
      orderLink: "الطلبية المرتبطة",
      itemDesc: "البيان",
      qty: "الكمية",
      up: "سعر الوحدة",
      tot: "المجموع",
      subtotal: "المبلغ قبل التخفيض",
      discount: "التخفيض",
      netTotal: "المبلغ الإجمالي",
      paidAmount: "المبلغ المدفوع",
      remainingAmount: "المبلغ المتبقي",
      method: "طريقة الدفع",
      status: "حالة الدفع",
      notes: "ملاحظات",
      actions: {
        print: "طباعة الفاتورة",
        pay: "تسجيل دفعة",
        edit: "تعديل الفاتورة",
        send: "إرسال للزبون",
        viewOrder: "عرض الطلبية",
      }
    },
    customerInfo: {
      title: "معلومات الزبون",
      name: "الاسم",
      phone: "الهاتف",
      invCount: "عدد الفواتير",
      totalBought: "إجمالي المشتريات",
      totalDebt: "المبالغ المتبقية",
      viewProfile: "عرض سجل الزبون",
    },
    warnings: {
      title: "تنبيهات المبالغ المتبقية",
      oldDebt: "زبون لديه مبلغ متبقي منذ أكثر من 15 يوم",
      unpaidInv: "فاتورة غير مدفوعة بالكامل",
      readyNotPaid: "طلبية جاهزة ولم يتم دفع كامل المبلغ",
    },
    trend: {
      title: "ملخص المبيعات",
      today: "مبيعات اليوم",
      week: "مبيعات الأسبوع",
      month: "مبيعات الشهر",
      avg: "متوسط قيمة الفاتورة",
    },
    addModal: {
      title: "إنشاء فاتورة جديدة",
      customer: "اختيار الزبون",
      phone: "رقم الهاتف",
      orderId: "ربط بطلبية موجودة",
      product: "المنتج / الخدمة",
      qty: "الكمية",
      unitPrice: "سعر الوحدة",
      discount: "التخفيض",
      paid: "المبلغ المدفوع",
      method: "طريقة الدفع",
      date: "تاريخ الفاتورة",
      notes: "ملاحظات",
      save: "حفظ الفاتورة",
      savePrint: "حفظ وطباعة",
      cancel: "إلغاء"
    },
    payModal: {
      title: "تسجيل دفعة",
      invoice: "اختيار الفاتورة",
      customer: "اسم الزبون",
      remaining: "المبلغ المتبقي",
      amount: "مبلغ الدفعة",
      method: "طريقة الدفع",
      date: "تاريخ الدفع",
      notes: "ملاحظات",
      save: "تسجيل الدفعة",
      cancel: "إلغاء",
      oldRem: "المبلغ القديم المتبقي",
      newPay: "الدفعة الجديدة",
      newRem: "المبلغ المتبقي بعد الدفع"
    }
  },
  fr: {
    currency: "DA",
    breadcrumbHome: "Accueil",
    breadcrumb: "Ventes et Factures",
    title: "Ventes et Factures",
    subtitle: "Enregistrez les ventes, éditez les factures, suivez les paiements et les restes à payer de manière claire",
    summary: {
      today: "Ventes du jour", todayHelp: "Revenus enregistrés aujourd'hui",
      month: "Ventes du mois", monthHelp: "Total des ventes mensuelles",
      unpaid: "Factures impayées", unpaidHelp: "Factures avec un reste à payer",
      remaining: "Restes à payer", remainingHelp: "Total des dettes clients",
      count: "Nombre de factures", countHelp: "Factures de ce mois",
    },
    tabs: {
      all: "Toutes",
      paid: "Payées",
      partial: "Paiement partiel",
      unpaid: "Impayées",
      customers: "Clients",
      reports: "Rapports",
    },
    actions: {
      search: "Chercher facture ou client...",
      addInvoice: "+ Nouvelle Facture",
      recordPayment: "Enregistrer paiement",
      export: "Exporter",
      print: "Imprimer",
      allStatus: "Tous (Statut)",
      allMethods: "Tous (Méthode)",
      allDates: "Toutes les dates",
      today: "Aujourd'hui",
      thisWeek: "Cette semaine",
      thisMonth: "Ce mois",
    },
    table: {
      title: "Liste des factures",
      number: "N° Facture",
      customer: "Client",
      order: "Commande / Produit",
      date: "Date",
      total: "Montant Total",
      discount: "Remise",
      paid: "Payé",
      remaining: "Reste",
      method: "Méthode",
      status: "Statut",
      actions: "Actions",
      empty: "Aucune facture trouvée",
    },
    preview: {
      title: "Détails de la facture",
      empty: "Sélectionnez une facture pour voir les détails",
      workshopName: "Khayati Manager",
      invoiceNumber: "N° Facture",
      date: "Date",
      customer: "Client",
      phone: "Téléphone",
      orderLink: "Commande liée",
      itemDesc: "Désignation",
      qty: "Qté",
      up: "P.U",
      tot: "Total",
      subtotal: "Sous-total",
      discount: "Remise",
      netTotal: "Total Net",
      paidAmount: "Montant payé",
      remainingAmount: "Reste à payer",
      method: "Méthode de paiement",
      status: "Statut",
      notes: "Notes",
      actions: {
        print: "Imprimer",
        pay: "Enregistrer paiement",
        edit: "Modifier",
        send: "Envoyer au client",
        viewOrder: "Voir la commande",
      }
    },
    customerInfo: {
      title: "Infos Client",
      name: "Nom",
      phone: "Téléphone",
      invCount: "Nb de factures",
      totalBought: "Total achats",
      totalDebt: "Reste à payer",
      viewProfile: "Voir le profil",
    },
    warnings: {
      title: "Alertes d'impayés",
      oldDebt: "Client avec dette de plus de 15 jours",
      unpaidInv: "Facture partiellement impayée",
      readyNotPaid: "Commande prête sans paiement complet",
    },
    trend: {
      title: "Résumé des ventes",
      today: "Aujourd'hui",
      week: "Cette semaine",
      month: "Ce mois",
      avg: "Facture moyenne",
    },
    addModal: {
      title: "Nouvelle facture",
      customer: "Client",
      phone: "Téléphone",
      orderId: "Lier à une commande",
      product: "Produit / Service",
      qty: "Quantité",
      unitPrice: "Prix unitaire",
      discount: "Remise",
      paid: "Montant payé",
      method: "Méthode de paiement",
      date: "Date",
      notes: "Notes",
      save: "Enregistrer",
      savePrint: "Enregistrer et Imprimer",
      cancel: "Annuler"
    },
    payModal: {
      title: "Enregistrer un paiement",
      invoice: "Facture",
      customer: "Client",
      remaining: "Reste à payer actuel",
      amount: "Montant du paiement",
      method: "Méthode",
      date: "Date du paiement",
      notes: "Notes",
      save: "Enregistrer",
      cancel: "Annuler",
      oldRem: "Ancien reste",
      newPay: "Nouveau paiement",
      newRem: "Nouveau reste"
    }
  }
};

export { palette };
