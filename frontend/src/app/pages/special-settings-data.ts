import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Coins,
  Factory,
  Layers3,
  PackageCheck,
  ReceiptText,
  Route,
  Ruler,
  Scale,
  Settings2,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Tags,
  UserRound,
  WalletCards,
} from "lucide-react";
import { palette } from "../content";

export type Lang = "ar" | "fr";
export type Bilingual = Record<Lang, string>;

export type SettingSectionId =
  | "wages"
  | "piecePrices"
  | "workerRoles"
  | "productionStages"
  | "attendance"
  | "stockAlerts"
  | "productTypes"
  | "measurementUnits"
  | "invoiceSettings";

export type SettingMenuItem = {
  id: SettingSectionId;
  icon: LucideIcon;
  label: Bilingual;
  subtitle: Bilingual;
};

export type SummaryCardItem = {
  icon: LucideIcon;
  title: Bilingual;
  helper: Bilingual;
  value: string;
  frenchSubtitle: string;
  color: string;
  tint: string;
};

export type SettingField = {
  id: string;
  type: "toggle" | "input" | "select";
  label: Bilingual;
  value: Bilingual;
  helper?: Bilingual;
  enabled?: boolean;
  options?: Bilingual[];
};

export type SalaryRule = {
  id: string;
  title: Bilingual;
  description: Bilingual;
  active: boolean;
  fields: SettingField[];
};

export type PiecePriceRule = {
  product: Bilingual;
  task: Bilingual;
  role: Bilingual;
  price: Bilingual;
  status: Bilingual;
};

export type WorkerRoleRule = {
  name: Bilingual;
  description: Bilingual;
  permissions: Bilingual;
  active: boolean;
};

export type ProductionStage = {
  name: Bilingual;
  order: string;
  color: string;
  active: boolean;
  description: Bilingual;
};

export type SimpleSetting = {
  label: Bilingual;
  value: Bilingual;
  helper?: Bilingual;
};

