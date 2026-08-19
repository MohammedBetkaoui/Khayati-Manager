import {
  asRecord,
  getArrayFromPayload,
  getBoolean,
  getNumber,
  getText,
} from "../lib/api";
import { palette } from "../content";

export type Lang = "ar" | "fr";
export type Bilingual = { ar: string; fr: string };
export type OrderStatusCode =
  "NEW" | "CUTTING" | "SEWING" | "IRONING" | "READY" | "DELIVERED";
export type OrderPriorityCode = "NORMAL" | "URGENT";

export type OrderListItem = {
  id: number;
  orderNumber: string;
  customerId: number | null;
  customer: string;
  customerPhone: string;
  product: string;
  quantity: number;
  color: string;
  sizes: string;
  receivedDate: string;
  deliveryDate: string;
  responsible: string;
  statusCode: OrderStatusCode;
  priorityCode: OrderPriorityCode;
  cost: number;
  finalPrice: number;
  profit: number;
  delayed: boolean;
  notes: string;
};

export type WorkflowStep = {
  statusCode: OrderStatusCode;
  reached: boolean;
  current: boolean;
  date: string | null;
  responsible: string | null;
  comment: string | null;
};

export type AssignedWorker = {
  id: number;
  workerId: number;
  fullName: string;
  role: string;
  stageCode: OrderStatusCode;
  assignedDate: string;
  completedPieces: number;
  laborCost: number;
  notes: string | null;
};

export type UsedMaterial = {
  id: number;
  inventoryItemId: number | null;
  name: string;
  quantityUsed: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes: string | null;
};

export type OrderDetails = OrderListItem & {
  client: {
    id: number | null;
    fullName: string;
    phone: string;
    historyUrl: string | null;
  };
  productDetails: {
    type: string;
    quantity: number;
    colors: string | null;
    sizes: string | null;
    notes: string | null;
  };
  workflow: WorkflowStep[];
  workers: AssignedWorker[];
  materials: UsedMaterial[];
  costs: {
    materialCost: number;
    laborCost: number;
    totalCost: number;
    salePrice: number;
    profit: number;
  };
};

export type DashboardStats = {
  newOrders: number;
  inProduction: number;
  ready: number;
  late: number;
  monthlyCost: number;
};

export type CustomerOption = { id: number; fullName: string; phone: string };
export type WorkerOption = { id: number; fullName: string; role: string };
export type MaterialOption = {
  id: number;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
};

export const statusFlow: OrderStatusCode[] = [
  "NEW",
  "CUTTING",
  "SEWING",
  "IRONING",
  "READY",
  "DELIVERED",
];

export const statusLabels: Record<OrderStatusCode, Bilingual> = {
  NEW: { ar: "\u062c\u062f\u064a\u062f", fr: "Nouveau" },
  CUTTING: { ar: "\u0642\u0635", fr: "D\u00e9coupe" },
  SEWING: { ar: "\u062e\u064a\u0627\u0637\u0629", fr: "Couture" },
  IRONING: { ar: "\u0643\u064a", fr: "Repassage" },
  READY: { ar: "\u062c\u0627\u0647\u0632", fr: "Pr\u00eat" },
  DELIVERED: {
    ar: "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
    fr: "Livr\u00e9",
  },
};

export const statusColors: Record<OrderStatusCode, string> = {
  NEW: "#6b8aa0",
  CUTTING: "#a87d3c",
  SEWING: "#123c4a",
  IRONING: "#7f6b91",
  READY: "#4d8a6a",
  DELIVERED: "#718064",
};

export const priorityLabels: Record<OrderPriorityCode, Bilingual> = {
  NORMAL: { ar: "\u0639\u0627\u062f\u064a", fr: "Normal" },
  URGENT: { ar: "\u0645\u0633\u062a\u0639\u062c\u0644", fr: "Urgent" },
};

export const productOptions: Array<{ value: string; label: Bilingual }> = [
  {
    value: "\u0642\u0645\u064a\u0635",
    label: { ar: "\u0642\u0645\u064a\u0635", fr: "Chemise" },
  },
  {
    value: "\u0633\u0631\u0648\u0627\u0644",
    label: { ar: "\u0633\u0631\u0648\u0627\u0644", fr: "Pantalon" },
  },
  {
    value: "\u0641\u0633\u062a\u0627\u0646",
    label: { ar: "\u0641\u0633\u062a\u0627\u0646", fr: "Robe" },
  },
  {
    value: "\u0632\u064a \u0645\u062f\u0631\u0633\u064a",
    label: {
      ar: "\u0632\u064a \u0645\u062f\u0631\u0633\u064a",
      fr: "Uniforme scolaire",
    },
  },
  {
    value: "\u0644\u0628\u0627\u0633 \u0639\u0645\u0644",
    label: {
      ar: "\u0644\u0628\u0627\u0633 \u0639\u0645\u0644",
      fr: "V\u00eatement de travail",
    },
  },
];

