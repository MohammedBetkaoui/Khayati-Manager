import type { Lang } from "../content";

export const backupCopy = {
  ar: {
    title: "النسخ الاحتياطي والاستعادة",
    subtitle:
      "احفظ نسخة من بيانات الورشة لاستعادتها عند تغيير الحاسوب أو فقدان البيانات.",
    lastBackup: "آخر نسخة احتياطية",
    noBackup: "لم يتم إنشاء نسخة احتياطية بعد",
    manual: "يدوية",
    external: "خارجية",
    size: "الحجم",
    type: "النوع",
    actions: "حماية بيانات الورشة",
    actionsDescription:
      "أنشئ ملفًا واحدًا يحتوي على بياناتك المهمة واحفظه في مكان آمن.",
    create: "إنشاء نسخة احتياطية",
    creating: "جارٍ إنشاء النسخة الاحتياطية...",
    preparing: "تحضير البيانات والتحقق منها",
    inspect: "استعادة نسخة احتياطية",
    inspectHelp: "اختر ملف النسخة وتحقق من معلوماته قبل استعادة البيانات.",
    externalTitle: "نسخة خارجية",
    externalDescription:
      "احفظ نسخة إضافية على USB أو قرص خارجي لحماية بياناتك في حالة تعطل الحاسوب.",
    externalButton: "حفظ نسخة على USB",
    usbHint: "يمكنك حفظ النسخة على الحاسوب أو على مفتاح USB.",
    adviceTitle: "نصيحة للحفاظ على البيانات",
    advice:
      "أنشئ نسخة بانتظام، واحتفظ بنسخة ثانية خارج الحاسوب، خاصة بعد تسجيل عمليات مالية مهمة.",
    successTitle: "تم إنشاء النسخة الاحتياطية بنجاح",
    fileName: "اسم الملف",
    openLocation: "فتح مكان الملف",
    close: "إغلاق",
    successAdvice: "يُنصح بالاحتفاظ بنسخة على مفتاح USB أو قرص خارجي.",
    inspectionTitle: "معلومات النسخة الاحتياطية",
    valid: "صالحة",
    backupDate: "تاريخ النسخة",
    appVersion: "نسخة التطبيق",
    customers: "الزبائن",
    suppliers: "الموردون",
    workers: "العمال",
    invoices: "الفواتير",
    products: "المنتجات",
    restoreLater:
      "تم التحقق من النسخة بنجاح. لن يتم استبدال البيانات في هذه المرحلة.",
    restoreButton: "استعادة البيانات",
    cancel: "إلغاء",
    restoreWarning:
      "ستستبدل هذه العملية البيانات الحالية ببيانات النسخة المختارة. سيتم إنشاء نسخة أمان تلقائيًا قبل المتابعة.",
    restoreProgressTitle: "جاري استعادة البيانات، يرجى الانتظار.",
    restoreSuccess:
      "تمت استعادة البيانات بنجاح. سيتم إعادة تشغيل Khayati Manager.",
    restoreSteps: {
      VALIDATING: "التحقق من النسخة",
      SAFETY_BACKUP: "إنشاء نسخة أمان",
      PREPARING: "تحضير البيانات",
      MIGRATING: "تحديث قاعدة البيانات",
      SWAPPING: "استعادة البيانات",
      FINAL_VALIDATION: "التحقق النهائي",
      RESTARTING: "إعادة تشغيل التطبيق",
    },
    unavailable:
      "إنشاء النسخ الاحتياطية متاح من تطبيق Khayati Manager لسطح المكتب.",
    warningAssets:
      "تم إنشاء النسخة، لكن تعذر تضمين بعض صور الشعار أو الختم المخصصة.",
  },
  fr: {
    title: "Sauvegarde et restauration",
    subtitle:
      "Conservez une copie des données de l’atelier afin de pouvoir les restaurer en cas de changement d’ordinateur ou de perte de données.",
    lastBackup: "Dernière sauvegarde",
    noBackup: "Aucune sauvegarde n’a encore été créée",
    manual: "Manuelle",
    external: "Externe",
    size: "Taille",
    type: "Type",
    actions: "Protéger les données de l’atelier",
    actionsDescription:
      "Créez un fichier unique contenant vos données importantes et conservez-le dans un endroit sûr.",
    create: "Créer une sauvegarde",
    creating: "Création de la sauvegarde...",
    preparing: "Préparation et vérification des données",
    inspect: "Restaurer une sauvegarde",
    inspectHelp:
      "Sélectionnez une sauvegarde et vérifiez ses informations avant de restaurer les données.",
    externalTitle: "Sauvegarde externe",
    externalDescription:
      "Conservez une copie supplémentaire sur USB ou disque externe en cas de panne de l’ordinateur.",
    externalButton: "Sauvegarder sur USB",
    usbHint:
      "Vous pouvez enregistrer la sauvegarde sur l’ordinateur ou sur une clé USB.",
    adviceTitle: "Conseil de protection",
    advice:
      "Créez une copie régulièrement et gardez-en une hors de l’ordinateur, surtout après des opérations financières importantes.",
    successTitle: "Sauvegarde créée avec succès",
    fileName: "Nom du fichier",
    openLocation: "Ouvrir l’emplacement",
    close: "Fermer",
    successAdvice:
      "Il est recommandé de conserver une copie sur une clé USB ou un disque externe.",
    inspectionTitle: "Informations de la sauvegarde",
    valid: "Valide",
    backupDate: "Date de la sauvegarde",
    appVersion: "Version de l’application",
    customers: "Clients",
    suppliers: "Fournisseurs",
    workers: "Travailleurs",
    invoices: "Factures",
    products: "Produits",
    restoreLater:
      "La sauvegarde est valide. Aucune donnée ne sera remplacée à cette étape.",
    restoreButton: "Restaurer les données",
    cancel: "Annuler",
    restoreWarning:
      "Cette opération remplacera les données actuelles par celles de la sauvegarde sélectionnée. Une sauvegarde de sécurité sera créée automatiquement avant de continuer.",
    restoreProgressTitle:
      "Restauration des données en cours. Veuillez patienter.",
    restoreSuccess:
      "Données restaurées avec succès. Khayati Manager va redémarrer.",
    restoreSteps: {
      VALIDATING: "Vérification",
      SAFETY_BACKUP: "Création d’une sauvegarde de sécurité",
      PREPARING: "Préparation des données",
      MIGRATING: "Mise à jour de la base",
      SWAPPING: "Restauration",
      FINAL_VALIDATION: "Vérification finale",
      RESTARTING: "Redémarrage de l’application",
    },
    unavailable:
      "La sauvegarde est disponible depuis l’application desktop Khayati Manager.",
    warningAssets:
      "La sauvegarde a été créée, mais certaines images personnalisées du logo ou du cachet n’ont pas pu être incluses.",
  },
} as const;