export const specialSettingsText: Record<Lang, any> = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumb: "إعدادات خاصة",
    title: "إعدادات خاصة",
    subtitle:
      "تخصيص قواعد العمل داخل الورشة مثل الأجور، مراحل الإنتاج، الخصومات والتنبيهات",
    menuTitle: "أقسام الإعدادات",
    sectionHint: "اختر القسم لتعديل قواعده",
    wagesTitle: "قواعد حساب الأجور",
    wagesSubtitle:
      "تحديد نظام الراتب الشهري أو حسب القطعة وطريقة تطبيق الاقتطاعات.",
    supportingTitle: "أقسام جاهزة للتخصيص",
    supportingSubtitle:
      "معاينات سريعة لباقي قواعد الورشة المرتبطة بالأجور والإنتاج.",
    active: "نشط",
    inactive: "غير نشط",
    enabled: "مفعل",
    disabled: "غير مفعل",
    edit: "تعديل",
    save: "حفظ",
    status: "الحالة",
    actions: "إجراءات",
    addRule: "+ إضافة قاعدة",
    addPiecePrice: "+ إضافة سعر قطعة",
    addRole: "+ إضافة دور جديد",
    addStage: "+ إضافة مرحلة",
    addAlert: "+ إضافة تنبيه",
    product: "المنتج",
    task: "المهمة",
    role: "الدور",
    price: "سعر القطعة",
    ruleType: "النوع",
    amount: "القيمة",
    condition: "الشرط",
    stage: "المرحلة",
    order: "الترتيب",
    color: "اللون",
    preview: {
      title: "معاينة القواعد",
      selectedType: "نوع الأجر المحدد",
      selectedValue: "عامل بنظام حسب القطعة",
      exampleTitle: "مثال حساب بسيط",
      base: "الأجر الأساسي",
      days: "عدد أيام العمل",
      pieces: "عدد القطع",
      deductions: "الخصومات",
      net: "صافي الراتب",
      formula: "120 قطعة × 80 دج = 9,600 دج",
      absenceDeduction: "خصم غياب: 500 دج",
      netValue: "9,100 دج",
      saveChanges: "حفظ التغييرات",
      restoreDefaults: "استرجاع الإعدادات الافتراضية",
      testRule: "تجربة قاعدة الحساب",
      impact: "تأثير مباشر على كشف الراتب قبل الحفظ النهائي.",
    },
    actionBar: {
      save: "حفظ التغييرات",
      cancel: "إلغاء",
      reset: "استرجاع الافتراضي",
      preview: "معاينة التأثير",
      updated: "آخر تعديل محفوظ تجريبياً اليوم",
    },
    modal: {
      addRuleTitle: "إضافة قاعدة جديدة",
      addPieceTitle: "إضافة سعر قطعة",
      addStageTitle: "إضافة مرحلة إنتاج",
      ruleName: "اسم القاعدة",
      section: "القسم",
      type: "النوع",
      value: "القيمة",
      condition: "الشرط",
      status: "الحالة",
      notes: "ملاحظات",
      productType: "نوع المنتج",
      taskType: "نوع المهمة",
      responsibleRole: "الدور المسؤول",
      piecePrice: "سعر القطعة",
      startDate: "تاريخ بداية التطبيق",
      stageName: "اسم المرحلة",
      stageOrder: "ترتيب المرحلة",
      stageColor: "اللون",
      description: "الوصف",
      saveRule: "حفظ القاعدة",
      savePrice: "حفظ السعر",
      saveStage: "حفظ المرحلة",
      cancel: "إلغاء",
    },
    sections: {
      piecePrices: "أسعار القطع",
      workerRoles: "أدوار العمال",
      productionStages: "مراحل الإنتاج",
      attendance: "الحضور والغياب",
      stockAlerts: "تنبيهات المخزون",
      productTypes: "أنواع المنتجات",
      measurementUnits: "وحدات القياس",
      invoiceSettings: "إعدادات الفواتير",
      workflow: "تدفق العمل داخل الورشة",
    },
  },
  fr: {
    breadcrumbHome: "Accueil",
    breadcrumb: "Paramètres spéciaux",
    title: "Paramètres spéciaux",
    subtitle:
      "Personnaliser les règles internes de l'atelier : salaires, étapes, retenues et alertes",
    menuTitle: "Sections des paramètres",
    sectionHint: "Choisissez une section pour ajuster ses règles",
    wagesTitle: "Règles de calcul des salaires",
    wagesSubtitle:
      "Définir le salaire mensuel ou à la pièce et l’application des retenues.",
    supportingTitle: "Sections prêtes à configurer",
    supportingSubtitle:
      "Aperçu rapide des règles liées aux salaires et à la production.",
    active: "Actif",
    inactive: "Inactif",
    enabled: "Activé",
    disabled: "Désactivé",
    edit: "Modifier",
    save: "Enregistrer",
    status: "Statut",
    actions: "Actions",
    addRule: "+ Ajouter une règle",
    addPiecePrice: "+ Ajouter prix pièce",
    addRole: "+ Ajouter rôle",
    addStage: "+ Ajouter étape",
    addAlert: "+ Ajouter alerte",
    product: "Produit",
    task: "Tâche",
    role: "Rôle",
    price: "Prix pièce",
    ruleType: "Type",
    amount: "Montant",
    condition: "Condition",
    stage: "Étape",
    order: "Ordre",
    color: "Couleur",
    preview: {
      title: "Aperçu des règles",
      selectedType: "Type de salaire sélectionné",
      selectedValue: "Travailleur payé à la pièce",
      exampleTitle: "Exemple simple",
      base: "Salaire de base",
      days: "Jours travaillés",
      pieces: "Nombre de pièces",
      deductions: "Retenues",
      net: "Salaire net",
      formula: "120 pièces × 80 DA = 9 600 DA",
      absenceDeduction: "Retenue absence : 500 DA",
      netValue: "9 100 DA",
      saveChanges: "Enregistrer",
      restoreDefaults: "Restaurer les valeurs",
      testRule: "Tester la règle",
      impact: "Impact direct sur la fiche de paie avant validation.",
    },
    actionBar: {
      save: "Enregistrer",
      cancel: "Annuler",
      reset: "Valeurs par défaut",
      preview: "Aperçu de l'effet",
      updated: "Dernière modification simulée aujourd'hui",
    },
    modal: {
      addRuleTitle: "Ajouter une nouvelle règle",
      addPieceTitle: "Ajouter un prix à la pièce",
      addStageTitle: "Ajouter une étape de production",
      ruleName: "Nom de la règle",
      section: "Section",
      type: "Type",
      value: "Valeur",
      condition: "Condition",
      status: "Statut",
      notes: "Notes",
      productType: "Type de produit",
      taskType: "Type de tâche",
      responsibleRole: "Rôle responsable",
      piecePrice: "Prix pièce",
      startDate: "Date d'application",
      stageName: "Nom de l'étape",
      stageOrder: "Ordre",
      stageColor: "Couleur",
      description: "Description",
      saveRule: "Enregistrer la règle",
      savePrice: "Enregistrer le prix",
      saveStage: "Enregistrer l'étape",
      cancel: "Annuler",
    },
    sections: {
      piecePrices: "Prix à la pièce",
      workerRoles: "Rôles des travailleurs",
      productionStages: "Étapes de production",
      attendance: "Présence et absence",
      stockAlerts: "Alertes stock",
      productTypes: "Types de produits",
      measurementUnits: "Unités de mesure",
      invoiceSettings: "Paramètres factures",
      workflow: "Flux de travail atelier",
    },
  },
};

