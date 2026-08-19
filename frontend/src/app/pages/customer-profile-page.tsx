import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Coins,
  CreditCard,
  Edit,
  Eye,
  FileText,
  History,
  Plus,
  Printer,
  Receipt,
  Repeat2,
  Ruler,
  Save,
  Scissors,
  ShoppingBag,
  Star,
  StickyNote,
  Table2,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { palette, type Lang } from "../content";
import { AppHeader } from "../components/app-header";
import { Badge, Button, Field, Select, TextInput, Avatar } from "../components/kit";
import { PageBackground, StitchDivider } from "../components/page-background";
import { ModalShell, Textarea } from "../components/production/modal-shell";
import { useLanguage } from "../language-context";

type Bilingual = Record<Lang, string>;
type TabId = "overview" | "orders" | "invoices" | "payments" | "measurements" | "notes";
type OrderStatus = "ready" | "inProgress" | "delivered" | "waiting";
type InvoiceStatus = "paid" | "partial" | "unpaid";
type PaymentMethod = "cash" | "transfer" | "check";

type CustomerOrder = {
  number: string;
  date: string;
  product: Bilingual;
  quantity: Bilingual;
  price: number;
  status: OrderStatus;
  deliveryDate: string;
};

type CustomerInvoice = {
  number: string;
  date: string;
  total: number;
  paid: number;
  remaining: number;
  status: InvoiceStatus;
};

type CustomerPayment = {
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
};

type MeasurementEntry = {
  label: Bilingual;
  value: string;
};

type CustomerProfile = {
  name: Bilingual;
  phone: string;
  address: Bilingual;
  firstContact: string;
  orderCount: number;
  lastContact: string;
  status: Bilingual;
};

type MeasurementHistoryRow = {
  date: string;
  garment: Bilingual;
  details: Bilingual;
};

type ActivityItem = {
  title: Bilingual;
  time: Bilingual;
};

type ActionNotice = {
  title: Bilingual;
  detail: Bilingual;
};

type OrderModalState =
  | { mode: "view"; order: CustomerOrder }
  | { mode: "edit"; order: CustomerOrder }
  | null;

type InvoiceModalState =
  | { mode: "view"; invoice: CustomerInvoice }
  | { mode: "print"; invoice: CustomerInvoice }
  | null;

type OrderFormValue = {
  product: string;
  quantity: string;
  colors: string;
  measurements: string;
  deliveryDate: string;
  notes: string;
};

type InvoiceFormValue = {
  product: string;
  quantity: string;
  total: string;
  paid: string;
  date: string;
  notes: string;
};

const customer: CustomerProfile = {
  name: { ar: "سعاد مرزوق", fr: "Souad Merzouk" },
  phone: "0781 24 06 61",
  address: { ar: "حي الورود، بئر خادم، الجزائر", fr: "Cite des Roses, Bir Khadem, Alger" },
  firstContact: "2025-01-10",
  orderCount: 24,
  lastContact: "2026-06-28",
  status: { ar: "زبون نشط", fr: "Client actif" },
};

const orders: CustomerOrder[] = [
  {
    number: "ORD-1024",
    date: "2026-06-28",
    product: { ar: "قميص رجالي", fr: "Chemise homme" },
    quantity: { ar: "3 قطع", fr: "3 pcs" },
    price: 9800,
    status: "ready",
    deliveryDate: "2026-07-02",
  },
  {
    number: "ORD-1018",
    date: "2026-06-20",
    product: { ar: "بدلة عمل", fr: "Tenue de travail" },
    quantity: { ar: "2 قطع", fr: "2 pcs" },
    price: 54000,
    status: "delivered",
    deliveryDate: "2026-06-26",
  },
  {
    number: "ORD-1007",
    date: "2026-05-14",
    product: { ar: "سروال كلاسيكي", fr: "Pantalon classique" },
    quantity: { ar: "4 قطع", fr: "4 pcs" },
    price: 18600,
    status: "delivered",
    deliveryDate: "2026-05-20",
  },
  {
    number: "ORD-0996",
    date: "2026-04-29",
    product: { ar: "زي مدرسي", fr: "Uniforme scolaire" },
    quantity: { ar: "5 قطع", fr: "5 pcs" },
    price: 32000,
    status: "inProgress",
    deliveryDate: "2026-07-05",
  },
  {
    number: "ORD-0972",
    date: "2026-03-18",
    product: { ar: "قميص رسمي", fr: "Chemise habillee" },
    quantity: { ar: "2 قطع", fr: "2 pcs" },
    price: 11200,
    status: "delivered",
    deliveryDate: "2026-03-24",
  },
];

const invoices: CustomerInvoice[] = [
  { number: "INV-1024", date: "2026-06-28", total: 9800, paid: 4000, remaining: 5800, status: "partial" },
  { number: "INV-1018", date: "2026-06-20", total: 54000, paid: 49000, remaining: 5000, status: "partial" },
  { number: "INV-1007", date: "2026-05-14", total: 18600, paid: 18600, remaining: 0, status: "paid" },
  { number: "INV-0996", date: "2026-04-29", total: 32000, paid: 0, remaining: 32000, status: "unpaid" },
  { number: "INV-0972", date: "2026-03-18", total: 11200, paid: 11200, remaining: 0, status: "paid" },
];

const payments: CustomerPayment[] = [
  { date: "28/06/2026", amount: 4000, method: "cash", reference: "INV-1024" },
  { date: "20/06/2026", amount: 5000, method: "transfer", reference: "INV-1018" },
  { date: "14/05/2026", amount: 18600, method: "cash", reference: "INV-1007" },
  { date: "18/03/2026", amount: 11200, method: "check", reference: "INV-0972" },
];

const measurementEntries: MeasurementEntry[] = [
  { label: { ar: "الطول", fr: "Taille" }, value: "168 cm" },
  { label: { ar: "عرض الكتف", fr: "Epaules" }, value: "42 cm" },
  { label: { ar: "محيط الصدر", fr: "Tour poitrine" }, value: "96 cm" },
  { label: { ar: "محيط الخصر", fr: "Tour taille" }, value: "82 cm" },
  { label: { ar: "طول الكم", fr: "Longueur manche" }, value: "58 cm" },
  { label: { ar: "طول السروال", fr: "Longueur pantalon" }, value: "101 cm" },
];

const measurementHistory: MeasurementHistoryRow[] = [
  {
    date: "2026-06-20",
    garment: { ar: "بدلة عمل", fr: "Tenue de travail" },
    details: { ar: "الطول، عرض الكتف، محيط الصدر، طول الكم", fr: "Taille, epaules, poitrine, manches" },
  },
  {
    date: "2026-05-14",
    garment: { ar: "سروال كلاسيكي", fr: "Pantalon classique" },
    details: { ar: "محيط الخصر، طول السروال، اتساع الأسفل", fr: "Taille, longueur pantalon, bas" },
  },
  {
    date: "2026-03-18",
    garment: { ar: "قميص رسمي", fr: "Chemise habillee" },
    details: { ar: "عرض الكتف، محيط الصدر، طول الكم", fr: "Epaules, poitrine, manches" },
  },
];

const notes = [
  { ar: "يفضل الأقمشة القطنية", fr: "Prefere les tissus en coton" },
  { ar: "يحتاج التسليم بسرعة", fr: "Demande souvent une livraison rapide" },
  { ar: "المقاس ثابت منذ آخر طلبية", fr: "Mesures stables depuis la derniere commande" },
];

const topProducts = [
  { label: { ar: "قمصان", fr: "Chemises" }, count: { ar: "15 مرات", fr: "15 fois" } },
  { label: { ar: "سراويل", fr: "Pantalons" }, count: { ar: "8 مرات", fr: "8 fois" } },
  { label: { ar: "زي مدرسي", fr: "Uniformes scolaires" }, count: { ar: "5 مرات", fr: "5 fois" } },
];

const recentActivity: ActivityItem[] = [
  { title: { ar: "طلبية جديدة", fr: "Nouvelle commande" }, time: { ar: "قبل يومين", fr: "Il y a 2 jours" } },
  { title: { ar: "دفع 5000 دج", fr: "Paiement 5000 DA" }, time: { ar: "قبل أسبوع", fr: "Il y a une semaine" } },
  { title: { ar: "تعديل مقاسات", fr: "Mesures modifiees" }, time: { ar: "قبل شهر", fr: "Il y a un mois" } },
];

const orderStatusColors: Record<OrderStatus, string> = {
  ready: "#4d8a6a",
  inProgress: "#a87d3c",
  delivered: palette.primary,
  waiting: "#b46a66",
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  paid: "#4d8a6a",
  partial: "#a87d3c",
  unpaid: "#b46a66",
};

