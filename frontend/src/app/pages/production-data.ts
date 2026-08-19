import { palette } from "../content";

export type Lang = "ar" | "fr";

/* ------------------------------ Domain types ------------------------------ */

export type StageId = "new" | "cutting" | "sewing" | "ironing" | "ready" | "delivered";
export type ProductType = "shirt" | "pants" | "dress" | "school" | "workwear" | "other";
export type Priority = "normal" | "urgent";
export type DeadlineStatus = "ontime" | "near" | "late";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export type Bilingual = { ar: string; fr: string };

export type OrderMaterial = {
  name: Bilingual;
  qty: number;
  unit: Bilingual;
  unitCost: number;
};

export type TimelineStep = {
  stage: StageId;
  date: string | null; // null => not reached yet
};

export type Order = {
  id: string;
  number: string;
  customer: Bilingual;
  phone: string;
  product: ProductType;
  quantity: number;
  sizes: string;
  colors: { label: Bilingual; hex: string }[];
  receivedDate: string;
  deliveryDate: string;
  stage: StageId;
  priority: Priority;
  deadline: DeadlineStatus;
  workers: string[]; // full names
  materials: OrderMaterial[];
  laborCost: number;
  extraCost: number;
  agreedPrice: number;
  payment: PaymentStatus;
  notes: Bilingual;
  timeline: TimelineStep[];
};

/* ------------------------------- Label maps ------------------------------- */

export const stageOrder: StageId[] = [
  "new",
  "cutting",
  "sewing",
  "ironing",
  "ready",
  "delivered",
];

export const stageLabels: Record<StageId, Bilingual> = {
  new: { ar: "جديد", fr: "Nouveau" },
  cutting: { ar: "قيد القص", fr: "Découpe" },
  sewing: { ar: "قيد الخياطة", fr: "Couture" },
  ironing: { ar: "قيد الكي", fr: "Repassage" },
  ready: { ar: "جاهز", fr: "Prêt" },
  delivered: { ar: "مسلّم", fr: "Livré" },
};

// Soft, non-flashy stage accents that harmonize with the teal/gold identity.
export const stageColors: Record<StageId, string> = {
  new: "#6b8aa0",
  cutting: "#a87d3c",
  sewing: "#123c4a",
  ironing: "#8a6ea0",
  ready: "#4d8a6a",
  delivered: "#7a8a63",
};

export const productLabels: Record<ProductType, Bilingual> = {
  shirt: { ar: "قميص", fr: "Chemise" },
  pants: { ar: "سروال", fr: "Pantalon" },
  dress: { ar: "فستان", fr: "Robe" },
  school: { ar: "زي مدرسي", fr: "Uniforme scolaire" },
  workwear: { ar: "لباس عمل", fr: "Vêtement de travail" },
  other: { ar: "أخرى", fr: "Autre" },
};

export const priorityLabels: Record<Priority, Bilingual> = {
  normal: { ar: "عادي", fr: "Normal" },
  urgent: { ar: "مستعجل", fr: "Urgent" },
};

export const deadlineLabels: Record<DeadlineStatus, Bilingual> = {
  ontime: { ar: "في الوقت", fr: "Dans les temps" },
  near: { ar: "يقترب الموعد", fr: "Échéance proche" },
  late: { ar: "متأخر", fr: "En retard" },
};

export const deadlineColors: Record<DeadlineStatus, string> = {
  ontime: "#4d8a6a",
  near: "#a87d3c",
  late: "#b46a66",
};

export const paymentLabels: Record<PaymentStatus, Bilingual> = {
  unpaid: { ar: "غير مدفوع", fr: "Non payé" },
  partial: { ar: "دفع جزئي", fr: "Partiel" },
  paid: { ar: "مدفوع", fr: "Payé" },
};

export const paymentColors: Record<PaymentStatus, string> = {
  unpaid: "#b46a66",
  partial: "#a87d3c",
  paid: "#4d8a6a",
};