export function backupErrorMessage(code: string | undefined, lang: Lang) {
  const messages: Record<string, { ar: string; fr: string }> = {
    DESTINATION_UNAVAILABLE: {
      ar: "تعذر الوصول إلى مكان الحفظ.",
      fr: "Impossible d’accéder à l’emplacement choisi.",
    },
    INSUFFICIENT_SPACE: {
      ar: "لا توجد مساحة كافية.",
      fr: "Espace disque insuffisant.",
    },
    BACKUP_IN_PROGRESS: {
      ar: "يتم إنشاء نسخة احتياطية حاليًا.",
      fr: "Une sauvegarde est déjà en cours.",
    },
    RESTORE_IN_PROGRESS: {
      ar: "جاري استعادة البيانات، يرجى الانتظار.",
      fr: "Une restauration est déjà en cours. Veuillez patienter.",
    },
    DESTINATION_EXISTS: {
      ar: "يوجد ملف بنفس الاسم بالفعل. اختر اسمًا أو مكانًا آخر.",
      fr: "Un fichier portant ce nom existe déjà. Choisissez un autre nom ou emplacement.",
    },
    ARCHIVE_INVALID: {
      ar: "ملف النسخة المحدد غير صالح أو تالف.",
      fr: "Le fichier de sauvegarde sélectionné est invalide ou endommagé.",
    },
    CHECKSUM_MISMATCH: {
      ar: "تعذر التحقق من سلامة ملف النسخة الاحتياطية.",
      fr: "L’intégrité du fichier de sauvegarde n’a pas pu être vérifiée.",
    },
    SCHEMA_VERSION_MISMATCH: {
      ar: "هذه النسخة أُنشئت بواسطة إصدار أحدث من Khayati Manager. يرجى تحديث التطبيق أولًا.",
      fr: "Cette sauvegarde provient d’une version plus récente de Khayati Manager. Veuillez mettre l’application à jour.",
    },
    RESTORE_CANDIDATE_INVALID: {
      ar: "انتهت صلاحية النسخة المحددة. يرجى اختيار الملف من جديد.",
      fr: "La sélection a expiré. Veuillez choisir à nouveau la sauvegarde.",
    },
    RESTORE_CANDIDATE_CHANGED: {
      ar: "تم تعديل ملف النسخة بعد التحقق منه. يرجى اختياره من جديد.",
      fr: "Le fichier a été modifié après sa vérification. Sélectionnez-le à nouveau.",
    },
    SAFETY_BACKUP_FAILED: {
      ar: "تعذر إنشاء نسخة الأمان، لذلك لم يتم تنفيذ الاستعادة.",
      fr: "Impossible de créer la sauvegarde de sécurité. La restauration a été annulée.",
    },
    RESTORE_ROLLBACK_FAILED: {
      ar: "حدث خطأ حرج أثناء استرجاع البيانات السابقة. نسخة الأمان محفوظة للاسترجاع.",
      fr: "Une erreur critique a empêché le retour aux données précédentes. La sauvegarde de sécurité est conservée.",
    },
    RESTORE_FAILED: {
      ar: "تعذر استعادة النسخة الاحتياطية. لم يتم تغيير بياناتك الحالية.",
      fr: "Impossible de restaurer la sauvegarde. Vos données actuelles n’ont pas été modifiées.",
    },
    RESTORE_SWAP_FAILED: {
      ar: "فشلت الاستعادة وتمت إعادة بياناتك السابقة.",
      fr: "La restauration a échoué. Vos données précédentes ont été rétablies.",
    },
    FOREIGN_KEY_VIOLATION: {
      ar: "تحتوي النسخة على علاقات بيانات غير سليمة ولا يمكن استعادتها.",
      fr: "La sauvegarde contient des relations de données invalides et ne peut pas être restaurée.",
    },
    CRITICAL_TABLE_MISSING: {
      ar: "النسخة غير مكتملة ولا تحتوي على جميع البيانات الأساسية.",
      fr: "La sauvegarde est incomplète et ne contient pas toutes les données essentielles.",
    },
    LOCATION_UNAVAILABLE: {
      ar: "تعذر فتح مكان الملف.",
      fr: "Impossible d’ouvrir l’emplacement du fichier.",
    },
    BACKEND_UNAVAILABLE: {
      ar: "خدمة النسخ الاحتياطي غير متاحة حاليًا.",
      fr: "Le service de sauvegarde est actuellement indisponible.",
    },
  };
  return (
    messages[code ?? ""]?.[lang] ??
    (lang === "ar"
      ? "تعذر تنفيذ العملية. لم يتم تعديل بياناتك الحالية."
      : "Impossible d’effectuer l’opération. Vos données actuelles n’ont pas été modifiées.")
  );
}

export function formatBackupSize(size: number | undefined, lang: Lang) {
  if (!Number.isFinite(size) || !size || size < 0) return "—";
  const units =
    lang === "ar"
      ? ["بايت", "ك.ب", "م.ب", "ج.ب"]
      : ["o", "Ko", "Mo", "Go"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(value)} ${units[unitIndex]}`;
}

export function isBackupActionDisabled(
  apiAvailable: boolean,
  busy: boolean,
  inspecting: boolean,
  restoring = false,
) {
  return !apiAvailable || busy || inspecting || restoring;
}

export function backupResultState(result: {
  success: boolean;
  cancelled?: boolean;
}) {
  if (result.cancelled) return "cancelled" as const;
  return result.success ? ("success" as const) : ("error" as const);
}