export const productionText = {
  ar: {
    home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
    breadcrumb:
      "\u0627\u0644\u0625\u0646\u062a\u0627\u062c \u0648\u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a",
    title:
      "\u062a\u0633\u064a\u064a\u0631 \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u0648\u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a",
    subtitle:
      "\u0645\u062a\u0627\u0628\u0639\u0629 \u0637\u0644\u0628\u064a\u0627\u062a \u0627\u0644\u0632\u0628\u0627\u0626\u0646\u060c \u0645\u0631\u0627\u062d\u0644 \u0627\u0644\u062a\u0635\u0646\u064a\u0639\u060c \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0645\u0633\u062a\u0639\u0645\u0644\u0629 \u0648\u0627\u0644\u062a\u0643\u0627\u0644\u064a\u0641.",
    cards: {
      new: "\u0637\u0644\u0628\u064a\u0627\u062a \u062c\u062f\u064a\u062f\u0629",
      production:
        "\u0642\u064a\u062f \u0627\u0644\u0625\u0646\u062a\u0627\u062c",
      ready:
        "\u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u0633\u0644\u064a\u0645",
      late: "\u0637\u0644\u0628\u064a\u0627\u062a \u0645\u062a\u0623\u062e\u0631\u0629",
      cost: "\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631",
    },
    filters: {
      search:
        "\u0627\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628\u064a\u0629\u060c \u0627\u0644\u0632\u0628\u0648\u0646 \u0623\u0648 \u0627\u0644\u0645\u0646\u062a\u062c...",
      allStatus: "\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a",
      allPriority:
        "\u0643\u0644 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0627\u062a",
      deliveryDate:
        "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
      reset: "\u0645\u0633\u062d \u0627\u0644\u0641\u0644\u0627\u062a\u0631",
      add: "\u0637\u0644\u0628\u064a\u0629 \u062c\u062f\u064a\u062f\u0629",
    },
    listTitle:
      "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0637\u0644\u0628\u064a\u0627\u062a",
    listHint:
      "\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0648\u062d\u062f\u0629 \u0645\u0646 \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
    empty:
      "\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u064a\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629.",
    columns: {
      number: "\u0627\u0644\u0631\u0642\u0645",
      customer: "\u0627\u0644\u0632\u0628\u0648\u0646",
      product: "\u0627\u0644\u0645\u0646\u062a\u062c",
      quantity: "\u0627\u0644\u0643\u0645\u064a\u0629",
      color: "\u0627\u0644\u0644\u0648\u0646",
      received: "\u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645",
      delivery: "\u0627\u0644\u062a\u0633\u0644\u064a\u0645",
      responsible: "\u0627\u0644\u0645\u0633\u0624\u0648\u0644",
      status: "\u0627\u0644\u062d\u0627\u0644\u0629",
      cost: "\u0627\u0644\u062a\u0643\u0644\u0641\u0629",
      actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
    },
    actions: {
      view: "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
      edit: "\u062a\u0639\u062f\u064a\u0644",
      status:
        "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u062d\u0627\u0644\u0629",
      delete: "\u062d\u0630\u0641",
      confirmDelete:
        "\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0637\u0644\u0628\u064a\u0629\u061f",
    },
    currency: "\u062f.\u062c",
  },
  fr: {
    home: "Accueil",
    breadcrumb: "Production et commandes",
    title: "Gestion de la production et des commandes",
    subtitle:
      "Suivi des commandes clients, \u00e9tapes de fabrication, ressources utilis\u00e9es et co\u00fbts.",
    cards: {
      new: "Nouvelles commandes",
      production: "En production",
      ready: "Pr\u00eates \u00e0 livrer",
      late: "Commandes en retard",
      cost: "Co\u00fbt production ce mois",
    },
    filters: {
      search: "Rechercher par num\u00e9ro, client ou produit...",
      allStatus: "Tous les \u00e9tats",
      allPriority: "Toutes les priorit\u00e9s",
      deliveryDate: "Date de livraison",
      reset: "R\u00e9initialiser",
      add: "Nouvelle commande",
    },
    listTitle: "Liste des commandes",
    listHint: "Pilotage unifi\u00e9 de la r\u00e9ception \u00e0 la livraison",
    empty: "Aucune commande ne correspond aux filtres.",
    columns: {
      number: "Num\u00e9ro",
      customer: "Client",
      product: "Produit",
      quantity: "Quantit\u00e9",
      color: "Couleur",
      received: "R\u00e9ception",
      delivery: "Livraison",
      responsible: "Responsable",
      status: "\u00c9tat",
      cost: "Co\u00fbt",
      actions: "Actions",
    },
    actions: {
      view: "Voir les d\u00e9tails",
      edit: "Modifier",
      status: "Changer l'\u00e9tat",
      delete: "Supprimer",
      confirmDelete: "Supprimer cette commande ?",
    },
    currency: "DA",
  },
} as const;