export const settingsMenu: SettingMenuItem[] = [
  {
    id: "wages",
    icon: WalletCards,
    label: { ar: "قواعد الأجور", fr: "Règles salariales" },
    subtitle: { ar: "طرق حساب الرواتب", fr: "Calcul des salaires" },
  },
  {
    id: "piecePrices",
    icon: Coins,
    label: { ar: "أسعار القطع", fr: "Prix à la pièce" },
    subtitle: { ar: "حسب المنتج والمهمة", fr: "Produit et tâche" },
  },
  {
    id: "workerRoles",
    icon: UserRound,
    label: { ar: "أدوار العمال", fr: "Rôles" },
    subtitle: { ar: "الصلاحيات الافتراضية", fr: "Permissions" },
  },
  {
    id: "productionStages",
    icon: Route,
    label: { ar: "مراحل الإنتاج", fr: "Étapes" },
    subtitle: { ar: "ترتيب سير العمل", fr: "Ordre de production" },
  },
  {
    id: "attendance",
    icon: CalendarCheck,
    label: { ar: "الحضور والغياب", fr: "Présence" },
    subtitle: { ar: "وقت العمل والتأخر", fr: "Horaires" },
  },
  {
    id: "stockAlerts",
    icon: BellRing,
    label: { ar: "تنبيهات المخزون", fr: "Alertes stock" },
    subtitle: { ar: "حدود النفاد", fr: "Seuils minimum" },
  },
  {
    id: "productTypes",
    icon: Tags,
    label: { ar: "أنواع المنتجات", fr: "Produits" },
    subtitle: { ar: "تصنيفات الورشة", fr: "Catégories" },
  },
  {
    id: "measurementUnits",
    icon: Scale,
    label: { ar: "وحدات القياس", fr: "Unités" },
    subtitle: { ar: "متر، قطعة، بكرة", fr: "Mètre, pièce" },
  },
  {
    id: "invoiceSettings",
    icon: ReceiptText,
    label: { ar: "إعدادات الفواتير", fr: "Factures" },
    subtitle: { ar: "ترقيم وملاحظات", fr: "Numérotation" },
  },
];

