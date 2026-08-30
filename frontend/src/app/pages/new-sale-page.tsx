import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { CustomerFormModal } from "../components/customer-form-modal";
import {
  PageHeading,
  StatePanel,
  formatDate,
  formatMoney,
} from "../components/commerce-ui";
import { Badge, Button, Field, Select, TextInput } from "../components/kit";
import { ModalShell, Textarea } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type {
  ApiCustomer,
  FinishedProduct,
  ProductVariant,
  WorkshopSettings,
} from "../lib/commerce";

type CartLine = {
  key: string;
  productId: number;
  variantId: number;
  productName: string;
  productSku: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  maxQuantity: number;
};

function ProductCard({
  product,
  lang,
  onAdd,
}: {
  product: FinishedProduct;
  lang: "ar" | "fr";
  onAdd: (product: FinishedProduct, variant: ProductVariant) => void;
}) {
  const variants = product.variants.filter(
    (variant) => variant.active && variant.quantityAvailable > 0,
  );
  const [variantId, setVariantId] = useState(
    variants[0] ? String(variants[0].id) : "",
  );
  const selected =
    variants.find((variant) => variant.id === Number(variantId)) ?? variants[0];

  return (
    <article
      className="flex flex-col rounded-2xl border p-4"
      style={{ borderColor: palette.border, backgroundColor: palette.surface }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(145deg, rgba(18,60,74,0.09), rgba(195,154,91,0.15))",
            color: palette.primary,
          }}
        >
          <PackageSearch size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate" style={{ fontSize: 14, fontWeight: 900 }}>
            {product.name}
          </h3>
          <div
            className="mt-0.5 truncate"
            style={{ fontSize: 11.5, color: palette.muted }}
          >
            {product.sku} · {product.category}
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, color: palette.primary }}>
          {formatMoney(product.salePrice, lang)}
        </div>
      </div>
      <div className="mt-4">
        <Select
          value={selected ? String(selected.id) : ""}
          onChange={(event) => setVariantId(event.target.value)}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label} · {variant.quantityAvailable}{" "}
              {lang === "ar" ? "متوفر" : "disponibles"}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Badge bg="rgba(77,138,106,0.11)" fg="#4d8a6a">
          {selected?.quantityAvailable ?? 0} {lang === "ar" ? "قطعة" : "pièces"}
        </Badge>
        <Button
          variant="primary"
          disabled={!selected}
          onClick={() => selected && onAdd(product, selected)}
        >
          <Plus size={15} /> {lang === "ar" ? "إضافة" : "Ajouter"}
        </Button>
      </div>
    </article>
  );
}

