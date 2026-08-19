import type { Lang } from "../content";

/* ------------------------------------------------------------------ */
/* Types & shared label maps for the inventory (تسيير المخزون) screen. */
/* Mirrors the structure of workers-data.ts so both pages stay in sync.*/
/* ------------------------------------------------------------------ */

export type CategoryId =
  | "fabrics"
  | "threads"
  | "buttons"
  | "zippers"
  | "accessories"
  | "packaging"
  | "tools";

export type UnitId = "meter" | "piece" | "spool" | "box" | "kg" | "bundle";

export type StockStatus = "available" | "low" | "out";

export type MovementType = "in" | "out" | "adjust" | "damage";

type Bilingual = { ar: string; fr: string };

export const categoryLabels: Record<CategoryId, Bilingual> = {
  fabrics: { ar: "أقمشة", fr: "Tissus" },
  threads: { ar: "خيوط", fr: "Fils" },
  buttons: { ar: "أزرار", fr: "Boutons" },
  zippers: { ar: "سحابات", fr: "Fermetures" },
  accessories: { ar: "إكسسوارات", fr: "Accessoires" },
  packaging: { ar: "تغليف", fr: "Emballage" },
  tools: { ar: "أدوات", fr: "Outils" },
};

export const categoryColors: Record<CategoryId, { bg: string; fg: string }> = {
  fabrics: { bg: "rgba(18,60,74,0.10)", fg: "#123c4a" },
  threads: { bg: "rgba(195,154,91,0.16)", fg: "#a87d3c" },
  buttons: { bg: "rgba(138,136,127,0.14)", fg: "#6b6a62" },
  zippers: { bg: "rgba(96,120,160,0.14)", fg: "#4f6a99" },
  accessories: { bg: "rgba(201,138,134,0.16)", fg: "#b46a66" },
  packaging: { bg: "rgba(90,130,120,0.14)", fg: "#4d7a6b" },
  tools: { bg: "rgba(18,60,74,0.14)", fg: "#0d2d38" },
};

export const unitLabels: Record<UnitId, Bilingual> = {
  meter: { ar: "متر", fr: "m" },
  piece: { ar: "قطعة", fr: "pièce" },
  spool: { ar: "بكرة", fr: "bobine" },
  box: { ar: "علبة", fr: "boîte" },
  kg: { ar: "كغ", fr: "kg" },
  bundle: { ar: "حزمة", fr: "botte" },
};

export const statusLabels: Record<StockStatus, Bilingual> = {
  available: { ar: "متوفر", fr: "Disponible" },
  low: { ar: "منخفض", fr: "Faible" },
  out: { ar: "نفد", fr: "Épuisé" },
};

/** Calm status colors — soft green / warm amber / dusty rose. */
export const statusColors: Record<StockStatus, string> = {
  available: "#4d8a6a",
  low: "#c39a5b",
  out: "#b46a66",
};

export const movementLabels: Record<MovementType, Bilingual> = {
  in: { ar: "دخول مخزون", fr: "Entrée" },
  out: { ar: "خروج مخزون", fr: "Sortie" },
  adjust: { ar: "تعديل كمية", fr: "Ajustement" },
  damage: { ar: "تلف / ضياع", fr: "Perte / Casse" },
};

export const movementColors: Record<MovementType, string> = {
  in: "#4d8a6a",
  out: "#4f6a99",
  adjust: "#c39a5b",
  damage: "#b46a66",
};

export type Material = {
  id: string;
  name: Bilingual;
  category: CategoryId;
  color: Bilingual | null;
  colorHex: string | null;
  type: Bilingual; // short description / type
  quantity: number;
  unit: UnitId;
  unitPrice: number; // DA
  supplier: string;
  minAlert: number;
  lastMovement: Bilingual;
  notes: Bilingual;
};

/** Derive stock status from quantity and the minimum alert level. */
export function stockStatusOf(m: Material): StockStatus {
  if (m.quantity <= 0) return "out";
  if (m.quantity <= m.minAlert) return "low";
  return "available";
}

/* ------------------------------- UI strings ------------------------------ */