export const summaryCards: SummaryCardItem[] = [
  {
    icon: WalletCards,
    title: { ar: "أنواع الأجور", fr: "Types de salaire" },
    helper: {
      ar: "عدد طرق حساب الرواتب المفعلة",
      fr: "Modes de calcul actifs",
    },
    value: "5",
    frenchSubtitle: "Modes actifs",
    color: palette.primary,
    tint: "rgba(18,60,74,0.08)",
  },
  {
    icon: Route,
    title: { ar: "مراحل الإنتاج", fr: "Étapes de production" },
    helper: { ar: "مراحل العمل داخل الورشة", fr: "Étapes de travail" },
    value: "6",
    frenchSubtitle: "Étapes atelier",
    color: "#4d8a6a",
    tint: "rgba(77,138,106,0.12)",
  },
  {
    icon: Coins,
    title: { ar: "أسعار القطع", fr: "Prix à la pièce" },
    helper: {
      ar: "قواعد الدفع حسب المنتج أو المهمة",
      fr: "Prix par produit ou tâche",
    },
    value: "4",
    frenchSubtitle: "Règles de prix",
    color: "#a87d3c",
    tint: "rgba(195,154,91,0.16)",
  },
  {
    icon: BellRing,
    title: { ar: "قواعد التنبيهات", fr: "Règles d'alerte" },
    helper: {
      ar: "تنبيهات المخزون والتأخير والرواتب",
      fr: "Stock, retards et salaires",
    },
    value: "8",
    frenchSubtitle: "Alertes actives",
    color: "#b46a66",
    tint: "rgba(180,106,102,0.12)",
  },
];

export const salaryRules: SalaryRule[] = [
  {
    id: "monthly",
    title: { ar: "راتب شهري بدفعات أسبوعية", fr: "Mensuel par tranches hebdomadaires" },
    description: {
      ar: "يبقى الراتب الشهري هو الأساس ويقسم إلى دفعات أسبوعية متوازنة",
      fr: "Le salaire mensuel reste la base et est réparti en tranches hebdomadaires",
    },
    active: true,
    fields: [
      {
        id: "monthly-enabled",
        type: "toggle",
        label: { ar: "تفعيل هذا النوع", fr: "Activer ce type" },
        value: { ar: "مفعل", fr: "Activé" },
        enabled: true,
      },
      {
        id: "monthly-installments",
        type: "select",
        label: { ar: "عدد الدفعات المعتاد", fr: "Nombre habituel de tranches" },
        value: { ar: "4 دفعات", fr: "4 tranches" },
      },
      {
        id: "monthly-value",
        type: "input",
        label: { ar: "مصدر القيمة", fr: "Source du montant" },
        value: { ar: "من عقد العامل", fr: "Fiche du travailleur" },
      },
    ],
  },
  {
    id: "piece",
    title: { ar: "أجر حسب القطعة", fr: "Salaire à la pièce" },
    description: {
      ar: "يتم حساب الراتب حسب عدد القطع المنجزة",
      fr: "Calculé selon les pièces réalisées",
    },
    active: true,
    fields: [
      {
        id: "piece-enabled",
        type: "toggle",
        label: { ar: "تفعيل هذا النوع", fr: "Activer ce type" },
        value: { ar: "مفعل للخياطة والقص", fr: "Activé pour couture/coupe" },
        enabled: true,
      },
      {
        id: "piece-period-price",
        type: "input",
        label: {
          ar: "طريقة تحديد السعر",
          fr: "Saisie du prix",
        },
        value: { ar: "يُدخل عند كل راتب أسبوعي", fr: "Saisi pour chaque paie" },
      },
    ],
  },
];

export const piecePrices: PiecePriceRule[] = [
  {
    product: { ar: "قميص", fr: "Chemise" },
    task: { ar: "خياطة", fr: "Couture" },
    role: { ar: "خياط", fr: "Tailleur" },
    price: { ar: "120 دج", fr: "120 DA" },
    status: { ar: "نشط", fr: "Actif" },
  },
  {
    product: { ar: "سروال", fr: "Pantalon" },
    task: { ar: "قص", fr: "Coupe" },
    role: { ar: "قاطع قماش", fr: "Coupeur" },
    price: { ar: "80 دج", fr: "80 DA" },
    status: { ar: "نشط", fr: "Actif" },
  },
  {
    product: { ar: "فستان", fr: "Robe" },
    task: { ar: "خياطة", fr: "Couture" },
    role: { ar: "خياط", fr: "Tailleur" },
    price: { ar: "250 دج", fr: "250 DA" },
    status: { ar: "نشط", fr: "Actif" },
  },
  {
    product: { ar: "زي مدرسي", fr: "Uniforme scolaire" },
    task: { ar: "تغليف", fr: "Emballage" },
    role: { ar: "مسؤول تغليف", fr: "Emballeur" },
    price: { ar: "40 دج", fr: "40 DA" },
    status: { ar: "نشط", fr: "Actif" },
  },
];