export function NewSalePage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerFromUrl = searchParams.get("customerId");
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customerFromUrl ?? "",
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const deferredCustomerSearch = useDeferredValue(customerSearch);
  const [productSearch, setProductSearch] = useState("");
  const deferredProductSearch = useDeferredValue(productSearch);
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [useCustomerCredit, setUseCustomerCredit] = useState(false);
  const [customerCreditAmount, setCustomerCreditAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [overpaymentConfirmOpen, setOverpaymentConfirmOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [customerList, productList, workshopSettings] = await Promise.all(
          [
            fetchJson<{ data: ApiCustomer[] }>(
              "/sales/customers?limit=100&status=ACTIVE",
              { signal: controller.signal },
            ),
            fetchJson<{ data: FinishedProduct[] }>(
              "/inventory/products?limit=100&status=ACTIVE&available=true",
              { signal: controller.signal },
            ),
            fetchJson<WorkshopSettings>("/settings/workshop", {
              signal: controller.signal,
            }),
          ],
        );
        setCustomers(customerList.data);
        setProducts(productList.data);
        setTaxEnabled(workshopSettings.defaultTaxEnabled);
        setTaxRate(String(workshopSettings.defaultTaxRate ?? 0));
        if (
          customerFromUrl &&
          customerList.data.some(
            (customer) => customer.id === Number(customerFromUrl),
          )
        )
          setSelectedCustomerId(customerFromUrl);
      } catch (caught) {
        if (!controller.signal.aborted)
          setLoadError(
            caught instanceof Error ? caught.message : "Unable to prepare sale",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [customerFromUrl]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === Number(selectedCustomerId),
  );
  useEffect(() => {
    setUseCustomerCredit(false);
    setCustomerCreditAmount("0");
  }, [selectedCustomerId]);
  const matchingCustomers = customers.filter(
    (customer) =>
      !deferredCustomerSearch.trim() ||
      `${customer.fullName} ${customer.phone}`
        .toLocaleLowerCase()
        .includes(deferredCustomerSearch.trim().toLocaleLowerCase()),
  );
  const matchingProducts = products.filter((product) => {
    const matchesSearch =
      !deferredProductSearch.trim() ||
      `${product.name} ${product.sku}`
        .toLocaleLowerCase()
        .includes(deferredProductSearch.trim().toLocaleLowerCase());
    return (
      matchesSearch &&
      (!category || product.categoryCode === category) &&
      product.quantityAvailable > 0
    );
  });

  const subtotal = cart.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const numericDiscount = Math.max(0, Number(discount) || 0);
  const amountAfterDiscount = Math.max(0, subtotal - numericDiscount);
  const numericTaxRate = Math.min(100, Math.max(0, Number(taxRate) || 0));
  const taxAmount = roundMoney(
    taxEnabled ? (amountAfterDiscount * numericTaxRate) / 100 : 0,
  );
  const total = roundMoney(amountAfterDiscount + taxAmount);
  const numericPaid = Math.max(0, Number(paidAmount) || 0);
  const availableCredit = Math.max(0, selectedCustomer?.availableCredit ?? 0);
  const numericCredit = useCustomerCredit
    ? Math.min(
        availableCredit,
        total,
        Math.max(0, Number(customerCreditAmount) || 0),
      )
    : 0;
  const remainingAfterCredit = Math.max(0, total - numericCredit);
  const overpaymentAmount = Math.max(0, numericPaid - remainingAfterCredit);
  const remaining = Math.max(0, remainingAfterCredit - numericPaid);
  function addToCart(product: FinishedProduct, variant: ProductVariant) {
    setError(null);
    setCart((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (existing) {
        if (existing.quantity >= variant.quantityAvailable) {
          setError(
            lang === "ar"
              ? "لا يمكن تجاوز الكمية المتوفرة في المخزون."
              : "La quantité ne peut pas dépasser le stock disponible.",
          );
          return current;
        }
        return current.map((line) =>
          line.variantId === variant.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        {
          key: `${product.id}-${variant.id}`,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          productSku: product.sku,
          variantLabel: variant.label,
          quantity: 1,
          unitPrice: variant.salePrice,
          maxQuantity: variant.quantityAvailable,
        },
      ];
    });
  }

  function updateQuantity(key: string, quantity: number) {
    setCart((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              quantity: Math.max(1, Math.min(line.maxQuantity, quantity || 1)),
            }
          : line,
      ),
    );
  }

  async function submitSale(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!selectedCustomer) {
      setError(
        lang === "ar"
          ? "اختر زبونا قبل تأكيد البيع."
          : "Sélectionnez un client avant de valider la vente.",
      );
      return;
    }
    if (!cart.length) {
      setError(
        lang === "ar"
          ? "أضف منتجا واحدا على الأقل إلى السلة."
          : "Ajoutez au moins un produit au panier.",
      );
      return;
    }
    if (numericDiscount > subtotal) {
      setError(
        lang === "ar"
          ? "لا يمكن أن يتجاوز التخفيض المبلغ الإجمالي."
          : "La remise ne peut pas dépasser le sous-total.",
      );
      return;
    }
    if (taxEnabled && (numericTaxRate < 0 || numericTaxRate > 100)) {
      setError(
        lang === "ar"
          ? "نسبة الضريبة يجب أن تكون بين 0 و100."
          : "Le taux de taxe doit être compris entre 0 et 100.",
      );
      return;
    }

    if (overpaymentAmount > 0) {
      setOverpaymentConfirmOpen(true);
      return;
    }
    await persistSale(false);
  }

  async function persistSale(confirmOverpayment: boolean) {
    if (!selectedCustomer || saving) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/sales/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          items: cart.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
          discount: numericDiscount,
          taxEnabled,
          taxRate: taxEnabled ? numericTaxRate : undefined,
          paidAmount: numericPaid,
          customerCreditAmount: numericCredit,
          confirmOverpayment,
          paymentMethod: numericPaid > 0 ? paymentMethod : undefined,
          paymentReference:
            numericPaid > 0 && paymentReference.trim()
              ? paymentReference.trim()
              : undefined,
          dueDate: remaining > 0 && dueDate ? dueDate : undefined,
          notes: notes || undefined,
        }),
      });
      setOverpaymentConfirmOpen(false);
      navigate("/sales?created=1");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create sale",
      );
    } finally {
      setSaving(false);
    }
  }

  const text =
    lang === "ar"
      ? {
          title: "بيع جديد",
          subtitle:
            "اختر الزبون والمنتجات المتوفرة، ثم سجّل الدفع. يتم تحديث المخزون والديون آليا.",
          customer: "1. اختيار الزبون",
          products: "2. اختيار المنتجات",
          cart: "3. سلة البيع",
          searchCustomer: "البحث بالاسم أو الهاتف...",
          addCustomer: "زبون جديد",
          selectCustomer: "اختر زبونا",
          currentDebt: "الدين الحالي",
          lastSale: "آخر شراء",
          searchProduct: "البحث بالاسم أو المرجع...",
          emptyProducts: "لا توجد منتجات متوفرة",
          product: "المنتج",
          quantity: "الكمية",
          price: "سعر الوحدة",
          lineTotal: "المجموع",
          subtotal: "المجموع الفرعي",
          discount: "التخفيض",
          tax: "الضريبة",
          taxRate: "نسبة الضريبة",
          total: "الإجمالي النهائي",
          paid: "المبلغ المدفوع",
          remaining: "المتبقي",
          method: "طريقة الدفع",
          due: "تاريخ الاستحقاق",
          notes: "ملاحظات",
          validate: "تسجيل البيع",
          emptyCart: "السلة فارغة. أضف منتجات من القائمة.",
        }
      : {
          title: "Nouvelle vente",
          subtitle:
            "Sélectionnez le client et les produits disponibles, puis saisissez le paiement. Stock et créance seront mis à jour automatiquement.",
          customer: "1. Sélection du client",
          products: "2. Sélection des produits",
          cart: "3. Panier de vente",
          searchCustomer: "Rechercher par nom ou téléphone...",
          addCustomer: "Nouveau client",
          selectCustomer: "Sélectionner un client",
          currentDebt: "Créance actuelle",
          lastSale: "Dernier achat",
          searchProduct: "Rechercher par nom ou référence...",
          emptyProducts: "Aucun produit disponible",
          product: "Produit",
          quantity: "Quantité",
          price: "Prix unitaire",
          lineTotal: "Sous-total",
          subtotal: "Sous-total",
          discount: "Remise",
          tax: "Taxe",
          taxRate: "Taux de taxe",
          total: "Total final",
          paid: "Montant payé",
          remaining: "Reste à payer",
          method: "Mode de paiement",
          due: "Échéance",
          notes: "Notes",
          validate: "Enregistrer la vente",
          emptyCart:
            "Le panier est vide. Ajoutez des produits depuis le catalogue.",
        };

  return (
    <PageBackground>
      <PageHeading
        title={text.title}
        subtitle={text.subtitle}
        backTo="/sales"
      />
      <div className="mt-6">
        <StatePanel
          loading={loading}
          error={loading ? null : loadError}
          empty={false}
          emptyTitle=""
        />
      </div>
      {!loading && !loadError ? (
        <form
          onSubmit={submitSale}
          className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.8fr)]"
        >
          <div className="flex min-w-0 flex-col gap-5">
            <section
              style={{
                backgroundColor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 22,
                padding: 20,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserRound size={19} style={{ color: palette.primary }} />
                  <h2 style={{ fontSize: 16, fontWeight: 900 }}>
                    {text.customer}
                  </h2>
                </div>
                <Button onClick={() => setCustomerModal(true)}>
                  <UserPlus size={16} /> {text.addCustomer}
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ insetInlineStart: 13, color: palette.muted }}
                  />
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder={text.searchCustomer}
                    className="h-10 w-full rounded-xl border outline-none"
                    style={{
                      borderColor: palette.border,
                      paddingInlineStart: 40,
                      paddingInlineEnd: 12,
                      fontSize: 13.5,
                    }}
                  />
                </div>
                <Select
                  value={selectedCustomerId}
                  onChange={(event) =>
                    setSelectedCustomerId(event.target.value)
                  }
                >
                  <option value="">{text.selectCustomer}</option>
                  {matchingCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName} · {customer.phone}
                    </option>
                  ))}
                </Select>
              </div>
              {selectedCustomer ? (
                <div
                  className="mt-4 grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 xl:grid-cols-4"
                  style={{
                    background:
                      "linear-gradient(120deg, rgba(18,60,74,0.07), rgba(195,154,91,0.1))",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, color: palette.muted }}>
                      {lang === "ar" ? "الزبون" : "Client"}
                    </div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 14, fontWeight: 900 }}
                    >
                      {selectedCustomer.fullName}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        direction: "ltr",
                        textAlign: "start",
                      }}
                    >
                      {selectedCustomer.phone}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: palette.muted }}>
                      {text.currentDebt}
                    </div>
                    <div
                      className="mt-1"
                      style={{
                        fontSize: 17,
                        fontWeight: 900,
                        color:
                          selectedCustomer.totalDebt > 0
                            ? "#b46a66"
                            : "#4d8a6a",
                      }}
                    >
                      {formatMoney(selectedCustomer.totalDebt, lang)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: palette.muted }}>
                      {text.lastSale}
                    </div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 14, fontWeight: 800 }}
                    >
                      {formatDate(selectedCustomer.lastVisitDate, lang)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: palette.muted }}>
                      {lang === "ar" ? "الرصيد المتاح" : "Crédit disponible"}
                    </div>
                    <div
                      className="mt-1"
                      style={{ fontSize: 17, fontWeight: 900, color: "#4d8a6a" }}
                    >
                      {formatMoney(availableCredit, lang)}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section
              style={{
                backgroundColor: palette.surface,
                border: `1px solid ${palette.border}`,
                borderRadius: 22,
                padding: 20,
              }}
            >
              <div className="flex items-center gap-2">
                <PackageSearch size={19} style={{ color: palette.primary }} />
                <h2 style={{ fontSize: 16, fontWeight: 900 }}>
                  {text.products}
                </h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <Search
                    size={16}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ insetInlineStart: 13, color: palette.muted }}
                  />
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder={text.searchProduct}
                    className="h-10 w-full rounded-xl border outline-none"
                    style={{
                      borderColor: palette.border,
                      paddingInlineStart: 40,
                      paddingInlineEnd: 12,
                      fontSize: 13.5,
                    }}
                  />
                </div>
                <div className="min-w-[190px]">
                  <Select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">
                      {lang === "ar" ? "كل التصنيفات" : "Toutes les catégories"}
                    </option>
                    {[
                      ["DRESS", "فستان", "Robe"],
                      ["PANTS", "سروال", "Pantalon"],
                      ["SHIRT", "قميص", "Chemise"],
                      ["SET", "طقم", "Ensemble"],
                      ["TRADITIONAL", "لباس تقليدي", "Traditionnel"],
                      ["UNIFORM", "زي موحد", "Uniforme"],
                      ["OTHER", "أخرى", "Autre"],
                    ].map(([value, ar, fr]) => (
                      <option key={value} value={value}>
                        {lang === "ar" ? ar : fr}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {matchingProducts.length ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {matchingProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      lang={lang}
                      onAdd={addToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4">
                  <StatePanel
                    empty
                    emptyTitle={text.emptyProducts}
                    emptyDescription={
                      lang === "ar"
                        ? "أنشئ إنتاجا جديدا أو غيّر البحث."
                        : "Enregistrez une production ou modifiez la recherche."
                    }
                  />
                </div>
              )}
            </section>
          </div>

          <aside
            className="h-fit xl:sticky xl:top-5"
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 22,
              padding: 20,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={19} style={{ color: palette.primary }} />
                <h2 style={{ fontSize: 16, fontWeight: 900 }}>{text.cart}</h2>
              </div>
              <Badge bg="rgba(18,60,74,0.08)" fg={palette.primary}>
                {cart.reduce((sum, line) => sum + line.quantity, 0)}
              </Badge>
            </div>
            {cart.length ? (
              <div className="mt-4 flex max-h-[360px] flex-col gap-3 overflow-auto pe-1">
                {cart.map((line) => (
                  <div
                    key={line.key}
                    className="rounded-2xl border p-3"
                    style={{ borderColor: palette.border }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className="truncate"
                          style={{ fontSize: 13.5, fontWeight: 900 }}
                        >
                          {line.productName}
                        </div>
                        <div
                          className="truncate"
                          style={{ fontSize: 11.5, color: palette.muted }}
                        >
                          {line.variantLabel} · {line.productSku}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() =>
                          setCart((current) =>
                            current.filter((item) => item.key !== line.key),
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          color: "#b46a66",
                          backgroundColor: "rgba(201,138,134,0.1)",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                      <div
                        className="flex items-center justify-between rounded-xl border"
                        style={{ borderColor: palette.border }}
                      >
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateQuantity(line.key, line.quantity - 1)
                          }
                          className="flex h-9 w-8 items-center justify-center"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          aria-label={text.quantity}
                          type="number"
                          min="1"
                          max={line.maxQuantity}
                          value={line.quantity}
                          onChange={(event) =>
                            updateQuantity(line.key, Number(event.target.value))
                          }
                          className="w-10 bg-transparent text-center text-sm font-bold outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateQuantity(line.key, line.quantity + 1)
                          }
                          className="flex h-9 w-8 items-center justify-center"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <TextInput
                        aria-label={text.price}
                        min="0"
                        type="number"
                        value={line.unitPrice}
                        onChange={(event) =>
                          setCart((current) =>
                            current.map((item) =>
                              item.key === line.key
                                ? {
                                    ...item,
                                    unitPrice: Math.max(
                                      0,
                                      Number(event.target.value),
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div
                      className="mt-2 text-end"
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: palette.primary,
                      }}
                    >
                      {formatMoney(line.quantity * line.unitPrice, lang)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="mt-4 flex min-h-32 items-center justify-center rounded-2xl border border-dashed px-5 text-center"
                style={{
                  borderColor: palette.borderStrong,
                  color: palette.muted,
                  fontSize: 13,
                }}
              >
                {text.emptyCart}
              </div>
            )}

            <div
              className="mt-5 flex flex-col gap-3"
              style={{
                borderTop: `1px solid ${palette.border}`,
                paddingTop: 16,
              }}
            >
              <SummaryLine
                label={text.subtotal}
                value={formatMoney(subtotal, lang)}
              />
              <div className="grid grid-cols-2 items-center gap-3">
                <label style={{ fontSize: 13, color: palette.muted }}>
                  {text.discount}
                </label>
                <TextInput
                  aria-label={text.discount}
                  min="0"
                  max={subtotal}
                  type="number"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  style={{ textAlign: "end" }}
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-3">
                <label
                  className="flex items-center gap-2"
                  style={{ fontSize: 13, color: palette.muted }}
                >
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(event) => setTaxEnabled(event.target.checked)}
                    className="h-4 w-4 accent-[var(--app-primary)]"
                  />
                  {text.tax}
                </label>
                <TextInput
                  aria-label={text.taxRate}
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  value={taxRate}
                  disabled={!taxEnabled}
                  onChange={(event) => setTaxRate(event.target.value)}
                  style={{ textAlign: "end" }}
                />
              </div>
              <SummaryLine
                label={`${text.tax}${taxEnabled ? ` (${numericTaxRate}%)` : ""}`}
                value={formatMoney(taxAmount, lang)}
              />
              <SummaryLine
                label={text.total}
                value={formatMoney(total, lang)}
                strong
              />
              {availableCredit > 0 ? (
                <div
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: "rgba(77,138,106,0.25)",
                    backgroundColor: "rgba(77,138,106,0.08)",
                  }}
                >
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold">
                    <span>
                      {lang === "ar"
                        ? `رصيد متاح: ${formatMoney(availableCredit, lang)}`
                        : `Crédit disponible : ${formatMoney(availableCredit, lang)}`}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {lang === "ar" ? "استخدام الرصيد" : "Utiliser le crédit"}
                      <input
                        type="checkbox"
                        checked={useCustomerCredit}
                        onChange={(event) => {
                          setUseCustomerCredit(event.target.checked);
                          if (!event.target.checked) setCustomerCreditAmount("0");
                        }}
                      />
                    </span>
                  </label>
                  {useCustomerCredit ? (
                    <div className="mt-3 grid grid-cols-2 items-center gap-3">
                      <span style={{ color: palette.muted, fontSize: 12.5 }}>
                        {lang === "ar" ? "المبلغ المراد استخدامه" : "Montant à utiliser"}
                      </span>
                      <TextInput
                        aria-label={lang === "ar" ? "مبلغ الرصيد المستخدم" : "Crédit utilisé"}
                        min="0"
                        max={Math.min(availableCredit, total)}
                        step="0.01"
                        type="number"
                        value={customerCreditAmount}
                        onChange={(event) => setCustomerCreditAmount(event.target.value)}
                        style={{ textAlign: "end" }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {numericCredit > 0 ? (
                <SummaryLine
                  label={lang === "ar" ? "الرصيد المستخدم" : "Crédit utilisé"}
                  value={`- ${formatMoney(numericCredit, lang)}`}
                />
              ) : null}
              <div className="grid grid-cols-2 items-center gap-3">
                <label style={{ fontSize: 13, color: palette.muted }}>
                  {text.paid}
                </label>
                <TextInput
                  aria-label={text.paid}
                  min="0"
                  step="0.01"
                  type="number"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  style={{ textAlign: "end" }}
                />
              </div>
              <SummaryLine
                label={text.remaining}
                value={formatMoney(remaining, lang)}
                danger={remaining > 0}
              />
              {overpaymentAmount > 0 ? (
                <SummaryLine
                  label={lang === "ar" ? "مبلغ زائد سيصبح رصيداً" : "Excédent transformé en crédit"}
                  value={formatMoney(overpaymentAmount, lang)}
                />
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label={text.method}>
                <Select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  disabled={numericPaid <= 0}
                >
                  <option value="CASH">
                    {lang === "ar" ? "نقدا" : "Espèces"}
                  </option>
                  <option value="TRANSFER">
                    {lang === "ar" ? "تحويل" : "Virement"}
                  </option>
                  <option value="OTHER">
                    {lang === "ar" ? "أخرى" : "Autre"}
                  </option>
                </Select>
              </Field>
              {numericPaid > 0 ? (
                <Field
                  label={lang === "ar" ? "مرجع الدفع" : "Référence du paiement"}
                >
                  <TextInput
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                    placeholder={lang === "ar" ? "اختياري" : "Facultatif"}
                  />
                </Field>
              ) : null}
              {remaining > 0 ? (
                <Field label={text.due}>
                  <TextInput
                    aria-label={text.due}
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field label={text.notes}>
                <Textarea
                  aria-label={text.notes}
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </div>
            {error ? (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-sm"
                style={{
                  color: "#a94f4a",
                  backgroundColor: "rgba(201,138,134,0.12)",
                }}
              >
                {error}
              </div>
            ) : null}
            <div className="mt-5">
              <Button
                type="submit"
                variant="primary"
                full
                disabled={saving || !cart.length || !selectedCustomer}
              >
                <CheckCircle2 size={17} />{" "}
                {saving
                  ? lang === "ar"
                    ? "جاري تسجيل البيع..."
                    : "Enregistrement en cours..."
                  : text.validate}
              </Button>
            </div>
          </aside>
        </form>
      ) : null}

      <CustomerFormModal
        open={customerModal}
        compact
        onClose={() => setCustomerModal(false)}
        onSaved={(customer) => {
          setCustomers((current) => [customer, ...current]);
          setSelectedCustomerId(String(customer.id));
        }}
      />
      <ModalShell
        open={overpaymentConfirmOpen}
        onClose={() => setOverpaymentConfirmOpen(false)}
        title={lang === "ar" ? "تأكيد المبلغ الزائد" : "Confirmer le paiement excédentaire"}
        maxWidth={560}
      >
        <div className="p-6">
          <p style={{ color: palette.muted, lineHeight: 1.8 }}>
            {lang === "ar"
              ? "المبلغ المدخل أكبر من المتبقي في البيع. لن يتجاوز المدفوع على الفاتورة إجماليها، وسيُحفظ المبلغ الزائد كرصيد متاح للزبون."
              : "Le montant saisi dépasse le reste de la vente. La facture sera réglée uniquement à hauteur de son total et l'excédent deviendra un crédit disponible pour le client."}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CreditConfirmationValue label={lang === "ar" ? "المتبقي" : "Reste facture"} value={remainingAfterCredit} lang={lang} />
            <CreditConfirmationValue label={lang === "ar" ? "المبلغ المدفوع" : "Montant remis"} value={numericPaid} lang={lang} />
            <CreditConfirmationValue label={lang === "ar" ? "الرصيد الجديد" : "Nouveau crédit"} value={overpaymentAmount} lang={lang} positive />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setOverpaymentConfirmOpen(false)}>
              {lang === "ar" ? "إلغاء" : "Annuler"}
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => void persistSale(true)}>
              {saving
                ? lang === "ar"
                  ? "جارٍ التسجيل..."
                  : "Enregistrement..."
                : lang === "ar"
                  ? "تسجيل الرصيد"
                  : "Enregistrer le crédit"}
            </Button>
          </div>
        </div>
      </ModalShell>
    </PageBackground>
  );
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function CreditConfirmationValue({ label, value, lang, positive = false }: { label: string; value: number; lang: "ar" | "fr"; positive?: boolean }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: positive ? "rgba(77,138,106,0.12)" : palette.bg }}>
      <div style={{ color: palette.muted, fontSize: 11.5 }}>{label}</div>
      <div className="mt-1" style={{ color: positive ? "#4d8a6a" : palette.text, fontSize: 16, fontWeight: 900 }}>
        {formatMoney(value, lang)}
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        style={{
          fontSize: strong ? 15 : 13,
          color: strong ? palette.text : palette.muted,
          fontWeight: strong ? 800 : 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: strong ? 20 : 14,
          color: danger ? "#b46a66" : strong ? palette.primary : palette.text,
          fontWeight: strong ? 900 : 800,
        }}
      >
        {value}
      </span>
    </div>
  );
}