export const stockText: Record<
  Lang,
  {
    breadcrumbHome: string;
    breadcrumb: string;
    title: string;
    subtitle: string;
    summary: {
      total: string;
      totalHelp: string;
      low: string;
      lowHelp: string;
      value: string;
      valueHelp: string;
      moves: string;
      movesHelp: string;
    };
    search: string;
    allCategories: string;
    allStatus: string;
    supplier: string;
    allSuppliers: string;
    filtersToggle: string;
    dateLabel: string;
    addMaterial: string;
    recordMovement: string;
    export: string;
    tabs: {
      all: string;
      movements: string;
      low: string;
      suppliers: string;
      cost: string;
    };
    cols: {
      name: string;
      category: string;
      color: string;
      type: string;
      quantity: string;
      unit: string;
      unitPrice: string;
      supplier: string;
      status: string;
      actions: string;
    };
    view: string;
    edit: string;
    move: string;
    delete: string;
    showing: string;
    of: string;
    items: string;
    currency: string;
    panel: {
      category: string;
      quantity: string;
      unit: string;
      color: string;
      type: string;
      unitPrice: string;
      totalValue: string;
      supplier: string;
      minAlert: string;
      lastMovement: string;
      notes: string;
      editMaterial: string;
      addQty: string;
      removeQty: string;
      linkOrder: string;
      viewLog: string;
    };
    alerts: {
      title: string;
      subtitle: string;
      belowMin: string;
      reorder: string;
      nearOut: string;
      viewAll: string;
    };
    cost: {
      title: string;
      subtitle: string;
      monthCost: string;
      topMaterial: string;
      avgOrder: string;
      details: string;
    };
    addModal: {
      title: string;
      name: string;
      category: string;
      color: string;
      type: string;
      initialQty: string;
      unit: string;
      unitPrice: string;
      supplier: string;
      minAlert: string;
      notes: string;
      save: string;
      cancel: string;
    };
    moveModal: {
      title: string;
      material: string;
      type: string;
      quantity: string;
      date: string;
      reason: string;
      linkedOrder: string;
      linkedOrderPh: string;
      notes: string;
      submit: string;
      cancel: string;
    };
    moveCols: {
      material: string;
      type: string;
      quantity: string;
      date: string;
      reason: string;
      order: string;
    };
    supplierCols: {
      name: string;
      phone: string;
      categories: string;
      materials: string;
      lastOrder: string;
    };
    noOrder: string;
  }
> = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumb: "تسيير المخزون",
    title: "تسيير المخزون",
    subtitle:
      "متابعة الأقمشة، الخيوط، الإكسسوارات وحركة المواد داخل الورشة بطريقة منظمة وواضحة",
    summary: {
      total: "إجمالي المواد",
      totalHelp: "عدد المواد المسجلة في المخزون",
      low: "مواد قاربت على النفاد",
      lowHelp: "تحتاج إلى إعادة الشراء قريباً",
      value: "قيمة المخزون الحالية",
      valueHelp: "التكلفة الإجمالية للمواد المتوفرة",
      moves: "حركات المخزون هذا الشهر",
      movesHelp: "دخول وخروج المواد",
    },
    search: "البحث عن مادة...",
    allCategories: "الكل",
    allStatus: "الكل",
    supplier: "المورد",
    allSuppliers: "كل الموردين",
    filtersToggle: "تصفية وبحث",
    dateLabel: "تاريخ الحركة",
    addMaterial: "إضافة مادة",
    recordMovement: "تسجيل حركة مخزون",
    export: "تصدير",
    tabs: {
      all: "جميع المواد",
      movements: "حركة المخزون",
      low: "المواد المنخفضة",
      suppliers: "الموردون",
      cost: "تكلفة المواد",
    },
    cols: {
      name: "اسم المادة",
      category: "الفئة",
      color: "اللون",
      type: "النوع",
      quantity: "الكمية",
      unit: "الوحدة",
      unitPrice: "سعر الوحدة",
      supplier: "المورد",
      status: "الحالة",
      actions: "إجراءات",
    },
    view: "عرض",
    edit: "تعديل",
    move: "حركة",
    delete: "حذف",
    showing: "عرض",
    of: "من",
    items: "مادة",
    currency: "د.ج",
    panel: {
      category: "الفئة",
      quantity: "الكمية الحالية",
      unit: "الوحدة",
      color: "اللون",
      type: "النوع",
      unitPrice: "سعر الوحدة",
      totalValue: "القيمة الإجمالية المقدرة",
      supplier: "المورد",
      minAlert: "حد التنبيه الأدنى",
      lastMovement: "آخر حركة",
      notes: "ملاحظات",
      editMaterial: "تعديل المادة",
      addQty: "إضافة كمية",
      removeQty: "إخراج كمية",
      linkOrder: "ربط بطلبية",
      viewLog: "عرض السجل",
    },
    alerts: {
      title: "تنبيهات المخزون",
      subtitle: "مواد قاربت على النفاد وتحتاج انتباهك",
      belowMin: "أقل من الحد الأدنى",
      reorder: "يحتاج إلى إعادة شراء",
      nearOut: "قاربت على النفاد",
      viewAll: "عرض كل التنبيهات",
    },
    cost: {
      title: "تكلفة المواد المستعملة في الإنتاج",
      subtitle: "نظرة سريعة على استهلاك المواد",
      monthCost: "تكلفة المواد هذا الشهر",
      topMaterial: "أكثر مادة استهلاكاً",
      avgOrder: "متوسط تكلفة الطلبية",
      details: "عرض التفاصيل",
    },
    addModal: {
      title: "إضافة مادة جديدة",
      name: "اسم المادة",
      category: "الفئة",
      color: "اللون",
      type: "النوع / الوصف",
      initialQty: "الكمية الأولية",
      unit: "الوحدة",
      unitPrice: "سعر الوحدة",
      supplier: "المورد",
      minAlert: "الحد الأدنى للتنبيه",
      notes: "ملاحظات",
      save: "حفظ",
      cancel: "إلغاء",
    },
    moveModal: {
      title: "تسجيل حركة مخزون",
      material: "المادة",
      type: "نوع الحركة",
      quantity: "الكمية",
      date: "التاريخ",
      reason: "السبب",
      linkedOrder: "مرتبطة بطلبية؟",
      linkedOrderPh: "رقم الطلبية (اختياري)",
      notes: "ملاحظات",
      submit: "تسجيل الحركة",
      cancel: "إلغاء",
    },
    moveCols: {
      material: "المادة",
      type: "نوع الحركة",
      quantity: "الكمية",
      date: "التاريخ",
      reason: "السبب",
      order: "الطلبية",
    },
    supplierCols: {
      name: "المورد",
      phone: "الهاتف",
      categories: "الفئات",
      materials: "عدد المواد",
      lastOrder: "آخر طلبية",
    },
    noOrder: "—",
  },
  fr: {
    breadcrumbHome: "Accueil",
    breadcrumb: "Gestion du stock",
    title: "Gestion du stock",
    subtitle:
      "Suivi des tissus, fils, accessoires et mouvements de matières dans l'atelier de façon claire et organisée",
    summary: {
      total: "Total des matières",
      totalHelp: "Matières enregistrées en stock",
      low: "Matières bientôt épuisées",
      lowHelp: "À réapprovisionner prochainement",
      value: "Valeur actuelle du stock",
      valueHelp: "Coût total des matières disponibles",
      moves: "Mouvements ce mois-ci",
      movesHelp: "Entrées et sorties de matières",
    },
    search: "Rechercher une matière...",
    allCategories: "Toutes",
    allStatus: "Tous",
    supplier: "Fournisseur",
    allSuppliers: "Tous les fournisseurs",
    filtersToggle: "Filtrer et rechercher",
    dateLabel: "Date du mouvement",
    addMaterial: "Ajouter une matière",
    recordMovement: "Enregistrer un mouvement",
    export: "Exporter",
    tabs: {
      all: "Toutes les matières",
      movements: "Mouvements",
      low: "Stock faible",
      suppliers: "Fournisseurs",
      cost: "Coût des matières",
    },
    cols: {
      name: "Matière",
      category: "Catégorie",
      color: "Couleur",
      type: "Type",
      quantity: "Quantité",
      unit: "Unité",
      unitPrice: "Prix unité",
      supplier: "Fournisseur",
      status: "État",
      actions: "Actions",
    },
    view: "Voir",
    edit: "Modifier",
    move: "Mouvement",
    delete: "Supprimer",
    showing: "Affichage de",
    of: "sur",
    items: "matières",
    currency: "DA",
    panel: {
      category: "Catégorie",
      quantity: "Quantité actuelle",
      unit: "Unité",
      color: "Couleur",
      type: "Type",
      unitPrice: "Prix unitaire",
      totalValue: "Valeur totale estimée",
      supplier: "Fournisseur",
      minAlert: "Seuil d'alerte minimum",
      lastMovement: "Dernier mouvement",
      notes: "Notes",
      editMaterial: "Modifier la matière",
      addQty: "Ajouter une quantité",
      removeQty: "Retirer une quantité",
      linkOrder: "Lier à une commande",
      viewLog: "Voir l'historique",
    },
    alerts: {
      title: "Alertes de stock",
      subtitle: "Matières bientôt épuisées à surveiller",
      belowMin: "Sous le seuil minimum",
      reorder: "À réapprovisionner",
      nearOut: "Bientôt épuisée",
      viewAll: "Voir toutes les alertes",
    },
    cost: {
      title: "Coût des matières utilisées en production",
      subtitle: "Aperçu rapide de la consommation",
      monthCost: "Coût des matières ce mois",
      topMaterial: "Matière la plus consommée",
      avgOrder: "Coût moyen par commande",
      details: "Voir les détails",
    },
    addModal: {
      title: "Ajouter une nouvelle matière",
      name: "Nom de la matière",
      category: "Catégorie",
      color: "Couleur",
      type: "Type / Description",
      initialQty: "Quantité initiale",
      unit: "Unité",
      unitPrice: "Prix unitaire",
      supplier: "Fournisseur",
      minAlert: "Seuil d'alerte",
      notes: "Notes",
      save: "Enregistrer",
      cancel: "Annuler",
    },
    moveModal: {
      title: "Enregistrer un mouvement de stock",
      material: "Matière",
      type: "Type de mouvement",
      quantity: "Quantité",
      date: "Date",
      reason: "Motif",
      linkedOrder: "Liée à une commande ?",
      linkedOrderPh: "N° de commande (optionnel)",
      notes: "Notes",
      submit: "Enregistrer le mouvement",
      cancel: "Annuler",
    },
    moveCols: {
      material: "Matière",
      type: "Type",
      quantity: "Quantité",
      date: "Date",
      reason: "Motif",
      order: "Commande",
    },
    supplierCols: {
      name: "Fournisseur",
      phone: "Téléphone",
      categories: "Catégories",
      materials: "Matières",
      lastOrder: "Dernière commande",
    },
    noOrder: "—",
  },
};