export const workerRoles: WorkerRoleRule[] = [
  {
    name: { ar: "خياط", fr: "Tailleur" },
    description: {
      ar: "إنجاز الخياطة الأساسية والتعديلات",
      fr: "Couture et retouches principales",
    },
    permissions: {
      ar: "إنتاج، قطع منجزة، ملاحظات",
      fr: "Production, pièces, notes",
    },
    active: true,
  },
  {
    name: { ar: "مساعد", fr: "Assistant" },
    description: {
      ar: "مساعدة في التحضير والنقل داخل الورشة",
      fr: "Préparation et soutien atelier",
    },
    permissions: {
      ar: "عرض الإنتاج، تحديث بسيط",
      fr: "Voir la production, mises à jour",
    },
    active: true,
  },
  {
    name: { ar: "قاطع قماش", fr: "Coupeur" },
    description: {
      ar: "قص القماش حسب خطة الإنتاج والمقاسات",
      fr: "Coupe selon le plan de production et les mesures",
    },
    permissions: { ar: "المخزون، القص، القياسات", fr: "Stock, coupe, mesures" },
    active: true,
  },
  {
    name: { ar: "مسؤول كي", fr: "Repasseur" },
    description: {
      ar: "مرحلة الكي والتحضير النهائي",
      fr: "Repassage et finition",
    },
    permissions: { ar: "تحديث مرحلة الكي", fr: "Mise à jour repassage" },
    active: true,
  },
  {
    name: { ar: "مسؤول تغليف", fr: "Emballeur" },
    description: {
      ar: "تغليف المنتجات قبل إدخالها إلى المخزون",
      fr: "Emballage des produits avant leur mise en stock",
    },
    permissions: { ar: "جاهز، مسلّم", fr: "Prêt, livré" },
    active: true,
  },
  {
    name: { ar: "بائع", fr: "Vendeur" },
    description: {
      ar: "إدارة البيع والفواتير والمدفوعات",
      fr: "Ventes, factures, paiements",
    },
    permissions: {
      ar: "مبيعات، فواتير، عملاء",
      fr: "Ventes, factures, clients",
    },
    active: true,
  },
  {
    name: { ar: "مشرف", fr: "Superviseur" },
    description: {
      ar: "متابعة العمال والجودة والإنتاج",
      fr: "Suivi équipe, qualité, production",
    },
    permissions: { ar: "كامل داخل الورشة", fr: "Accès atelier complet" },
    active: true,
  },
];

export const productionStages: ProductionStage[] = [
  {
    name: { ar: "جديد", fr: "Nouveau" },
    order: "01",
    color: "#6b8aa0",
    active: true,
    description: {
      ar: "دفعة إنتاج مسجلة ولم تبدأ بعد",
      fr: "Lot de production enregistré",
    },
  },
  {
    name: { ar: "قيد القص", fr: "En coupe" },
    order: "02",
    color: "#a87d3c",
    active: true,
    description: { ar: "القماش في مرحلة القص", fr: "Tissu en coupe" },
  },
  {
    name: { ar: "قيد الخياطة", fr: "En couture" },
    order: "03",
    color: palette.primary,
    active: true,
    description: { ar: "القطعة لدى الخياط", fr: "Pièce chez le tailleur" },
  },
  {
    name: { ar: "قيد الكي", fr: "En repassage" },
    order: "04",
    color: "#b46a66",
    active: true,
    description: { ar: "التحضير النهائي", fr: "Finition finale" },
  },
  {
    name: { ar: "جاهز", fr: "Prêt" },
    order: "05",
    color: "#4d8a6a",
    active: true,
    description: { ar: "جاهز للتسليم", fr: "Prêt à livrer" },
  },
  {
    name: { ar: "مسلّم", fr: "Livré" },
    order: "06",
    color: "#7c6f64",
    active: true,
    description: { ar: "اكتملت دفعة الإنتاج", fr: "Production terminée" },
  },
];