export const taskLabels: Record<string, Bilingual> = {
  cut: { ar: "قص القماش", fr: "Découpe du tissu" },
  sew: { ar: "خياطة", fr: "Couture" },
  iron: { ar: "كي", fr: "Repassage" },
  pack: { ar: "تغليف", fr: "Emballage" },
  qa: { ar: "مراجعة الجودة", fr: "Contrôle qualité" },
};

/* --------------------------------- Helpers -------------------------------- */

export function orderMaterialCost(o: Order): number {
  return o.materials.reduce((s, m) => s + m.qty * m.unitCost, 0);
}

export function orderTotalCost(o: Order): number {
  return orderMaterialCost(o) + o.laborCost + o.extraCost;
}

export function orderMargin(o: Order): number {
  return o.agreedPrice - orderTotalCost(o);
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/* --------------------------------- UI text -------------------------------- */

type ProdText = {
  currency: string;
  breadcrumbHome: string;
  breadcrumb: string;
  title: string;
  subtitle: string;
  summary: {
    new: string; newHelp: string;
    prod: string; prodHelp: string;
    ready: string; readyHelp: string;
    late: string; lateHelp: string;
    cost: string; costHelp: string;
  };
  search: string;
  filtersToggle: string;
  allProducts: string;
  allStages: string;
  allWorkers: string;
  allPriorities: string;
  dateLabel: string;
  addOrder: string;
  calendar: string;
  export: string;
  tabs: {
    board: string; all: string; calendar: string; costs: string; late: string;
  };
  emptyColumn: string;
  estCost: string;
  qty: string;
  delivery: string;
  tableView: string;
  tableHint: string;
  cols: {
    number: string; customer: string; product: string; quantity: string;
    delivery: string; stage: string; workers: string; cost: string;
    payment: string; actions: string;
  };
  panel: {
    title: string;
    empty: string;
    emptyHint: string;
    customer: string; phone: string; product: string; quantity: string;
    sizes: string; colors: string; received: string; delivery: string;
    stage: string; deadline: string; workers: string; materials: string;
    payment: string; notes: string;
    timelineTitle: string;
    costTitle: string;
    materialCost: string; laborCost: string; extraCost: string;
    totalCost: string; margin: string;
    edit: string; changeStage: string; assign: string; link: string;
    recordCost: string; deliver: string;
    noWorkers: string;
  };
  addModal: {
    title: string;
    customer: string; phone: string; product: string; quantity: string;
    sizes: string; color: string; received: string; delivery: string;
    priority: string; price: string; notes: string;
    save: string; cancel: string;
  };
  assignModal: {
    title: string;
    order: string; stage: string; worker: string; task: string;
    pieces: string; notes: string; save: string; cancel: string;
  };
  linkModal: {
    title: string;
    material: string; qty: string; unit: string; unitCost: string;
    total: string; notes: string; save: string; cancel: string;
  };
  stageModal: {
    title: string; stage: string; date: string; note: string;
    save: string; cancel: string;
  };
  showing: string; of: string; items: string;
  calendarSoon: string;
};

export const prodText: Record<Lang, ProdText> = {
  ar: {
    currency: "د.ج",
    breadcrumbHome: "الرئيسية",
    breadcrumb: "تسيير الإنتاج والطلبيات",
    title: "تسيير الإنتاج والطلبيات",
    subtitle:
      "متابعة الطلبيات ومراحل الإنتاج من الاستلام إلى التسليم مع ربط العمال والمواد والتكاليف",
    summary: {
      new: "الطلبيات الجديدة", newHelp: "طلبات لم تبدأ بعد",
      prod: "قيد الإنتاج", prodHelp: "طلبات في مرحلة العمل",
      ready: "جاهزة للتسليم", readyHelp: "طلبات مكتملة",
      late: "طلبيات متأخرة", lateHelp: "تجاوزت تاريخ التسليم",
      cost: "تكلفة الإنتاج هذا الشهر", costHelp: "مجموع تكلفة المواد والعمال",
    },
    search: "البحث عن طلبية أو زبون...",
    filtersToggle: "تصفية",
    allProducts: "كل المنتجات",
    allStages: "كل المراحل",
    allWorkers: "كل العمال",
    allPriorities: "كل الأولويات",
    dateLabel: "تاريخ التسليم",
    addOrder: "إضافة طلبية",
    calendar: "عرض التقويم",
    export: "تصدير",
    tabs: {
      board: "لوحة التقدم", all: "جميع الطلبيات", calendar: "التقويم",
      costs: "التكاليف", late: "الطلبيات المتأخرة",
    },
    emptyColumn: "لا توجد طلبيات",
    estCost: "تكلفة تقديرية",
    qty: "الكمية",
    delivery: "التسليم",
    tableView: "عرض الجدول",
    tableHint: "عرض تفصيلي لكل الطلبيات في جدول واحد",
    cols: {
      number: "رقم الطلبية", customer: "الزبون", product: "المنتج",
      quantity: "الكمية", delivery: "تاريخ التسليم", stage: "المرحلة الحالية",
      workers: "العمال", cost: "التكلفة", payment: "حالة الدفع", actions: "إجراءات",
    },
    panel: {
      title: "تفاصيل الطلبية",
      empty: "لم يتم اختيار طلبية",
      emptyHint: "اختر بطاقة طلبية من اللوحة لعرض تفاصيلها الكاملة هنا.",
      customer: "الزبون", phone: "الهاتف", product: "نوع المنتج", quantity: "الكمية",
      sizes: "المقاسات", colors: "الألوان", received: "تاريخ الاستلام", delivery: "تاريخ التسليم",
      stage: "المرحلة الحالية", deadline: "حالة الموعد", workers: "العمال المكلّفون",
      materials: "المواد المستعملة", payment: "حالة الدفع", notes: "ملاحظات",
      timelineTitle: "مسار الإنتاج",
      costTitle: "تكلفة الطلبية",
      materialCost: "تكلفة المواد", laborCost: "تكلفة العمال", extraCost: "مصاريف إضافية",
      totalCost: "التكلفة الإجمالية", margin: "هامش الربح المتوقع",
      edit: "تعديل الطلبية", changeStage: "تغيير المرحلة", assign: "تعيين عمال",
      link: "ربط المواد", recordCost: "تسجيل تكلفة", deliver: "تسليم الطلبية",
      noWorkers: "لم يُعيَّن أي عامل بعد",
    },
    addModal: {
      title: "إضافة طلبية جديدة",
      customer: "اسم الزبون", phone: "رقم الهاتف", product: "نوع المنتج", quantity: "الكمية",
      sizes: "المقاسات", color: "اللون", received: "تاريخ الاستلام", delivery: "تاريخ التسليم",
      priority: "الأولوية", price: "السعر المتفق عليه", notes: "ملاحظات",
      save: "حفظ الطلبية", cancel: "إلغاء",
    },
    assignModal: {
      title: "تعيين العمال للطلبية",
      order: "اختيار الطلبية", stage: "مرحلة العمل", worker: "اختيار العامل", task: "نوع المهمة",
      pieces: "عدد القطع المطلوبة", notes: "ملاحظات", save: "حفظ التعيين", cancel: "إلغاء",
    },
    linkModal: {
      title: "ربط المواد بالطلبية",
      material: "اختيار المادة", qty: "الكمية المستعملة", unit: "الوحدة", unitCost: "تكلفة الوحدة",
      total: "التكلفة الإجمالية", notes: "ملاحظات", save: "حفظ المواد", cancel: "إلغاء",
    },
    stageModal: {
      title: "تغيير مرحلة الطلبية", stage: "المرحلة", date: "تاريخ التغيير", note: "ملاحظة قصيرة",
      save: "تحديث المرحلة", cancel: "إلغاء",
    },
    showing: "عرض", of: "من", items: "طلبية",
    calendarSoon: "عرض التقويم قيد التطوير — سيعرض الطلبيات حسب تاريخ التسليم.",
  },
  fr: {
    currency: "DA",
    breadcrumbHome: "Accueil",
    breadcrumb: "Gestion de la production et des commandes",
    title: "Gestion de la production et des commandes",
    subtitle:
      "Suivi des commandes et des étapes de production, de la réception à la livraison, avec les ouvriers, les matières et les coûts",
    summary: {
      new: "Nouvelles commandes", newHelp: "Commandes non démarrées",
      prod: "En production", prodHelp: "Commandes en cours de travail",
      ready: "Prêtes à livrer", readyHelp: "Commandes terminées",
      late: "Commandes en retard", lateHelp: "Délai de livraison dépassé",
      cost: "Coût de production ce mois", costHelp: "Total matières et main-d'œuvre",
    },
    search: "Rechercher une commande ou un client...",
    filtersToggle: "Filtrer",
    allProducts: "Tous les produits",
    allStages: "Toutes les étapes",
    allWorkers: "Tous les ouvriers",
    allPriorities: "Toutes les priorités",
    dateLabel: "Date de livraison",
    addOrder: "Ajouter une commande",
    calendar: "Vue calendrier",
    export: "Exporter",
    tabs: {
      board: "Tableau de suivi", all: "Toutes les commandes", calendar: "Calendrier",
      costs: "Coûts", late: "Commandes en retard",
    },
    emptyColumn: "Aucune commande",
    estCost: "Coût estimé",
    qty: "Qté",
    delivery: "Livraison",
    tableView: "Vue tableau",
    tableHint: "Vue détaillée de toutes les commandes dans un seul tableau",
    cols: {
      number: "N° commande", customer: "Client", product: "Produit",
      quantity: "Qté", delivery: "Livraison", stage: "Étape actuelle",
      workers: "Ouvriers", cost: "Coût", payment: "Paiement", actions: "Actions",
    },
    panel: {
      title: "Détails de la commande",
      empty: "Aucune commande sélectionnée",
      emptyHint: "Sélectionnez une carte de commande dans le tableau pour afficher ses détails ici.",
      customer: "Client", phone: "Téléphone", product: "Type de produit", quantity: "Quantité",
      sizes: "Tailles", colors: "Couleurs", received: "Date de réception", delivery: "Date de livraison",
      stage: "Étape actuelle", deadline: "État du délai", workers: "Ouvriers assignés",
      materials: "Matières utilisées", payment: "État du paiement", notes: "Notes",
      timelineTitle: "Historique de production",
      costTitle: "Coût de la commande",
      materialCost: "Coût matières", laborCost: "Coût main-d'œuvre", extraCost: "Frais annexes",
      totalCost: "Coût total", margin: "Marge estimée",
      edit: "Modifier", changeStage: "Changer l'étape", assign: "Assigner",
      link: "Lier matières", recordCost: "Saisir un coût", deliver: "Livrer",
      noWorkers: "Aucun ouvrier assigné",
    },
    addModal: {
      title: "Ajouter une nouvelle commande",
      customer: "Nom du client", phone: "Téléphone", product: "Type de produit", quantity: "Quantité",
      sizes: "Tailles", color: "Couleur", received: "Date de réception", delivery: "Date de livraison",
      priority: "Priorité", price: "Prix convenu", notes: "Notes",
      save: "Enregistrer", cancel: "Annuler",
    },
    assignModal: {
      title: "Assigner des ouvriers à la commande",
      order: "Choisir la commande", stage: "Étape de travail", worker: "Choisir l'ouvrier", task: "Type de tâche",
      pieces: "Nombre de pièces", notes: "Notes", save: "Enregistrer", cancel: "Annuler",
    },
    linkModal: {
      title: "Lier des matières à la commande",
      material: "Choisir la matière", qty: "Quantité utilisée", unit: "Unité", unitCost: "Coût unitaire",
      total: "Coût total", notes: "Notes", save: "Enregistrer", cancel: "Annuler",
    },
    stageModal: {
      title: "Changer l'étape de la commande", stage: "Étape", date: "Date du changement", note: "Note courte",
      save: "Mettre à jour", cancel: "Annuler",
    },
    showing: "Affichage de", of: "sur", items: "commandes",
    calendarSoon: "Vue calendrier en cours de développement — affichera les commandes par date de livraison.",
  },
};

// Re-export palette for convenience in production components.
export { palette };
