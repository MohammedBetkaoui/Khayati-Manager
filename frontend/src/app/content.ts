import type { LucideIcon } from "lucide-react";
import {
  Users,
  Boxes,
  Receipt,
  Wallet,
  BarChart3,
  SlidersHorizontal,
  ClipboardList,
  Calculator,
} from "lucide-react";

export type Lang = "ar" | "fr";

/**
 * Sewing-workshop visual identity.
 * Deep teal primary, warm gold accent, off-white surface, charcoal text.
 * Defined once here and consumed everywhere to keep colors consistent.
 */
export const palette = {
  bg: "#f5f4f0",
  surface: "#ffffff",
  primary: "#123c4a", // deep teal / navy
  primaryHover: "#0d2d38",
  accent: "#c39a5b", // soft gold
  accentSoft: "#efe6d6",
  rose: "#c98a86", // dusty rose (secondary accent)
  border: "#e5e2da",
  borderStrong: "#cfcabc",
  text: "#2b2b2b",
  muted: "#8a887f",
};

export const ui = {
  ar: {
    appName: "خياطتي Manager",
    appSubtitle: "نظام تسيير ورشة الخياطة",
    pageTitle: "صفحة الاستقبال",
    welcome: "مرحباً بك، اختر القسم الذي تريد تسييره",
    openSection: "فتح القسم",
    userName: "أمينة العلوي",
    userRole: "مديرة الورشة",
    footer: "خياطتي Manager — كل الحقوق محفوظة",
  },
  fr: {
    appName: "Khayti Manager",
    appSubtitle: "Système de gestion d'atelier de couture",
    pageTitle: "Page d'accueil",
    welcome: "Bienvenue, choisissez la section que vous souhaitez gérer",
    openSection: "Ouvrir la section",
    userName: "Amina El Alaoui",
    userRole: "Responsable d'atelier",
    footer: "Khayti Manager — Tous droits réservés",
  },
} as const;

export type Section = {
  id: string;
  icon: LucideIcon;
  ar: { title: string; sub: string; desc: string };
  fr: { title: string; sub: string; desc: string };
  tint: string; // icon container background
  iconColor: string;
};

export const sections: Section[] = [
  {
    id: "workers",
    icon: Users,
    ar: {
      title: "تسيير العمال",
      sub: "Gestion des travailleurs",
      desc: "متابعة العمال، الأدوار، الحضور والإنتاج",
    },
    fr: {
      title: "Gestion des travailleurs",
      sub: "تسيير العمال",
      desc: "Suivi du personnel, des rôles, des présences et de la production",
    },
    tint: "rgba(18, 60, 74, 0.08)",
    iconColor: "#123c4a",
  },
  {
    id: "stock",
    icon: Boxes,
    ar: {
      title: "تسيير المخزون",
      sub: "Gestion du stock",
      desc: "الأقمشة، الخيوط، الأزرار والمواد الأولية",
    },
    fr: {
      title: "Gestion du stock",
      sub: "تسيير المخزون",
      desc: "Tissus, fils, boutons et matières premières",
    },
    tint: "rgba(195, 154, 91, 0.14)",
    iconColor: "#a87d3c",
  },
  {
    id: "production",
    icon: ClipboardList,
    ar: {
      title: "تسيير الإنتاج والطلبيات",
      sub: "Gestion de la production",
      desc: "متابعة الطلبيات ومراحل الإنتاج من الاستلام إلى التسليم",
    },
    fr: {
      title: "Gestion de la production",
      sub: "تسيير الإنتاج والطلبيات",
      desc: "Suivi des commandes et des étapes de production jusqu'à la livraison",
    },
    tint: "rgba(18, 60, 74, 0.08)",
    iconColor: "#123c4a",
  },
  {
    id: "sales",
    icon: Receipt,
    ar: {
      title: "المبيعات",
      sub: "Ventes",
      desc: "تسجيل المبيعات، الفواتير والمدفوعات",
    },
    fr: {
      title: "Ventes",
      sub: "المبيعات",
      desc: "Enregistrement des ventes, factures et paiements",
    },
    tint: "rgba(201, 138, 134, 0.14)",
    iconColor: "#b46a66",
  },
  {
    id: "salary",
    icon: Wallet,
    ar: {
      title: "تسيير الرواتب",
      sub: "Gestion des salaires",
      desc: "الرواتب اليومية، الأسبوعية، الشهرية وحسب القطع",
    },
    fr: {
      title: "Gestion des salaires",
      sub: "تسيير الرواتب",
      desc: "Salaires journaliers, hebdomadaires, mensuels et à la pièce",
    },
    tint: "rgba(18, 60, 74, 0.08)",
    iconColor: "#123c4a",
  },
  {
    id: "expenses",
    icon: Calculator,
    ar: {
      title: "تسيير المصاريف",
      sub: "Gestion des dépenses",
      desc: "مراقبة التكاليف الثابتة والمتغيرة وحساب الربح الحقيقي",
    },
    fr: {
      title: "Gestion des dépenses",
      sub: "تسيير المصاريف",
      desc: "Contrôle des coûts fixes et variables et calcul du bénéfice net",
    },
    tint: "rgba(107, 138, 160, 0.14)",
    iconColor: "#6b8aa0",
  },
  {
    id: "analytics",
    icon: BarChart3,
    ar: {
      title: "تحليل البيانات",
      sub: "Analyse des données",
      desc: "تقارير حول الأرباح، الإنتاجية والمخزون",
    },
    fr: {
      title: "Analyse des données",
      sub: "تحليل البيانات",
      desc: "Rapports sur les bénéfices, la productivité et le stock",
    },
    tint: "rgba(195, 154, 91, 0.14)",
    iconColor: "#a87d3c",
  },
  {
    id: "settings",
    icon: SlidersHorizontal,
    ar: {
      title: "إعدادات خاصة",
      sub: "Paramètres spéciaux",
      desc: "قواعد الأجور، أسعار القطع، مراحل الإنتاج والتنبيهات الخاصة بالورشة",
    },
    fr: {
      title: "Paramètres spéciaux",
      sub: "إعدادات خاصة",
      desc: "Règles salariales, prix à la pièce, étapes et alertes de l'atelier",
    },
    tint: "rgba(201, 138, 134, 0.14)",
    iconColor: "#b46a66",
  },
];