export const attendanceSettings: SimpleSetting[] = [
  {
    label: { ar: "وقت بداية العمل", fr: "Début du travail" },
    value: { ar: "08:30", fr: "08:30" },
  },
  {
    label: { ar: "وقت نهاية العمل", fr: "Fin du travail" },
    value: { ar: "17:30", fr: "17:30" },
  },
  {
    label: { ar: "هامش التأخر المسموح", fr: "Marge de retard" },
    value: { ar: "15 دقيقة", fr: "15 minutes" },
  },
  {
    label: { ar: "طريقة احتساب الغياب", fr: "Calcul absence" },
    value: {
      ar: "خصم من الراتب حسب نوع الأجر",
      fr: "Retenue selon type de salaire",
    },
  },
  {
    label: {
      ar: "هل يؤثر الغياب على الراتب؟",
      fr: "Absence impacte salaire ?",
    },
    value: { ar: "نعم، تلقائياً بعد الاعتماد", fr: "Oui, après validation" },
  },
];

export const stockAlertSettings: SimpleSetting[] = [
  {
    label: { ar: "الحد الأدنى للأقمشة", fr: "Minimum tissus" },
    value: { ar: "20 متر", fr: "20 mètres" },
  },
  {
    label: { ar: "الحد الأدنى للخيوط", fr: "Minimum fils" },
    value: { ar: "12 بكرة", fr: "12 bobines" },
  },
  {
    label: { ar: "الحد الأدنى للأزرار", fr: "Minimum boutons" },
    value: { ar: "100 قطعة", fr: "100 pièces" },
  },
  {
    label: { ar: "الحد الأدنى للسحابات", fr: "Minimum fermetures" },
    value: { ar: "30 قطعة", fr: "30 pièces" },
  },
  {
    label: { ar: "تنبيه قبل النفاد", fr: "Alerte avant rupture" },
    value: { ar: "قبل 7 أيام متوقعة", fr: "7 jours estimés avant rupture" },
  },
];

export const productCategories: Bilingual[] = [
  { ar: "قميص", fr: "Chemise" },
  { ar: "سروال", fr: "Pantalon" },
  { ar: "فستان", fr: "Robe" },
  { ar: "زي مدرسي", fr: "Uniforme scolaire" },
  { ar: "لباس عمل", fr: "Tenue de travail" },
  { ar: "أخرى", fr: "Autre" },
];

export const measurementUnits: Bilingual[] = [
  { ar: "متر", fr: "Mètre" },
  { ar: "قطعة", fr: "Pièce" },
  { ar: "بكرة", fr: "Bobine" },
  { ar: "علبة", fr: "Boîte" },
  { ar: "كغ", fr: "Kg" },
  { ar: "حزمة", fr: "Paquet" },
];

export const invoiceSettings: SimpleSetting[] = [
  {
    label: { ar: "بادئة رقم الفاتورة", fr: "Préfixe facture" },
    value: { ar: "KH-2026", fr: "KH-2026" },
  },
  {
    label: { ar: "عرض ضريبة/رسوم", fr: "Afficher taxes" },
    value: { ar: "اختياري", fr: "Optionnel" },
  },
  {
    label: { ar: "ملاحظة أسفل الفاتورة", fr: "Note de facture" },
    value: { ar: "شكراً لثقتكم بورشتنا", fr: "Merci pour votre confiance" },
  },
];

export const workflowSettings: SimpleSetting[] = [
  {
    label: { ar: "اعتماد المرحلة التالية", fr: "Validation étape suivante" },
    value: { ar: "بواسطة المشرف", fr: "Par superviseur" },
  },
  {
    label: { ar: "ربط الإنتاج بالمخزون", fr: "Lier production et stock" },
    value: { ar: "مفعل", fr: "Activé" },
  },
  {
    label: { ar: "ربط القطع بالرواتب", fr: "Lier pièces et salaires" },
    value: { ar: "مفعل بعد اعتماد الإنتاج", fr: "Après validation production" },
  },
];