const customerProfileText = {
  ar: {
    currency: "دج",
    breadcrumb: ["الرئيسية", "المبيعات", "الزبائن", "ملف الزبون"],
    backToCustomers: "العودة إلى قائمة الزبائن",
    title: "ملف الزبون",
    subtitle: "تاريخ الطلبات والفواتير والمدفوعات الخاصة بهذا الزبون",
    actions: {
      editCustomer: "تعديل معلومات الزبون",
      newOrder: "إنشاء طلبية جديدة",
      newInvoice: "إنشاء فاتورة",
      printProfile: "طباعة الملف",
      quickOrder: "طلبية جديدة",
      view: "عرض",
      edit: "تعديل",
      reorder: "إعادة الطلب",
      print: "طباعة",
      saveMeasurements: "حفظ مقاسات جديدة",
      editMeasurements: "تعديل المقاسات",
      addNote: "إضافة ملاحظة",
      recordPayment: "تسجيل دفعة",
      createOrder: "إنشاء الطلبية",
      cancel: "إلغاء",
    },
    profile: {
      name: "اسم الزبون",
      phone: "رقم الهاتف",
      address: "العنوان",
      firstContact: "تاريخ أول تعامل",
      orderCount: "عدد الطلبات",
      lastContact: "آخر تعامل",
      orderUnit: "طلبية",
    },
    summary: {
      totalPurchases: "إجمالي المشتريات",
      totalPurchasesHint: "قيمة كل الطلبات المسجلة",
      paidAmount: "المبلغ المدفوع",
      paidAmountHint: "إجمالي الدفعات المستلمة",
      remainingAmount: "المبلغ المتبقي",
      remainingAmountHint: "يحتاج متابعة مالية",
      invoiceCount: "عدد الفواتير",
      invoiceCountHint: "الفواتير المرتبطة بالزبون",
      averageOrder: "متوسط قيمة الطلب",
      averageOrderHint: "متوسط المبلغ لكل طلبية",
    },
    tabs: {
      overview: "كل المعلومات",
      orders: "الطلبات",
      invoices: "الفواتير",
      payments: "المدفوعات",
      measurements: "المقاسات",
      notes: "الملاحظات",
    },
    sections: {
      ordersTitle: "سجل الطلبات",
      invoicesTitle: "سجل الفواتير",
      paymentTitle: "سجل الدفع",
      measurementsTitle: "مقاسات الزبون",
      measurementHistory: "سجل المقاسات السابقة",
      notesTitle: "ملاحظات الزبون",
      tailorNotes: "ملاحظات الخياطة",
      sidebarTitle: "ملخص الزبون",
      frequentProducts: "أكثر المنتجات طلباً",
      accountStatus: "حالة الحساب",
      lastActivity: "آخر نشاط",
      analytics: "تحليل تعامل الزبون",
    },
    ordersTable: {
      number: "رقم الطلبية",
      date: "التاريخ",
      product: "المنتج",
      quantity: "الكمية",
      price: "السعر",
      status: "الحالة",
      delivery: "تاريخ التسليم",
      actions: "الإجراءات",
    },
    invoiceTable: {
      number: "رقم الفاتورة",
      date: "التاريخ",
      total: "المبلغ الإجمالي",
      paid: "المدفوع",
      remaining: "المتبقي",
      status: "الحالة",
      actions: "الإجراءات",
    },
    orderStatus: {
      ready: "جاهز",
      inProgress: "قيد الإنجاز",
      delivered: "مسلم",
      waiting: "بانتظار التأكيد",
    },
    invoiceStatus: {
      paid: "مدفوعة",
      partial: "مدفوعة جزئياً",
      unpaid: "غير مدفوعة",
    },
    paymentMethods: {
      cash: "نقداً",
      transfer: "تحويل",
      check: "صك",
    },
    payments: {
      date: "التاريخ",
      amount: "المبلغ",
      method: "طريقة الدفع",
      reference: "المرجع",
    },
    measurements: {
      notes: "يفضل ترك مساحة بسيطة في الكتف، وطول الكم لا يتجاوز المعصم.",
      date: "التاريخ",
      garment: "نوع اللباس",
      used: "المقاسات المستخدمة",
    },
    sidebar: {
      balance: "الرصيد",
      needsFollowUp: "يحتاج متابعة",
      ordersCount: "عدد الطلبات",
      salesTotal: "إجمالي المبيعات",
      loyalty: "درجة الولاء",
      lastOrder: "آخر طلب",
    },
    modal: {
      title: "طلبية جديدة لهذا الزبون",
      customerName: "اسم الزبون",
      phone: "رقم الهاتف",
      productType: "نوع المنتج",
      quantity: "الكمية",
      colors: "الألوان",
      measurements: "المقاسات",
      deliveryDate: "تاريخ التسليم",
      notes: "ملاحظات",
      productPlaceholder: "قميص رجالي",
      colorsPlaceholder: "أبيض، أزرق داكن",
      measurementsPlaceholder: "استخدم المقاسات المحفوظة مع تعديل بسيط للكتف",
    },
  },
  fr: {
    currency: "DA",
    breadcrumb: ["Accueil", "Ventes", "Clients", "Fiche client"],
    backToCustomers: "Retour a la liste clients",
    title: "Fiche client",
    subtitle: "Historique des commandes, factures et paiements de ce client",
    actions: {
      editCustomer: "Modifier le client",
      newOrder: "Nouvelle commande",
      newInvoice: "Nouvelle facture",
      printProfile: "Imprimer la fiche",
      quickOrder: "Nouvelle commande",
      view: "Voir",
      edit: "Modifier",
      reorder: "Recommander",
      print: "Imprimer",
      saveMeasurements: "Enregistrer mesures",
      editMeasurements: "Modifier mesures",
      addNote: "Ajouter une note",
      recordPayment: "Enregistrer paiement",
      createOrder: "Creer la commande",
      cancel: "Annuler",
    },
    profile: {
      name: "Nom du client",
      phone: "Telephone",
      address: "Adresse",
      firstContact: "Premier contact",
      orderCount: "Nombre de commandes",
      lastContact: "Dernier contact",
      orderUnit: "commandes",
    },
    summary: {
      totalPurchases: "Total achats",
      totalPurchasesHint: "Valeur de toutes les commandes",
      paidAmount: "Montant paye",
      paidAmountHint: "Total des paiements recus",
      remainingAmount: "Reste a payer",
      remainingAmountHint: "Suivi financier requis",
      invoiceCount: "Nombre de factures",
      invoiceCountHint: "Factures liees au client",
      averageOrder: "Panier moyen",
      averageOrderHint: "Montant moyen par commande",
    },
    tabs: {
      overview: "Toutes les infos",
      orders: "Commandes",
      invoices: "Factures",
      payments: "Paiements",
      measurements: "Mesures",
      notes: "Notes",
    },
    sections: {
      ordersTitle: "Historique des commandes",
      invoicesTitle: "Historique des factures",
      paymentTitle: "Historique des paiements",
      measurementsTitle: "Mesures du client",
      measurementHistory: "Historique des mesures",
      notesTitle: "Notes client",
      tailorNotes: "Notes couture",
      sidebarTitle: "Resume client",
      frequentProducts: "Produits les plus demandes",
      accountStatus: "Etat du compte",
      lastActivity: "Derniere activite",
      analytics: "Analyse de la relation client",
    },
    ordersTable: {
      number: "N commande",
      date: "Date",
      product: "Produit",
      quantity: "Quantite",
      price: "Prix",
      status: "Statut",
      delivery: "Livraison",
      actions: "Actions",
    },
    invoiceTable: {
      number: "N facture",
      date: "Date",
      total: "Montant total",
      paid: "Paye",
      remaining: "Reste",
      status: "Statut",
      actions: "Actions",
    },
    orderStatus: {
      ready: "Pret",
      inProgress: "En cours",
      delivered: "Livre",
      waiting: "En attente",
    },
    invoiceStatus: {
      paid: "Payee",
      partial: "Payee partiellement",
      unpaid: "Non payee",
    },
    paymentMethods: {
      cash: "Especes",
      transfer: "Virement",
      check: "Cheque",
    },
    payments: {
      date: "Date",
      amount: "Montant",
      method: "Methode",
      reference: "Reference",
    },
    measurements: {
      notes: "Garder un peu d'aisance aux epaules, manche juste au poignet.",
      date: "Date",
      garment: "Vetement",
      used: "Mesures utilisees",
    },
    sidebar: {
      balance: "Solde",
      needsFollowUp: "A suivre",
      ordersCount: "Commandes",
      salesTotal: "Total ventes",
      loyalty: "Fidelite",
      lastOrder: "Derniere commande",
    },
    modal: {
      title: "Nouvelle commande pour ce client",
      customerName: "Nom du client",
      phone: "Telephone",
      productType: "Type de produit",
      quantity: "Quantite",
      colors: "Couleurs",
      measurements: "Mesures",
      deliveryDate: "Date de livraison",
      notes: "Notes",
      productPlaceholder: "Chemise homme",
      colorsPlaceholder: "Blanc, bleu fonce",
      measurementsPlaceholder: "Utiliser les mesures enregistrees avec un leger ajustement epaule",
    },
  },
} satisfies Record<Lang, Record<string, unknown>>;