const statusAliases: Record<string, OrderStatusCode> = {
  NEW: "NEW",
  CUTTING: "CUTTING",
  SEWING: "SEWING",
  IRONING: "IRONING",
  READY: "READY",
  DELIVERED: "DELIVERED",
};

export function mapOrder(raw: unknown): OrderListItem {
  const record = asRecord(raw);
  const statusCode =
    statusAliases[getText(record?.statusCode) || getText(record?.stage)] ??
    "NEW";
  const priorityCode =
    getText(record?.priorityCode) === "URGENT" ? "URGENT" : "NORMAL";
  return {
    id: getNumber(record?.id),
    orderNumber: getText(record?.orderNumber) || getText(record?.number) || "-",
    customerId:
      record?.customerId == null ? null : getNumber(record.customerId),
    customer: getText(record?.customer) || getText(record?.customerName) || "-",
    customerPhone: getText(record?.customerPhone) || getText(record?.phone),
    product: getText(record?.product) || getText(record?.productType) || "-",
    quantity: getNumber(record?.quantity),
    color: getText(record?.color) || getText(record?.colors) || "-",
    sizes: getText(record?.sizes),
    receivedDate: getText(record?.receivedDate),
    deliveryDate: getText(record?.deliveryDate),
    responsible: getText(record?.responsible) || "-",
    statusCode,
    priorityCode,
    cost: getNumber(record?.cost ?? record?.estimatedCost),
    finalPrice: getNumber(record?.finalPrice),
    profit: getNumber(record?.profit),
    delayed: getBoolean(record?.delayed),
    notes: getText(record?.notes),
  };
}

export function mapDashboard(raw: unknown): DashboardStats {
  const record = asRecord(raw);
  return {
    newOrders: getNumber(record?.newOrders),
    inProduction: getNumber(record?.inProduction),
    ready: getNumber(record?.ready),
    late: getNumber(record?.late),
    monthlyCost: getNumber(record?.monthlyCost),
  };
}

export function mapOrderDetails(raw: unknown): OrderDetails {
  const record = asRecord(raw);
  const base = mapOrder(raw);
  const client = asRecord(record?.client);
  const product = asRecord(record?.productDetails);
  const costs = asRecord(record?.costs);

  return {
    ...base,
    client: {
      id: client?.id == null ? null : getNumber(client.id),
      fullName: getText(client?.fullName) || base.customer,
      phone: getText(client?.phone) || base.customerPhone,
      historyUrl: getText(client?.historyUrl) || null,
    },
    productDetails: {
      type: getText(product?.type) || base.product,
      quantity: getNumber(product?.quantity, base.quantity),
      colors: getText(product?.colors) || null,
      sizes: getText(product?.sizes) || null,
      notes: getText(product?.notes) || null,
    },
    workflow: getArrayFromPayload(record?.workflow).map((item) => {
      const row = asRecord(item);
      return {
        statusCode: statusAliases[getText(row?.statusCode)] ?? "NEW",
        reached: getBoolean(row?.reached),
        current: getBoolean(row?.current),
        date: getText(row?.date) || null,
        responsible: getText(row?.responsible) || null,
        comment: getText(row?.comment) || null,
      };
    }),
    workers: getArrayFromPayload(record?.workers).map((item) => {
      const row = asRecord(item);
      return {
        id: getNumber(row?.id),
        workerId: getNumber(row?.workerId),
        fullName: getText(row?.fullName),
        role: getText(row?.role),
        stageCode: statusAliases[getText(row?.stageCode)] ?? "NEW",
        assignedDate: getText(row?.assignedDate),
        completedPieces: getNumber(row?.completedPieces),
        laborCost: getNumber(row?.laborCost),
        notes: getText(row?.notes) || null,
      };
    }),
    materials: getArrayFromPayload(record?.materials).map((item) => {
      const row = asRecord(item);
      return {
        id: getNumber(row?.id),
        inventoryItemId:
          row?.inventoryItemId == null ? null : getNumber(row.inventoryItemId),
        name: getText(row?.name),
        quantityUsed: getNumber(row?.quantityUsed),
        unit: getText(row?.unit),
        unitCost: getNumber(row?.unitCost),
        totalCost: getNumber(row?.totalCost),
        notes: getText(row?.notes) || null,
      };
    }),
    costs: {
      materialCost: getNumber(costs?.materialCost),
      laborCost: getNumber(costs?.laborCost),
      totalCost: getNumber(costs?.totalCost),
      salePrice: getNumber(costs?.salePrice),
      profit: getNumber(costs?.profit),
    },
  };
}

export { palette };