export const sectionIcons: Record<SettingSectionId, LucideIcon> = {
  wages: WalletCards,
  piecePrices: Coins,
  workerRoles: UserRound,
  productionStages: Route,
  attendance: CalendarCheck,
  stockAlerts: BellRing,
  productTypes: Tags,
  measurementUnits: Ruler,
  invoiceSettings: ReceiptText,
};

export const modalSectionOptions: Bilingual[] = [
  { ar: "الأجور", fr: "Salaires" },
  { ar: "أسعار القطع", fr: "Prix à la pièce" },
  { ar: "الخصومات", fr: "Retenues" },
  { ar: "التنبيهات", fr: "Alertes" },
  { ar: "الإنتاج", fr: "Production" },
];

export const modalTaskOptions: Bilingual[] = [
  { ar: "قص", fr: "Coupe" },
  { ar: "خياطة", fr: "Couture" },
  { ar: "كي", fr: "Repassage" },
  { ar: "تغليف", fr: "Emballage" },
  { ar: "مراجعة الجودة", fr: "Contrôle qualité" },
];

export const activeStatusOptions: Bilingual[] = [
  { ar: "نشط", fr: "Actif" },
  { ar: "غير نشط", fr: "Inactif" },
];

export const supportingSections = [
  {
    icon: Shirt,
    title: { ar: "منتجات وأسعار", fr: "Produits et prix" },
    text: {
      ar: "ربط كل منتج بسعر المهمة والدور المسؤول.",
      fr: "Prix par produit, tâche et rôle.",
    },
  },
  {
    icon: Factory,
    title: { ar: "تدفق الإنتاج", fr: "Flux production" },
    text: {
      ar: "مراحل مرتبة من بدء الدفعة حتى إدخالها إلى المخزون.",
      fr: "Étapes du lancement d'un lot à sa mise en stock.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: "قواعد الحضور", fr: "Règles présence" },
    text: {
      ar: "تأثير الغياب والتأخر على الراتب يظهر قبل الحفظ.",
      fr: "Impact absence et retard avant validation.",
    },
  },
  {
    icon: PackageCheck,
    title: { ar: "تنبيهات آمنة", fr: "Alertes utiles" },
    text: {
      ar: "حدود مخزون واضحة للأقمشة والخيوط واللوازم.",
      fr: "Seuils clairs pour matières et fournitures.",
    },
  },
  {
    icon: Layers3,
    title: { ar: "تصنيفات ووحدات", fr: "Catégories et unités" },
    text: {
      ar: "قوائم جاهزة لمنتجات الورشة ووحدات القياس.",
      fr: "Listes prêtes pour produits et unités.",
    },
  },
  {
    icon: SlidersHorizontal,
    title: { ar: "إعدادات الفواتير", fr: "Paramètres factures" },
    text: {
      ar: "قواعد ترقيم وملاحظات دون تغيير النظام العام.",
      fr: "Numérotation sans toucher au système global.",
    },
  },
  {
    icon: ClipboardList,
    title: { ar: "اعتماد القواعد", fr: "Validation règles" },
    text: {
      ar: "كل تغيير يمكن معاينته قبل تطبيقه على العمال.",
      fr: "Aperçu avant application aux travailleurs.",
    },
  },
  {
    icon: Boxes,
    title: { ar: "مخزون مرتبط", fr: "Stock lié" },
    text: {
      ar: "تنبيهات المخزون مرتبطة بسير الإنتاج اليومي.",
      fr: "Alertes liées au flux de production.",
    },
  },
  {
    icon: Settings2,
    title: { ar: "تخصيص داخلي", fr: "Personnalisation interne" },
    text: {
      ar: "قواعد خاصة بالورشة فقط، بدون تغيير عام للنظام.",
      fr: "Règles propres à l'atelier uniquement.",
    },
  },
];