const financialSummary = {
  totalPurchases: 850000,
  paidAmount: 720000,
  remainingAmount: 130000,
  invoiceCount: 18,
  averageOrder: 47000,
};

function money(value: number, currency: string) {
  return `${value.toLocaleString()} ${currency}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function todayDisplay() {
  const [year, month, day] = todayIso().split("-");
  return `${day}/${month}/${year}`;
}

function nextSerial(rows: { number: string }[], prefix: string) {
  const max = rows.reduce((largest, row) => {
    const current = Number(row.number.replace(/\D/g, ""));
    return Number.isFinite(current) ? Math.max(largest, current) : largest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function quantityLabel(quantity: string): Bilingual {
  return {
    ar: `${quantity || "1"} قطع`,
    fr: `${quantity || "1"} pcs`,
  };
}

function invoiceStatusFor(total: number, paid: number): InvoiceStatus {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

const productChoices = [
  { value: "shirt", label: { ar: "قميص رجالي", fr: "Chemise homme" } },
  { value: "pants", label: { ar: "سروال", fr: "Pantalon" } },
  { value: "uniform", label: { ar: "زي مدرسي", fr: "Uniforme scolaire" } },
  { value: "workwear", label: { ar: "بدلة عمل", fr: "Tenue de travail" } },
];

function productFromValue(value: string): Bilingual {
  return productChoices.find((choice) => choice.value === value)?.label ?? {
    ar: value || "قميص رجالي",
    fr: value || "Chemise homme",
  };
}

function productValueFromOrder(order: CustomerOrder | null) {
  if (!order) return "";
  return productChoices.find((choice) => choice.label.ar === order.product.ar || choice.label.fr === order.product.fr)?.value ?? "";
}

function Panel({
  children,
  className = "",
  padding = 20,
}: {
  children: ReactNode;
  className?: string;
  padding?: number;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(18,60,74,0.08)", color: palette.primary }}
        >
          <Icon size={18} strokeWidth={1.9} />
        </div>
        <div>
          <h2 style={{ fontSize: 15.5, fontWeight: 800, color: palette.text }}>{title}</h2>
          {hint ? <p style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: palette.muted }}>{label}</div>
      <div className="mt-1" style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  color: string;
  tint: string;
}) {
  return (
    <Panel padding={18} className="min-h-[116px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ backgroundColor: tint, color }}>
          <Icon size={21} strokeWidth={1.9} />
        </div>
        <div style={{ textAlign: "end" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: palette.text, lineHeight: 1.15 }}>{value}</div>
        </div>
      </div>
      <div className="mt-4">
        <div style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>{label}</div>
        <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 2 }}>{hint}</div>
      </div>
    </Panel>
  );
}

function TabsNav({
  active,
  onChange,
  labels,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  labels: Record<TabId, string>;
}) {
  const tabs: TabId[] = ["overview", "orders", "invoices", "payments", "measurements", "notes"];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs.map((tab) => {
        const selected = active === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className="transition-colors"
            style={{
              padding: "9px 16px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: selected ? 700 : 500,
              color: selected ? "#fff" : palette.muted,
              backgroundColor: selected ? palette.primary : palette.surface,
              border: `1px solid ${selected ? palette.primary : palette.border}`,
            }}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}

function TextAction({
  children,
  icon: Icon,
  onClick,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-black/5"
      style={{ color: palette.primary, fontSize: 12, fontWeight: 700 }}
    >
      {Icon ? <Icon size={13} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}

const thStyle: CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  fontWeight: 800,
  color: palette.muted,
  textAlign: "start",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "14px",
  fontSize: 13.5,
  color: palette.text,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

function OrdersTable({
  lang,
  t,
  rows,
  onView,
  onEdit,
  onReorder,
}: {
  lang: Lang;
  t: typeof customerProfileText.ar;
  rows: CustomerOrder[];
  onView: (order: CustomerOrder) => void;
  onEdit: (order: CustomerOrder) => void;
  onReorder: (order: CustomerOrder) => void;
}) {
  const cur = t.currency;

  return (
    <Panel padding={0}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
        <Table2 size={17} style={{ color: palette.primary }} />
        <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.ordersTitle}</span>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 920 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              <th style={thStyle}>{t.ordersTable.number}</th>
              <th style={thStyle}>{t.ordersTable.date}</th>
              <th style={thStyle}>{t.ordersTable.product}</th>
              <th style={thStyle}>{t.ordersTable.quantity}</th>
              <th style={thStyle}>{t.ordersTable.price}</th>
              <th style={thStyle}>{t.ordersTable.status}</th>
              <th style={thStyle}>{t.ordersTable.delivery}</th>
              <th style={thStyle}>{t.ordersTable.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => {
              const statusColor = orderStatusColors[order.status];
              return (
                <tr key={order.number} className="transition-colors hover:bg-black/5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...tdStyle, direction: "ltr", fontWeight: 800, color: palette.primary }}>#{order.number}</td>
                  <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{order.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{order.product[lang]}</td>
                  <td style={{ ...tdStyle, color: palette.muted }}>{order.quantity[lang]}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{money(order.price, cur)}</td>
                  <td style={tdStyle}>
                    <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                      {t.orderStatus[order.status]}
                    </Badge>
                  </td>
                  <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{order.deliveryDate}</td>
                  <td style={tdStyle}>
                    <div className="flex items-center gap-1">
                      <TextAction icon={Eye} onClick={() => onView(order)}>
                        {t.actions.view}
                      </TextAction>
                      <TextAction icon={Edit} onClick={() => onEdit(order)}>
                        {t.actions.edit}
                      </TextAction>
                      <TextAction icon={Repeat2} onClick={() => onReorder(order)}>
                        {t.actions.reorder}
                      </TextAction>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function InvoicesTable({
  lang,
  t,
  rows,
  onView,
  onPrint,
}: {
  lang: Lang;
  t: typeof customerProfileText.ar;
  rows: CustomerInvoice[];
  onView: (invoice: CustomerInvoice) => void;
  onPrint: (invoice: CustomerInvoice) => void;
}) {
  const cur = t.currency;

  return (
    <Panel padding={0}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
        <Receipt size={17} style={{ color: palette.primary }} />
        <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.invoicesTitle}</span>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 780 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              <th style={thStyle}>{t.invoiceTable.number}</th>
              <th style={thStyle}>{t.invoiceTable.date}</th>
              <th style={thStyle}>{t.invoiceTable.total}</th>
              <th style={thStyle}>{t.invoiceTable.paid}</th>
              <th style={thStyle}>{t.invoiceTable.remaining}</th>
              <th style={thStyle}>{t.invoiceTable.status}</th>
              <th style={thStyle}>{t.invoiceTable.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => {
              const statusColor = invoiceStatusColors[invoice.status];
              return (
                <tr key={invoice.number} className="transition-colors hover:bg-black/5" style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...tdStyle, direction: "ltr", fontWeight: 800, color: palette.primary }}>#{invoice.number}</td>
                  <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{invoice.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{money(invoice.total, cur)}</td>
                  <td style={{ ...tdStyle, color: "#4d8a6a", fontWeight: 700 }}>{money(invoice.paid, cur)}</td>
                  <td style={{ ...tdStyle, color: invoice.remaining > 0 ? "#b46a66" : palette.muted, fontWeight: 800 }}>
                    {money(invoice.remaining, cur)}
                  </td>
                  <td style={tdStyle}>
                    <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                      {t.invoiceStatus[invoice.status]}
                    </Badge>
                  </td>
                  <td style={tdStyle}>
                    <div className="flex items-center gap-1">
                      <TextAction icon={Eye} onClick={() => onView(invoice)}>
                        {t.actions.view}
                      </TextAction>
                      <TextAction icon={Printer} onClick={() => onPrint(invoice)}>
                        {t.actions.print}
                      </TextAction>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PaymentTimeline({ lang, t, items }: { lang: Lang; t: typeof customerProfileText.ar; items: CustomerPayment[] }) {
  return (
    <Panel>
      <SectionHeader icon={History} title={t.sections.paymentTitle} />
      <div className="mt-5 flex flex-col gap-4">
        {items.map((payment, index) => (
          <div key={`${payment.reference}-${payment.date}-${payment.amount}-${index}`} className="grid grid-cols-[auto_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: index === 0 ? palette.accent : palette.primary }} />
              {index < payments.length - 1 ? <span className="mt-1 flex-1" style={{ width: 1, backgroundColor: palette.border }} /> : null}
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{money(payment.amount, t.currency)}</div>
                <div style={{ direction: "ltr", fontSize: 12.5, color: palette.muted }}>{payment.date}</div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2" style={{ fontSize: 12.5, color: palette.muted }}>
                <Badge bg="rgba(18,60,74,0.08)" fg={palette.primary}>
                  {t.paymentMethods[payment.method]}
                </Badge>
                <span>{t.payments.reference}: #{payment.reference}</span>
                <span className="hidden sm:inline">{lang === "ar" ? "تم تسجيل الدفعة في سجل الفاتورة" : "Paiement lie a la facture"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MeasurementsSection({
  lang,
  t,
  entries,
  history,
  onSave,
  onEdit,
}: {
  lang: Lang;
  t: typeof customerProfileText.ar;
  entries: MeasurementEntry[];
  history: MeasurementHistoryRow[];
  onSave: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader icon={Ruler} title={t.sections.measurementsTitle} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onSave}>
              <Save size={15} />
              {t.actions.saveMeasurements}
            </Button>
            <Button variant="primary" onClick={onEdit}>
              <Edit size={15} />
              {t.actions.editMeasurements}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {entries.map((entry) => (
            <div
              key={entry.label.ar}
              style={{
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.bg,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11.5, color: palette.muted }}>{entry.label[lang]}</div>
              <div className="mt-1" style={{ direction: "ltr", fontSize: 16, fontWeight: 800, color: palette.primary }}>
                {entry.value}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-4 rounded-2xl border p-4"
          style={{ backgroundColor: "rgba(195,154,91,0.08)", borderColor: "rgba(195,154,91,0.22)" }}
        >
          <div className="flex items-center gap-2" style={{ color: palette.accent, fontSize: 13, fontWeight: 800 }}>
            <Scissors size={16} strokeWidth={2} />
            {t.sections.tailorNotes}
          </div>
          <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.8, color: palette.text }}>
            {t.measurements.notes}
          </p>
        </div>
      </Panel>

      <Panel padding={0}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <History size={17} style={{ color: palette.primary }} />
          <span style={{ fontSize: 14.5, fontWeight: 800, color: palette.text }}>{t.sections.measurementHistory}</span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
                <th style={thStyle}>{t.measurements.date}</th>
                <th style={thStyle}>{t.measurements.garment}</th>
                <th style={thStyle}>{t.measurements.used}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={`${row.date}-${row.garment.ar}`} style={{ borderBottom: `1px solid ${palette.border}` }}>
                  <td style={{ ...tdStyle, direction: "ltr", color: palette.muted }}>{row.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{row.garment[lang]}</td>
                  <td style={{ ...tdStyle, color: palette.muted }}>{row.details[lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function NotesSection({
  lang,
  t,
  items,
  onAdd,
}: {
  lang: Lang;
  t: typeof customerProfileText.ar;
  items: Bilingual[];
  onAdd: () => void;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader icon={StickyNote} title={t.sections.notesTitle} />
        <Button variant="primary" onClick={onAdd}>
          <Plus size={15} />
          {t.actions.addNote}
        </Button>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {items.map((note, index) => (
          <div
            key={`${note.ar}-${index}`}
            className="flex items-start gap-3"
            style={{
              borderRadius: 16,
              border: `1px solid ${palette.border}`,
              backgroundColor: index === 0 ? "rgba(195,154,91,0.08)" : palette.bg,
              padding: "13px 15px",
            }}
          >
            <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: index === 0 ? palette.accent : palette.primary }} />
            <span style={{ fontSize: 13.5, color: palette.text, lineHeight: 1.75 }}>{note[lang]}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OverviewTab({
  lang,
  t,
  orderRows,
  invoiceRows,
  paymentRows,
  measurementRows,
  measurementHistoryRows,
  noteRows,
  onViewOrder,
  onEditOrder,
  onReorder,
  onViewInvoice,
  onPrintInvoice,
  onSaveMeasurements,
  onEditMeasurements,
  onAddNote,
}: {
  lang: Lang;
  t: typeof customerProfileText.ar;
  orderRows: CustomerOrder[];
  invoiceRows: CustomerInvoice[];
  paymentRows: CustomerPayment[];
  measurementRows: MeasurementEntry[];
  measurementHistoryRows: MeasurementHistoryRow[];
  noteRows: Bilingual[];
  onViewOrder: (order: CustomerOrder) => void;
  onEditOrder: (order: CustomerOrder) => void;
  onReorder: (order: CustomerOrder) => void;
  onViewInvoice: (invoice: CustomerInvoice) => void;
  onPrintInvoice: (invoice: CustomerInvoice) => void;
  onSaveMeasurements: () => void;
  onEditMeasurements: () => void;
  onAddNote: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <OrdersTable
        lang={lang}
        t={t}
        rows={orderRows.slice(0, 4)}
        onView={onViewOrder}
        onEdit={onEditOrder}
        onReorder={onReorder}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <InvoicesTable lang={lang} t={t} rows={invoiceRows.slice(0, 3)} onView={onViewInvoice} onPrint={onPrintInvoice} />
        <PaymentTimeline lang={lang} t={t} items={paymentRows} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MeasurementsSection
          lang={lang}
          t={t}
          entries={measurementRows}
          history={measurementHistoryRows}
          onSave={onSaveMeasurements}
          onEdit={onEditMeasurements}
        />
        <NotesSection lang={lang} t={t} items={noteRows} onAdd={onAddNote} />
      </div>
    </div>
  );
}

function CustomerSidebar({
  lang,
  t,
  profile,
  financials,
  activityRows,
  onNewPayment,
}: {
  lang: Lang;
  t: typeof customerProfileText.ar;
  profile: CustomerProfile;
  financials: typeof financialSummary;
  activityRows: ActivityItem[];
  onNewPayment: () => void;
}) {
  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <Panel>
        <SectionHeader icon={UserRound} title={t.sections.sidebarTitle} />

        <div className="mt-5">
          <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.sections.frequentProducts}</div>
          <div className="mt-3 flex flex-col gap-2.5">
            {topProducts.map((product, index) => (
              <div key={product.label.ar} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: index === 0 ? palette.primary : palette.bg, color: index === 0 ? "#fff" : palette.primary, fontSize: 12, fontWeight: 800 }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: palette.text }}>{product.label[lang]}</span>
                </div>
                <span style={{ fontSize: 12.5, color: palette.muted }}>{product.count[lang]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="my-5" style={{ height: 1, backgroundColor: palette.border }} />

        <div>
          <div className="flex items-center justify-between gap-3">
            <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.sections.accountStatus}</div>
            <Badge bg="rgba(180,106,102,0.12)" fg="#b46a66" dot="#b46a66">
              {t.sidebar.needsFollowUp}
            </Badge>
          </div>
          <div
            className="mt-3 rounded-2xl p-4"
            style={{ backgroundColor: "rgba(180,106,102,0.08)", border: "1px solid rgba(180,106,102,0.18)" }}
          >
            <div style={{ fontSize: 12, color: palette.muted }}>{t.sidebar.balance}</div>
            <div className="mt-1" style={{ fontSize: 23, fontWeight: 800, color: "#b46a66" }}>
              {money(financials.remainingAmount, t.currency)}
            </div>
          </div>
          <Button variant="primary" full onClick={onNewPayment}>
            <CreditCard size={15} />
            {t.actions.recordPayment}
          </Button>
        </div>

        <div className="my-5" style={{ height: 1, backgroundColor: palette.border }} />

        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: palette.text }}>{t.sections.lastActivity}</div>
          <div className="mt-4 flex flex-col gap-3">
            {activityRows.map((activity, index) => (
              <div key={`${activity.title.ar}-${index}`} className="grid grid-cols-[auto_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: index === 0 ? palette.accent : palette.primary }} />
                  {index < activityRows.length - 1 ? <span className="mt-1 flex-1" style={{ width: 1, backgroundColor: palette.border }} /> : null}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>{activity.title[lang]}</div>
                  <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 2 }}>{activity.time[lang]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={TrendingUp} title={t.sections.analytics} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoBlock label={t.sidebar.ordersCount} value={profile.orderCount} />
          <InfoBlock label={t.sidebar.salesTotal} value={money(financials.totalPurchases, t.currency)} />
          <InfoBlock
            label={t.sidebar.loyalty}
            value={
              <span className="inline-flex items-center gap-0.5" style={{ color: palette.accent }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={15} fill="currentColor" strokeWidth={1.6} />
                ))}
              </span>
            }
          />
          <InfoBlock label={t.sidebar.lastOrder} value={<span style={{ direction: "ltr" }}>28-06-2026</span>} />
        </div>
      </Panel>
    </aside>
  );
}

function NewCustomerOrderModal({
  open,
  onClose,
  lang,
  t,
  profile,
  initialOrder,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  profile: CustomerProfile;
  initialOrder: CustomerOrder | null;
  onCreate: (form: OrderFormValue) => void;
}) {
  const [form, setForm] = useState<OrderFormValue>({
    product: "",
    quantity: "1",
    colors: "",
    measurements: "",
    deliveryDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      product: productValueFromOrder(initialOrder),
      quantity: initialOrder?.quantity[lang].replace(/\D/g, "") || "1",
      colors: "",
      measurements: initialOrder
        ? lang === "ar"
          ? "نفس المقاسات المستخدمة في الطلبية السابقة"
          : "Memes mesures que la commande precedente"
        : "",
      deliveryDate: "",
      notes: initialOrder
        ? `${lang === "ar" ? "إعادة طلب من" : "Recommande depuis"} #${initialOrder.number}`
        : "",
    });
  }, [initialOrder, lang, open]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.modal.title} maxWidth={660}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate(form);
          onClose();
        }}
      >
        <Field label={t.modal.customerName}>
          <TextInput value={profile.name[lang]} readOnly />
        </Field>
        <Field label={t.modal.phone}>
          <TextInput value={profile.phone} readOnly style={{ direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }} />
        </Field>
        <Field label={t.modal.productType}>
          <Select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })}>
            <option value="">{t.modal.productPlaceholder}</option>
            {productChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label[lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.modal.quantity}>
          <TextInput
            type="number"
            min={1}
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
          />
        </Field>
        <Field label={t.modal.colors}>
          <TextInput
            value={form.colors}
            onChange={(event) => setForm({ ...form, colors: event.target.value })}
            placeholder={t.modal.colorsPlaceholder}
          />
        </Field>
        <Field label={t.modal.deliveryDate}>
          <TextInput
            type="date"
            value={form.deliveryDate}
            onChange={(event) => setForm({ ...form, deliveryDate: event.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.modal.measurements}>
            <Textarea
              rows={3}
              value={form.measurements}
              onChange={(event) => setForm({ ...form, measurements: event.target.value })}
              placeholder={t.modal.measurementsPlaceholder}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t.modal.notes}>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
        </div>
        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" type="submit">
            <ClipboardPlus size={15} />
            {t.actions.createOrder}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function NoticeBanner({ notice, onClose, lang }: { notice: ActionNotice | null; onClose: () => void; lang: Lang }) {
  if (!notice) return null;

  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: "rgba(77,138,106,0.10)",
        borderColor: "rgba(77,138,106,0.22)",
        color: palette.text,
      }}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} strokeWidth={2} style={{ color: "#4d8a6a", marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{notice.title[lang]}</div>
          <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 2 }}>{notice.detail[lang]}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-1.5 transition-colors hover:bg-black/5"
        style={{ fontSize: 12, fontWeight: 800, color: palette.primary }}
      >
        {lang === "ar" ? "إخفاء" : "Masquer"}
      </button>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5"
      style={{ borderColor: palette.border, backgroundColor: palette.bg }}
    >
      <span style={{ fontSize: 12, color: palette.muted }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: palette.text, textAlign: "end" }}>{value}</span>
    </div>
  );
}

