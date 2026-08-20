import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Calculator,
  ContactRound,
  Receipt,
  SlidersHorizontal,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export type Lang = "ar" | "fr";

export const palette = {
  bg: "#f5f4f0",
  surface: "#ffffff",
  primary: "#123c4a",
  primaryHover: "#0d2d38",
  accent: "#c39a5b",
  accentSoft: "#efe6d6",
  rose: "#c98a86",
  border: "#e5e2da",
  borderStrong: "#cfcabc",
  text: "#2b2b2b",
  muted: "#8a887f",
};

export const ui = {
  ar: {
    appName: "خياطي Manager",
    appSubtitle: "نظام تسيير ورشة الخياطة",
    pageTitle: "لوحة التسيير",
    welcome: "اختر القسم الذي تريد تسييره",
    openSection: "فتح القسم",
    userName: "أمينة العلوي",
    userRole: "مسؤولة الورشة",
    footer: "خياطي Manager - كل الحقوق محفوظة",
  },
  fr: {
    appName: "Khayati Manager",
    appSubtitle: "Système de gestion d'atelier de couture",
    pageTitle: "Tableau de gestion",
    welcome: "Choisissez la section que vous souhaitez gérer",
    openSection: "Ouvrir la section",
    userName: "Amina El Alaoui",
    userRole: "Responsable d'atelier",
    footer: "Khayati Manager - Tous droits réservés",
  },
} as const;

export type Section = {
  id: string;
  icon: LucideIcon;
  ar: { title: string; sub: string; desc: string };
  fr: { title: string; sub: string; desc: string };
  tint: string;
  iconColor: string;
};

export const sections: Section[] = [
  {
    id: "workers",
    icon: Users,
    ar: {
      title: "تسيير العمال",
      sub: "Gestion des travailleurs",
      desc: "متابعة العمال والأدوار والحضور والإنتاجية",
    },
    fr: {
      title: "Gestion des travailleurs",
      sub: "تسيير العمال",
      desc: "Suivi du personnel, des rôles, des présences et de la productivité",
    },
    tint: "rgba(18, 60, 74, 0.08)",
    iconColor: "#123c4a",
  },
  {
    id: "clients",
    icon: ContactRound,
    ar: {
      title: "تسيير الزبائن",
      sub: "Gestion des clients",
      desc: "ملفات الزبائن، المبيعات، الدفعات والديون",
    },
    fr: {
      title: "Gestion des clients",
      sub: "تسيير الزبائن",
      desc: "Dossiers clients, ventes, paiements et créances",
    },
    tint: "rgba(107, 138, 160, 0.14)",
    iconColor: "#587c92",
  },
  {
    id: "stock",
    icon: Boxes,
    ar: {
      title: "تسيير المخزون",
      sub: "Gestion du stock",
      desc: "المواد الأولية، المنتجات الجاهزة وعمليات الإنتاج",
    },
    fr: {
      title: "Gestion du stock",
      sub: "تسيير المخزون",
      desc: "Matières premières, produits finis et productions",
    },
    tint: "rgba(195, 154, 91, 0.14)",
    iconColor: "#a87d3c",
  },
  {
    id: "suppliers",
    icon: Truck,
    ar: {
      title: "تسيير الموردين",
      sub: "Gestion des fournisseurs",
      desc: "متابعة الموردين، المشتريات، المدفوعات والديون",
    },
    fr: {
      title: "Gestion des fournisseurs",
      sub: "تسيير الموردين",
      desc: "Fournisseurs, achats, paiements et dettes",
    },
    tint: "rgba(107, 138, 160, 0.14)",
    iconColor: "#6b8aa0",
  },
  {
    id: "sales",
    icon: Receipt,
    ar: {
      title: "المبيعات والفواتير",
      sub: "Ventes et factures",
      desc: "بيع المنتجات المتوفرة وإدارة الفواتير والمدفوعات",
    },
    fr: {
      title: "Ventes et factures",
      sub: "المبيعات والفواتير",
      desc: "Vente des produits disponibles, factures et paiements",
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
      desc: "الأجور اليومية والأسبوعية والشهرية وحسب القطعة",
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
      desc: "مراقبة التكاليف والمصاريف وحساب النتيجة",
    },
    fr: {
      title: "Gestion des dépenses",
      sub: "تسيير المصاريف",
      desc: "Suivi des coûts, des dépenses et du résultat",
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
      desc: "تقارير المبيعات، الأرباح، الإنتاج والمخزون",
    },
    fr: {
      title: "Analyse des données",
      sub: "تحليل البيانات",
      desc: "Rapports sur les ventes, les marges, la production et le stock",
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
      desc: "قواعد الأجور والأسعار والتنبيهات الخاصة بالورشة",
    },
    fr: {
      title: "Paramètres spéciaux",
      sub: "إعدادات خاصة",
      desc: "Règles salariales, prix et alertes propres à l'atelier",
    },
    tint: "rgba(201, 138, 134, 0.14)",
    iconColor: "#b46a66",
  },
];
