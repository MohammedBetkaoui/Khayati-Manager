import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CreditCard, FileText, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge, Select } from "../components/kit";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { asRecord, fetchJson, getArrayFromPayload, getNumber, getText } from "../lib/api";

type CustomerInvoice = {
  id: string;
  number: string;
  customer: string;
  phone: string;
  date: string;
  total: number;
  paid: number;
  remaining: number;
  status: string;
};

type CustomerSummary = {
  name: string;
  phone: string;
  totalInvoices: number;
  totalAmount: number;
  remainingAmount: number;
  lastPurchase: string;
};

function mapInvoice(raw: unknown): CustomerInvoice {
  const record = asRecord(raw);
  return {
    id: getText(record?.id) || crypto.randomUUID(),
    number: getText(record?.number) || getText(record?.invoiceNumber) || "-",
    customer: getText(record?.customerName) || getText(record?.customer) || "Client",
    phone: getText(record?.customerPhone) || getText(record?.phone),
    date: getText(record?.date) || getText(record?.createdAt) || "-",
    total: getNumber(record?.total),
    paid: getNumber(record?.paid),
    remaining: getNumber(record?.remaining),
    status: getText(record?.status) || "-",
  };
}

export function CustomerProfilePage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/sales");
        if (cancelled) return;

        const nextInvoices = getArrayFromPayload(payload).map(mapInvoice);
        setInvoices(nextInvoices);
        setSelectedCustomer((current) => current || nextInvoices[0]?.customer || "");
      } catch (err) {
        if (cancelled) return;
        setInvoices([]);
        setSelectedCustomer("");
        setError(err instanceof Error ? err.message : "Unable to load customers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const customerSummaries = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    for (const invoice of invoices) {
      const current = map.get(invoice.customer);
      if (!current) {
        map.set(invoice.customer, {
          name: invoice.customer,
          phone: invoice.phone,
          totalInvoices: 1,
          totalAmount: invoice.total,
          remainingAmount: invoice.remaining,
          lastPurchase: invoice.date,
        });
        continue;
      }

      current.totalInvoices += 1;
      current.totalAmount += invoice.total;
      current.remainingAmount += invoice.remaining;
      if (invoice.date > current.lastPurchase) {
        current.lastPurchase = invoice.date;
      }
    }

    return [...map.values()];
  }, [invoices]);

  const currentCustomer = customerSummaries.find((customer) => customer.name === selectedCustomer) ?? null;
  const customerInvoices = invoices.filter((invoice) => invoice.customer === selectedCustomer);
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <PageBackground>
      <div className="flex flex-wrap items-start justify-between gap-4 pt-7">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/sales")}
            className="flex items-center justify-center transition-colors hover:opacity-80"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: palette.surface, border: `1px solid ${palette.border}`, color: palette.primary }}
          >
            <BackArrow size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
              <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
                {lang === "ar" ? "الرئيسية" : "Accueil"}
              </button>
              <CrumbChevron size={14} />
              <button type="button" onClick={() => navigate("/sales")} className="transition-colors hover:opacity-80">
                {lang === "ar" ? "المبيعات" : "Ventes"}
              </button>
              <CrumbChevron size={14} />
              <span style={{ color: palette.text, fontWeight: 600 }}>{lang === "ar" ? "ملف الزبون" : "Profil client"}</span>
            </div>
            <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
              {lang === "ar" ? "ملف الزبون" : "Profil client"}
            </h1>
            <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 720 }}>
              {lang === "ar"
                ? "هذه الصفحة تعتمد الآن على بيانات المبيعات الحقيقية. عند توفر الفواتير من الـ API ستظهر هنا قائمة العملاء المستخرجة منها."
                : "Cette page depend maintenant des donnees sales reelles. Quand l'API renvoie des factures, la liste des clients est agregee directement depuis ces donnees."}
            </p>
          </div>
        </div>

        <div style={{ minWidth: 260 }}>
          <Select value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
            {customerSummaries.length === 0 ? (
              <option value="">{lang === "ar" ? "لا يوجد زبائن" : "Aucun client"}</option>
            ) : (
              customerSummaries.map((customer) => (
                <option key={customer.name} value={customer.name}>
                  {customer.name}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-sm" style={{ color: palette.muted }}>
          {lang === "ar" ? "جاري تحميل بيانات الزبائن..." : "Chargement des donnees clients..."}
        </div>
      ) : null}
      {!loading && error ? (
        <div className="mt-6 text-sm" style={{ color: "#b46a66" }}>
          {lang === "ar" ? "تعذر تحميل بيانات الزبائن." : "Impossible de charger les donnees clients."}
        </div>
      ) : null}

      {!loading && !currentCustomer ? (
        <div
          className="mt-6 rounded-2xl border p-6 text-sm"
          style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.muted }}
        >
          {lang === "ar"
            ? "لا توجد بيانات عملاء حقيقية لعرضها حالياً. هذا متوقع إذا كان endpoint /sales ما زال غير مربوط بقاعدة البيانات."
            : "Aucune donnee client reelle n'est disponible pour le moment. C'est normal si l'endpoint /sales n'est pas encore branche a la base de donnees."}
        </div>
      ) : null}

      {currentCustomer ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div style={{ backgroundColor: palette.surface, borderRadius: 18, border: `1px solid ${palette.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, color: palette.muted }}>{lang === "ar" ? "الزبون" : "Client"}</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: palette.primary }}>{currentCustomer.name}</div>
            </div>
            <div style={{ backgroundColor: palette.surface, borderRadius: 18, border: `1px solid ${palette.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, color: palette.muted }}>{lang === "ar" ? "عدد الفواتير" : "Nombre de factures"}</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: "#6b8aa0" }}>{currentCustomer.totalInvoices}</div>
            </div>
            <div style={{ backgroundColor: palette.surface, borderRadius: 18, border: `1px solid ${palette.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, color: palette.muted }}>{lang === "ar" ? "إجمالي المشتريات" : "Total des achats"}</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: "#4d8a6a" }}>{currentCustomer.totalAmount.toLocaleString()} {lang === "ar" ? "د.ج" : "DA"}</div>
            </div>
            <div style={{ backgroundColor: palette.surface, borderRadius: 18, border: `1px solid ${palette.border}`, padding: 16 }}>
              <div style={{ fontSize: 12, color: palette.muted }}>{lang === "ar" ? "المتبقي" : "Reste à payer"}</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: "#b46a66" }}>{currentCustomer.remainingAmount.toLocaleString()} {lang === "ar" ? "د.ج" : "DA"}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <section
              style={{
                backgroundColor: palette.surface,
                borderRadius: 22,
                border: `1px solid ${palette.border}`,
                boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
                padding: 20,
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <UserRound size={18} style={{ color: palette.primary }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "ملخص الزبون" : "Resume client"}</span>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "الهاتف" : "Telephone"}</span><span>{currentCustomer.phone || "-"}</span></div>
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "آخر شراء" : "Dernier achat"}</span><span>{currentCustomer.lastPurchase}</span></div>
                <div className="flex items-center justify-between"><span style={{ color: palette.muted }}>{lang === "ar" ? "حالة الحساب" : "Etat du compte"}</span><Badge bg={`${palette.primary}12`} fg={palette.primary}>{currentCustomer.remainingAmount > 0 ? (lang === "ar" ? "به رصيد" : "Avec reste") : (lang === "ar" ? "مسدد" : "Regle")}</Badge></div>
              </div>
            </section>

            <section
              style={{
                backgroundColor: palette.surface,
                borderRadius: 22,
                border: `1px solid ${palette.border}`,
                boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
                padding: 20,
              }}
            >
              <div className="mb-4 flex items-center gap-2">
                <FileText size={18} style={{ color: palette.primary }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "الفواتير المرتبطة" : "Factures liees"}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${palette.border}`, color: palette.muted }}>
                      <th className="pb-2 text-start">{lang === "ar" ? "الرقم" : "Numero"}</th>
                      <th className="pb-2 text-start">{lang === "ar" ? "التاريخ" : "Date"}</th>
                      <th className="pb-2 text-end">{lang === "ar" ? "الإجمالي" : "Total"}</th>
                      <th className="pb-2 text-end">{lang === "ar" ? "المدفوع" : "Paye"}</th>
                      <th className="pb-2 text-end">{lang === "ar" ? "المتبقي" : "Reste"}</th>
                      <th className="pb-2 text-end">{lang === "ar" ? "الحالة" : "Statut"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.map((invoice) => (
                      <tr key={invoice.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                        <td className="py-2">{invoice.number}</td>
                        <td className="py-2">{invoice.date}</td>
                        <td className="py-2 text-end">{invoice.total.toLocaleString()}</td>
                        <td className="py-2 text-end">{invoice.paid.toLocaleString()}</td>
                        <td className="py-2 text-end">{invoice.remaining.toLocaleString()}</td>
                        <td className="py-2 text-end">
                          <span
                            style={{
                              color: invoice.remaining > 0 ? "#b46a66" : "#4d8a6a",
                              fontWeight: 700,
                            }}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl border p-4 text-sm" style={{ borderColor: palette.border, backgroundColor: palette.bg, color: palette.muted }}>
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard size={16} style={{ color: palette.primary }} />
                  <span style={{ color: palette.text, fontWeight: 700 }}>{lang === "ar" ? "ملاحظة" : "Note"}</span>
                </div>
                {lang === "ar"
                  ? "لا توجد بعد API خاصة بالعملاء أو القياسات. هذه الصفحة تعرض فقط ما يمكن استخراجه حالياً من الفواتير الحقيقية."
                  : "Il n'existe pas encore d'API clients ou mesures. Cette page affiche uniquement ce qui peut etre derive des factures reelles pour le moment."}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </PageBackground>
  );
}
