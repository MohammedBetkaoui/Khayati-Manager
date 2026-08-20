export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiCustomer = {
  id: number;
  fullName: string;
  phone: string;
  secondPhone: string | null;
  address: string | null;
  email: string | null;
  city: string | null;
  wilaya: string | null;
  type: string;
  typeCode: "REGULAR" | "NEW" | "VIP" | "OCCASIONAL";
  status: string;
  statusCode: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  firstVisitDate: string;
  lastVisitDate: string;
  lastVisit: string;
  totalPurchases: number;
  totalPaid: number;
  totalDebt: number;
  salesCount: number;
  totalSales: number;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiPayment = {
  id: number;
  customerId: number;
  invoiceId?: number;
  invoiceNumber?: string;
  amount: number;
  paymentMethod: string;
  paymentMethodCode: "CASH" | "TRANSFER" | "OTHER" | "PARTIAL";
  method: string;
  date: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};

export type ApiInvoiceItem = {
  id: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  productSku: string | null;
  variant: string | null;
  description: string;
  productType: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type ApiInvoice = {
  id: number;
  invoiceNumber: string;
  number: string;
  customerId: number;
  customer: string;
  customerName: string;
  customerPhone: string;
  date: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  totalAmount: number;
  total: number;
  paidAmount: number;
  paid: number;
  remainingAmount: number;
  remaining: number;
  paymentStatus: string;
  paymentStatusCode: "PAID" | "PARTIAL" | "UNPAID";
  statusCode: "PAID" | "PARTIAL" | "UNPAID";
  status: "PAID" | "PARTIAL" | "UNPAID";
  notes: string | null;
  items: ApiInvoiceItem[];
  payments: ApiPayment[];
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: number;
  sku: string;
  size: string | null;
  color: string | null;
  label: string;
  quantityProduced: number;
  quantityAvailable: number;
  quantitySold: number;
  salePrice: number;
  active: boolean;
};

export type FinishedProduct = {
  id: number;
  name: string;
  sku: string;
  reference: string;
  category: string;
  categoryCode: string;
  description: string | null;
  imageUrl: string | null;
  creationDate: string;
  salePrice: number;
  estimatedProductionCost: number;
  quantityProduced: number;
  quantityAvailable: number;
  quantitySold: number;
  minStockAlert: number;
  status: string;
  statusCode: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  availability: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";
  notes: string | null;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type RawMaterial = {
  id: number;
  name: string;
  reference: string | null;
  category: string;
  type: string | null;
  color: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  supplier: string | null;
  supplierId: number | null;
  minStockAlert: number;
  location: string | null;
  status: string;
  description: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
  statusCode: "ACTIVE" | "INACTIVE" | "ARCHIVED" | string;
  totalPurchases: number;
  totalPaid: number;
  totalDebt: number;
  debt: number;
  lastPurchaseDate: string | null;
  lastPurchase: string | null;
  notes: string | null;
  archivedAt: string | null;
};

export type MaterialPurchase = {
  id: number;
  supplierId: number;
  supplier: string;
  inventoryItemId: number | null;
  materialName: string;
  name: string;
  color: string | null;
  quantityPurchased: number;
  quantity: number;
  unit: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  remaining: number;
  paymentStatus: string;
  status: string;
  purchaseDate: string;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