function EditCustomerModal({
  open,
  onClose,
  lang,
  t,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  profile: CustomerProfile;
  onSave: (profile: CustomerProfile) => void;
}) {
  const [form, setForm] = useState(profile);

  useEffect(() => {
    if (open) setForm(profile);
  }, [open, profile]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.actions.editCustomer} maxWidth={620}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
          onClose();
        }}
      >
        <Field label={t.profile.name}>
          <TextInput value={form.name[lang]} onChange={(event) => setForm({ ...form, name: { ...form.name, [lang]: event.target.value } })} />
        </Field>
        <Field label={t.profile.phone}>
          <TextInput
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            style={{ direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.profile.address}>
            <TextInput
              value={form.address[lang]}
              onChange={(event) => setForm({ ...form, address: { ...form.address, [lang]: event.target.value } })}
            />
          </Field>
        </div>
        <Field label={t.profile.firstContact}>
          <TextInput type="date" value={form.firstContact} onChange={(event) => setForm({ ...form, firstContact: event.target.value })} />
        </Field>
        <Field label={t.profile.lastContact}>
          <TextInput type="date" value={form.lastContact} onChange={(event) => setForm({ ...form, lastContact: event.target.value })} />
        </Field>
        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" type="submit">
            <Save size={15} />
            {lang === "ar" ? "حفظ التعديلات" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function OrderDetailsModal({
  state,
  onClose,
  lang,
  t,
  onEdit,
  onReorder,
}: {
  state: OrderModalState;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  onEdit: (order: CustomerOrder) => void;
  onReorder: (order: CustomerOrder) => void;
}) {
  if (!state || state.mode !== "view") return null;
  const order = state.order;
  const statusColor = orderStatusColors[order.status];

  return (
    <ModalShell open onClose={onClose} title={`${t.actions.view} #${order.number}`} maxWidth={620}>
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailLine label={t.ordersTable.number} value={<span style={{ direction: "ltr" }}>#{order.number}</span>} />
          <DetailLine label={t.ordersTable.date} value={<span style={{ direction: "ltr" }}>{order.date}</span>} />
          <DetailLine label={t.ordersTable.product} value={order.product[lang]} />
          <DetailLine label={t.ordersTable.quantity} value={order.quantity[lang]} />
          <DetailLine label={t.ordersTable.price} value={money(order.price, t.currency)} />
          <DetailLine
            label={t.ordersTable.status}
            value={
              <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                {t.orderStatus[order.status]}
              </Badge>
            }
          />
          <DetailLine label={t.ordersTable.delivery} value={<span style={{ direction: "ltr" }}>{order.deliveryDate}</span>} />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => onEdit(order)}>
            <Edit size={15} />
            {t.actions.edit}
          </Button>
          <Button variant="primary" onClick={() => onReorder(order)}>
            <Repeat2 size={15} />
            {t.actions.reorder}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function EditOrderModal({
  state,
  onClose,
  lang,
  t,
  onSave,
}: {
  state: OrderModalState;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  onSave: (order: CustomerOrder) => void;
}) {
  const order = state?.mode === "edit" ? state.order : null;
  const [form, setForm] = useState({
    product: "",
    quantity: "1",
    price: "",
    status: "ready" as OrderStatus,
    deliveryDate: "",
  });

  useEffect(() => {
    if (!order) return;
    setForm({
      product: productValueFromOrder(order),
      quantity: order.quantity[lang].replace(/\D/g, "") || "1",
      price: String(order.price),
      status: order.status,
      deliveryDate: order.deliveryDate,
    });
  }, [lang, order]);

  if (!order) return null;

  return (
    <ModalShell open onClose={onClose} title={`${t.actions.edit} #${order.number}`} maxWidth={620}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...order,
            product: productFromValue(form.product),
            quantity: quantityLabel(form.quantity),
            price: Number(form.price) || order.price,
            status: form.status,
            deliveryDate: form.deliveryDate || order.deliveryDate,
          });
          onClose();
        }}
      >
        <Field label={t.ordersTable.product}>
          <Select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })}>
            {productChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label[lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.ordersTable.quantity}>
          <TextInput type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
        </Field>
        <Field label={t.ordersTable.price}>
          <TextInput type="number" min={0} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        </Field>
        <Field label={t.ordersTable.delivery}>
          <TextInput type="date" value={form.deliveryDate} onChange={(event) => setForm({ ...form, deliveryDate: event.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.ordersTable.status}>
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as OrderStatus })}>
              {(Object.keys(orderStatusColors) as OrderStatus[]).map((status) => (
                <option key={status} value={status}>
                  {t.orderStatus[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" type="submit">
            <Save size={15} />
            {lang === "ar" ? "حفظ الطلبية" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function InvoiceDetailsModal({
  state,
  onClose,
  lang,
  t,
  onPrint,
  onPayment,
}: {
  state: InvoiceModalState;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  onPrint: (invoice: CustomerInvoice) => void;
  onPayment: (invoice: CustomerInvoice) => void;
}) {
  if (!state) return null;
  const invoice = state.invoice;
  const statusColor = invoiceStatusColors[invoice.status];

  return (
    <ModalShell open onClose={onClose} title={`${t.actions.view} #${invoice.number}`} maxWidth={620}>
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailLine label={t.invoiceTable.number} value={<span style={{ direction: "ltr" }}>#{invoice.number}</span>} />
          <DetailLine label={t.invoiceTable.date} value={<span style={{ direction: "ltr" }}>{invoice.date}</span>} />
          <DetailLine label={t.invoiceTable.total} value={money(invoice.total, t.currency)} />
          <DetailLine label={t.invoiceTable.paid} value={money(invoice.paid, t.currency)} />
          <DetailLine label={t.invoiceTable.remaining} value={money(invoice.remaining, t.currency)} />
          <DetailLine
            label={t.invoiceTable.status}
            value={
              <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                {t.invoiceStatus[invoice.status]}
              </Badge>
            }
          />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => onPayment(invoice)} disabled={invoice.remaining <= 0}>
            <CreditCard size={15} />
            {t.actions.recordPayment}
          </Button>
          <Button variant="primary" onClick={() => onPrint(invoice)}>
            <Printer size={15} />
            {t.actions.print}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function NewInvoiceModal({
  open,
  onClose,
  lang,
  t,
  profile,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  profile: CustomerProfile;
  onCreate: (form: InvoiceFormValue) => void;
}) {
  const [form, setForm] = useState<InvoiceFormValue>({
    product: "",
    quantity: "1",
    total: "",
    paid: "",
    date: todayIso(),
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({ product: "", quantity: "1", total: "", paid: "", date: todayIso(), notes: "" });
  }, [open]);

  const total = Number(form.total) || 0;
  const paid = Math.min(Number(form.paid) || 0, total);
  const remaining = Math.max(0, total - paid);

  return (
    <ModalShell open={open} onClose={onClose} title={t.actions.newInvoice} maxWidth={620}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate(form);
          onClose();
        }}
      >
        <Field label={t.modal.customerName}>
          <TextInput value={profile.name[lang]} readOnly />
        </Field>
        <Field label={t.modal.phone}>
          <TextInput value={profile.phone} readOnly style={{ direction: "ltr", textAlign: lang === "ar" ? "right" : "left" }} />
        </Field>
        <Field label={t.ordersTable.product}>
          <TextInput value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} placeholder={t.modal.productPlaceholder} />
        </Field>
        <Field label={t.modal.quantity}>
          <TextInput type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
        </Field>
        <Field label={t.invoiceTable.total}>
          <TextInput type="number" min={0} value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} placeholder="0" />
        </Field>
        <Field label={t.invoiceTable.paid}>
          <TextInput type="number" min={0} value={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.value })} placeholder="0" />
        </Field>
        <Field label={t.invoiceTable.date}>
          <TextInput type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </Field>
        <div className="rounded-xl border p-3" style={{ borderColor: palette.border, backgroundColor: palette.bg }}>
          <div className="flex justify-between" style={{ fontSize: 12, color: palette.muted }}>
            <span>{t.invoiceTable.remaining}</span>
            <strong style={{ color: remaining > 0 ? "#b46a66" : "#4d8a6a" }}>{money(remaining, t.currency)}</strong>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Field label={t.modal.notes}>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </Field>
        </div>
        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" type="submit" disabled={total <= 0}>
            <Receipt size={15} />
            {t.actions.newInvoice}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function RegisterPaymentModal({
  open,
  onClose,
  lang,
  t,
  invoicesRows,
  selectedInvoiceNumber,
  onRegister,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  t: typeof customerProfileText.ar;
  invoicesRows: CustomerInvoice[];
  selectedInvoiceNumber: string;
  onRegister: (invoiceNumber: string, amount: number, method: PaymentMethod) => void;
}) {
  const payable = invoicesRows.filter((invoice) => invoice.remaining > 0);
  const initial = selectedInvoiceNumber || payable[0]?.number || invoicesRows[0]?.number || "";
  const [invoiceNumber, setInvoiceNumber] = useState(initial);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const invoice = invoicesRows.find((item) => item.number === invoiceNumber);
  const maxAmount = invoice?.remaining ?? 0;

  useEffect(() => {
    if (!open) return;
    const next = selectedInvoiceNumber || invoicesRows.find((item) => item.remaining > 0)?.number || invoicesRows[0]?.number || "";
    setInvoiceNumber(next);
    setAmount("");
    setMethod("cash");
  }, [invoicesRows, open, selectedInvoiceNumber]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.actions.recordPayment} maxWidth={560}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onRegister(invoiceNumber, Math.min(Number(amount) || 0, maxAmount), method);
          onClose();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={t.invoiceTable.number}>
            <Select value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)}>
              {invoicesRows.map((item) => (
                <option key={item.number} value={item.number}>
                  #{item.number} - {money(item.remaining, t.currency)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t.payments.amount}>
          <TextInput type="number" min={1} max={maxAmount} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
        </Field>
        <Field label={t.payments.method}>
          <Select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {(Object.keys(t.paymentMethods) as PaymentMethod[]).map((item) => (
              <option key={item} value={item}>
                {t.paymentMethods[item]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2 rounded-xl border p-3" style={{ borderColor: palette.border, backgroundColor: palette.bg }}>
          <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
            <span style={{ color: palette.muted }}>{t.invoiceTable.remaining}</span>
            <strong style={{ color: "#b46a66" }}>{money(maxAmount, t.currency)}</strong>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button variant="primary" type="submit" disabled={!invoiceNumber || Number(amount) <= 0 || maxAmount <= 0}>
            <CreditCard size={15} />
            {t.actions.recordPayment}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function MeasurementsModal({
  open,
  onClose,
  lang,
  entries,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  entries: MeasurementEntry[];
  onSave: (entries: MeasurementEntry[], history: MeasurementHistoryRow) => void;
}) {
  const [values, setValues] = useState(entries.map((entry) => entry.value));
  const [garment, setGarment] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    setValues(entries.map((entry) => entry.value));
    setGarment(lang === "ar" ? "قميص رجالي" : "Chemise homme");
    setDetails(lang === "ar" ? "تحديث المقاسات بعد مراجعة الزبون" : "Mise a jour apres verification client");
  }, [entries, lang, open]);

  return (
    <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "تعديل المقاسات" : "Modifier les mesures"} maxWidth={680}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(
            entries.map((entry, index) => ({ ...entry, value: values[index] || entry.value })),
            {
              date: todayIso(),
              garment: { ar: garment || "قميص رجالي", fr: garment || "Chemise homme" },
              details: { ar: details || "تحديث المقاسات", fr: details || "Mise a jour des mesures" },
            },
          );
          onClose();
        }}
      >
        {entries.map((entry, index) => (
          <Field key={entry.label.ar} label={entry.label[lang]}>
            <TextInput value={values[index] || ""} onChange={(event) => setValues(values.map((value, valueIndex) => (valueIndex === index ? event.target.value : value)))} />
          </Field>
        ))}
        <Field label={lang === "ar" ? "نوع اللباس" : "Vetement"}>
          <TextInput value={garment} onChange={(event) => setGarment(event.target.value)} />
        </Field>
        <Field label={lang === "ar" ? "المقاسات المستخدمة" : "Mesures utilisees"}>
          <TextInput value={details} onChange={(event) => setDetails(event.target.value)} />
        </Field>
        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </Button>
          <Button variant="primary" type="submit">
            <Save size={15} />
            {lang === "ar" ? "حفظ المقاسات" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddNoteModal({
  open,
  onClose,
  lang,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  onAdd: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  return (
    <ModalShell open={open} onClose={onClose} title={lang === "ar" ? "إضافة ملاحظة" : "Ajouter une note"} maxWidth={540}>
      <form
        className="px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd(note);
          onClose();
        }}
      >
        <Field label={lang === "ar" ? "الملاحظة" : "Note"}>
          <Textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {lang === "ar" ? "إلغاء" : "Annuler"}
          </Button>
          <Button variant="primary" type="submit" disabled={!note.trim()}>
            <Plus size={15} />
            {lang === "ar" ? "إضافة" : "Ajouter"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function CustomerProfilePage() {
  const { lang, dir } = useLanguage();
  const t = customerProfileText[lang] as typeof customerProfileText.ar;
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("overview");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>(customer);
  const [orderRows, setOrderRows] = useState<CustomerOrder[]>(orders);
  const [invoiceRows, setInvoiceRows] = useState<CustomerInvoice[]>(invoices);
  const [paymentRows, setPaymentRows] = useState<CustomerPayment[]>(payments);
  const [measurementRows, setMeasurementRows] = useState<MeasurementEntry[]>(measurementEntries);
  const [measurementHistoryRows, setMeasurementHistoryRows] = useState<MeasurementHistoryRow[]>(measurementHistory);
  const [noteRows, setNoteRows] = useState<Bilingual[]>(notes);
  const [activityRows, setActivityRows] = useState<ActivityItem[]>(recentActivity);
  const [financials, setFinancials] = useState(financialSummary);
  const [orderModal, setOrderModal] = useState<OrderModalState>(null);
  const [invoiceModal, setInvoiceModal] = useState<InvoiceModalState>(null);
  const [reorderSource, setReorderSource] = useState<CustomerOrder | null>(null);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");
  const [notice, setNotice] = useState<ActionNotice | null>(null);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const pushActivity = (title: Bilingual) => {
    setActivityRows((current) => [{ title, time: { ar: "الآن", fr: "Maintenant" } }, ...current].slice(0, 5));
  };

  const showNotice = (title: Bilingual, detail: Bilingual) => {
    setNotice({ title, detail });
  };

  const openNewOrder = (source: CustomerOrder | null = null) => {
    setReorderSource(source);
    setNewOrderOpen(true);
  };

  const handleCreateOrder = (form: OrderFormValue) => {
    const quantity = Math.max(1, Number(form.quantity) || 1);
    const newOrder: CustomerOrder = {
      number: nextSerial(orderRows, "ORD"),
      date: todayIso(),
      product: productFromValue(form.product),
      quantity: quantityLabel(String(quantity)),
      price: quantity * 4900,
      status: "waiting",
      deliveryDate: form.deliveryDate || todayIso(),
    };

    setOrderRows((current) => [newOrder, ...current]);
    setProfile((current) => ({ ...current, orderCount: current.orderCount + 1, lastContact: todayIso() }));
    setTab("orders");
    pushActivity({ ar: "طلبية جديدة", fr: "Nouvelle commande" });
    showNotice(
      { ar: "تم إنشاء الطلبية", fr: "Commande creee" },
      { ar: `تمت إضافة الطلبية #${newOrder.number} إلى سجل الزبون.`, fr: `La commande #${newOrder.number} a ete ajoutee.` },
    );
  };

  const handleSaveOrder = (order: CustomerOrder) => {
    setOrderRows((current) => current.map((item) => (item.number === order.number ? order : item)));
    pushActivity({ ar: "تعديل طلبية", fr: "Commande modifiee" });
    showNotice(
      { ar: "تم تعديل الطلبية", fr: "Commande modifiee" },
      { ar: `تم حفظ التغييرات على الطلبية #${order.number}.`, fr: `Les modifications de #${order.number} sont enregistrees.` },
    );
  };

  const handleCreateInvoice = (form: InvoiceFormValue) => {
    const total = Number(form.total) || 0;
    const paid = Math.min(Number(form.paid) || 0, total);
    const remaining = Math.max(0, total - paid);
    const newInvoice: CustomerInvoice = {
      number: nextSerial(invoiceRows, "INV"),
      date: form.date || todayIso(),
      total,
      paid,
      remaining,
      status: invoiceStatusFor(total, paid),
    };

    setInvoiceRows((current) => [newInvoice, ...current]);
    if (paid > 0) {
      setPaymentRows((current) => [
        { date: todayDisplay(), amount: paid, method: "cash", reference: newInvoice.number },
        ...current,
      ]);
    }
    setFinancials((current) => {
      const totalPurchases = current.totalPurchases + total;
      const invoiceCount = current.invoiceCount + 1;
      return {
        totalPurchases,
        paidAmount: current.paidAmount + paid,
        remainingAmount: current.remainingAmount + remaining,
        invoiceCount,
        averageOrder: Math.round(totalPurchases / Math.max(1, profile.orderCount)),
      };
    });
    setTab("invoices");
    pushActivity({ ar: "فاتورة جديدة", fr: "Nouvelle facture" });
    showNotice(
      { ar: "تم إنشاء الفاتورة", fr: "Facture creee" },
      { ar: `تمت إضافة الفاتورة #${newInvoice.number}.`, fr: `La facture #${newInvoice.number} a ete ajoutee.` },
    );
  };

  const openPaymentModal = (invoice?: CustomerInvoice) => {
    setSelectedInvoiceNumber(invoice?.number ?? invoiceRows.find((item) => item.remaining > 0)?.number ?? "");
    setPaymentOpen(true);
  };

  const handleRegisterPayment = (invoiceNumber: string, amount: number, method: PaymentMethod) => {
    const invoice = invoiceRows.find((item) => item.number === invoiceNumber);
    if (!invoice || amount <= 0) return;

    const applied = Math.min(amount, invoice.remaining);
    setInvoiceRows((current) =>
      current.map((item) => {
        if (item.number !== invoiceNumber) return item;
        const paid = item.paid + applied;
        const remaining = Math.max(0, item.remaining - applied);
        return { ...item, paid, remaining, status: invoiceStatusFor(item.total, paid) };
      }),
    );
    setPaymentRows((current) => [{ date: todayDisplay(), amount: applied, method, reference: invoiceNumber }, ...current]);
    setFinancials((current) => ({
      ...current,
      paidAmount: current.paidAmount + applied,
      remainingAmount: Math.max(0, current.remainingAmount - applied),
    }));
    setTab("payments");
    pushActivity({ ar: `دفع ${applied.toLocaleString()} دج`, fr: `Paiement ${applied.toLocaleString()} DA` });
    showNotice(
      { ar: "تم تسجيل الدفعة", fr: "Paiement enregistre" },
      { ar: `تم خصم ${applied.toLocaleString()} ${t.currency} من رصيد الزبون.`, fr: `${applied.toLocaleString()} ${t.currency} ont ete enregistres.` },
    );
  };

  const handlePrintProfile = () => {
    showNotice(
      { ar: "تم تجهيز الطباعة", fr: "Impression preparee" },
      { ar: "سيتم فتح نافذة الطباعة لملف الزبون.", fr: "La fenetre d'impression de la fiche client va s'ouvrir." },
    );
    window.setTimeout(() => window.print(), 80);
  };

  const handlePrintInvoice = (invoice: CustomerInvoice) => {
    setInvoiceModal({ mode: "print", invoice });
    showNotice(
      { ar: "تم تجهيز طباعة الفاتورة", fr: "Impression facture preparee" },
      { ar: `تم اختيار الفاتورة #${invoice.number} للطباعة.`, fr: `La facture #${invoice.number} est prete pour impression.` },
    );
    window.setTimeout(() => window.print(), 80);
  };

  const handleSaveMeasurements = (entries: MeasurementEntry[], history: MeasurementHistoryRow) => {
    setMeasurementRows(entries);
    setMeasurementHistoryRows((current) => [history, ...current]);
    pushActivity({ ar: "تعديل مقاسات", fr: "Mesures modifiees" });
    showNotice(
      { ar: "تم حفظ المقاسات", fr: "Mesures enregistrees" },
      { ar: "تم تحديث مقاسات الزبون وإضافة سجل جديد.", fr: "Les mesures du client ont ete mises a jour." },
    );
  };

  const handleAddNote = (note: string) => {
    if (!note.trim()) return;
    setNoteRows((current) => [{ ar: note, fr: note }, ...current]);
    pushActivity({ ar: "ملاحظة جديدة", fr: "Nouvelle note" });
    showNotice(
      { ar: "تمت إضافة الملاحظة", fr: "Note ajoutee" },
      { ar: "ظهرت الملاحظة الجديدة في ملف الزبون.", fr: "La nouvelle note est visible dans la fiche client." },
    );
  };

  const summaryCards = [
    {
      icon: ShoppingBag,
      label: t.summary.totalPurchases,
      value: money(financials.totalPurchases, t.currency),
      hint: t.summary.totalPurchasesHint,
      color: palette.primary,
      tint: "rgba(18,60,74,0.08)",
    },
    {
      icon: Coins,
      label: t.summary.paidAmount,
      value: money(financials.paidAmount, t.currency),
      hint: t.summary.paidAmountHint,
      color: "#4d8a6a",
      tint: "rgba(77,138,106,0.12)",
    },
    {
      icon: AlertCircle,
      label: t.summary.remainingAmount,
      value: money(financials.remainingAmount, t.currency),
      hint: t.summary.remainingAmountHint,
      color: "#b46a66",
      tint: "rgba(180,106,102,0.12)",
    },
    {
      icon: FileText,
      label: t.summary.invoiceCount,
      value: financials.invoiceCount.toString(),
      hint: t.summary.invoiceCountHint,
      color: "#6b8aa0",
      tint: "rgba(107,138,160,0.12)",
    },
    {
      icon: Wallet,
      label: t.summary.averageOrder,
      value: money(financials.averageOrder, t.currency),
      hint: t.summary.averageOrderHint,
      color: "#a87d3c",
      tint: "rgba(195,154,91,0.16)",
    },
  ];

  return (
    <PageBackground>
      <AppHeader />
      <StitchDivider className="mt-6" />

      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={() => navigate("/sales")}
            className="flex shrink-0 items-center justify-center transition-colors hover:opacity-80"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              color: palette.primary,
            }}
          >
            <BackArrow size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
              {t.breadcrumb.map((item, index) => (
                <span key={item} className="flex items-center gap-1.5">
                  {index === 0 ? (
                    <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
                      {item}
                    </button>
                  ) : index === 1 ? (
                    <button type="button" onClick={() => navigate("/sales")} className="transition-colors hover:opacity-80">
                      {item}
                    </button>
                  ) : (
                    <span style={{ color: index === t.breadcrumb.length - 1 ? palette.text : palette.muted, fontWeight: index === t.breadcrumb.length - 1 ? 700 : 500 }}>
                      {item}
                    </span>
                  )}
                  {index < t.breadcrumb.length - 1 ? <CrumbChevron size={14} /> : null}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>{t.title}</h1>
              <span style={{ width: 1, height: 22, backgroundColor: palette.border }} />
              <span style={{ fontSize: 20, fontWeight: 800, color: palette.primary }}>{profile.name[lang]}</span>
            </div>
            <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 3, maxWidth: 680 }}>{t.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setEditCustomerOpen(true)}>
            <Edit size={15} />
            {t.actions.editCustomer}
          </Button>
          <Button variant="primary" onClick={() => openNewOrder()}>
            <ClipboardPlus size={15} />
            {t.actions.newOrder}
          </Button>
          <Button variant="secondary" onClick={() => setNewInvoiceOpen(true)}>
            <Receipt size={15} />
            {t.actions.newInvoice}
          </Button>
          <Button variant="secondary" onClick={handlePrintProfile}>
            <Printer size={15} />
            {t.actions.printProfile}
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/sales")}
        className="mt-4 inline-flex w-fit items-center gap-2 transition-colors hover:opacity-80"
        style={{ color: palette.primary, fontSize: 13, fontWeight: 800 }}
      >
        <BackArrow size={16} />
        {t.backToCustomers}
      </button>

      <NoticeBanner notice={notice} onClose={() => setNotice(null)} lang={lang} />

      <Panel className="mt-5" padding={24}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center">
            <Avatar name={profile.name[lang]} size={86} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>{profile.name[lang]}</h2>
                <Badge bg="rgba(77,138,106,0.12)" fg="#4d8a6a" dot="#4d8a6a">
                  {profile.status[lang]}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 lg:grid-cols-3">
                <InfoBlock label={t.profile.name} value={profile.name[lang]} />
                <InfoBlock label={t.profile.phone} value={<span style={{ direction: "ltr" }}>{profile.phone}</span>} />
                <InfoBlock label={t.profile.address} value={profile.address[lang]} />
                <InfoBlock label={t.profile.firstContact} value={<span style={{ direction: "ltr" }}>{profile.firstContact}</span>} />
                <InfoBlock label={t.profile.orderCount} value={`${profile.orderCount} ${t.profile.orderUnit}`} />
                <InfoBlock label={t.profile.lastContact} value={<span style={{ direction: "ltr" }}>{profile.lastContact}</span>} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button variant="primary" onClick={() => openNewOrder()}>
              <ClipboardPlus size={15} />
              {t.actions.quickOrder}
            </Button>
          </div>
        </div>
      </Panel>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <main className="mt-5 grid grid-cols-1 gap-5 pb-10 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <section className="min-w-0">
          <TabsNav active={tab} onChange={setTab} labels={t.tabs} />
          <div className="mt-5">
            {tab === "overview" ? (
              <OverviewTab
                lang={lang}
                t={t}
                orderRows={orderRows}
                invoiceRows={invoiceRows}
                paymentRows={paymentRows}
                measurementRows={measurementRows}
                measurementHistoryRows={measurementHistoryRows}
                noteRows={noteRows}
                onViewOrder={(order) => setOrderModal({ mode: "view", order })}
                onEditOrder={(order) => setOrderModal({ mode: "edit", order })}
                onReorder={(order) => openNewOrder(order)}
                onViewInvoice={(invoice) => setInvoiceModal({ mode: "view", invoice })}
                onPrintInvoice={handlePrintInvoice}
                onSaveMeasurements={() => setMeasurementsOpen(true)}
                onEditMeasurements={() => setMeasurementsOpen(true)}
                onAddNote={() => setNoteOpen(true)}
              />
            ) : null}
            {tab === "orders" ? (
              <OrdersTable
                lang={lang}
                t={t}
                rows={orderRows}
                onView={(order) => setOrderModal({ mode: "view", order })}
                onEdit={(order) => setOrderModal({ mode: "edit", order })}
                onReorder={(order) => openNewOrder(order)}
              />
            ) : null}
            {tab === "invoices" ? (
              <InvoicesTable
                lang={lang}
                t={t}
                rows={invoiceRows}
                onView={(invoice) => setInvoiceModal({ mode: "view", invoice })}
                onPrint={handlePrintInvoice}
              />
            ) : null}
            {tab === "payments" ? <PaymentTimeline lang={lang} t={t} items={paymentRows} /> : null}
            {tab === "measurements" ? (
              <MeasurementsSection
                lang={lang}
                t={t}
                entries={measurementRows}
                history={measurementHistoryRows}
                onSave={() => setMeasurementsOpen(true)}
                onEdit={() => setMeasurementsOpen(true)}
              />
            ) : null}
            {tab === "notes" ? <NotesSection lang={lang} t={t} items={noteRows} onAdd={() => setNoteOpen(true)} /> : null}
          </div>
        </section>

        <CustomerSidebar
          lang={lang}
          t={t}
          profile={profile}
          financials={financials}
          activityRows={activityRows}
          onNewPayment={() => openPaymentModal()}
        />
      </main>

      <NewCustomerOrderModal
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        lang={lang}
        t={t}
        profile={profile}
        initialOrder={reorderSource}
        onCreate={handleCreateOrder}
      />
      <NewInvoiceModal
        open={newInvoiceOpen}
        onClose={() => setNewInvoiceOpen(false)}
        lang={lang}
        t={t}
        profile={profile}
        onCreate={handleCreateInvoice}
      />
      <RegisterPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        lang={lang}
        t={t}
        invoicesRows={invoiceRows}
        selectedInvoiceNumber={selectedInvoiceNumber}
        onRegister={handleRegisterPayment}
      />
      <EditCustomerModal
        open={editCustomerOpen}
        onClose={() => setEditCustomerOpen(false)}
        lang={lang}
        t={t}
        profile={profile}
        onSave={(nextProfile) => {
          setProfile(nextProfile);
          pushActivity({ ar: "تعديل معلومات الزبون", fr: "Client modifie" });
          showNotice(
            { ar: "تم حفظ معلومات الزبون", fr: "Client enregistre" },
            { ar: "تم تحديث بطاقة الزبون داخل الصفحة.", fr: "La fiche client a ete mise a jour." },
          );
        }}
      />
      <OrderDetailsModal
        state={orderModal}
        onClose={() => setOrderModal(null)}
        lang={lang}
        t={t}
        onEdit={(order) => setOrderModal({ mode: "edit", order })}
        onReorder={(order) => {
          setOrderModal(null);
          openNewOrder(order);
        }}
      />
      <EditOrderModal state={orderModal} onClose={() => setOrderModal(null)} lang={lang} t={t} onSave={handleSaveOrder} />
      <InvoiceDetailsModal
        state={invoiceModal}
        onClose={() => setInvoiceModal(null)}
        lang={lang}
        t={t}
        onPrint={handlePrintInvoice}
        onPayment={(invoice) => {
          setInvoiceModal(null);
          openPaymentModal(invoice);
        }}
      />
      <MeasurementsModal
        open={measurementsOpen}
        onClose={() => setMeasurementsOpen(false)}
        lang={lang}
        entries={measurementRows}
        onSave={handleSaveMeasurements}
      />
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} lang={lang} onAdd={handleAddNote} />
    </PageBackground>
  );
}
