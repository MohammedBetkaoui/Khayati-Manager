import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import { Archive, Eye, Pencil, Plus, Search, Truck, Wallet } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeading, StatePanel, StatCard, formatDate, formatMoney } from "../components/commerce-ui";
import { Badge, Button, Field, TextInput } from "../components/kit";
import { ModalShell, Textarea } from "../components/modal-shell";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { fetchJson } from "../lib/api";
import type { Supplier } from "../lib/commerce";

type SupplierStats = {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPurchases: number;
  totalPaid: number;
  totalDebt: number;
};

const emptyStats: SupplierStats = {
  totalSuppliers: 0,
  activeSuppliers: 0,
  totalPurchases: 0,
  totalPaid: 0,
  totalDebt: 0,
};

export function SuppliersPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<SupplierStats>(emptyStats);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const text =
    lang === "ar"
      ? {
          title: "تسيير الموردين",
          subtitle: "متابعة الموردين، المشتريات، المدفوعات والديون الحالية.",
          add: "إضافة مورد",
          search: "ابحث عن مورد، هاتف أو مدينة...",
          total: "إجمالي الموردين",
          active: "موردون نشطون",
          purchases: "إجمالي المشتريات",
          debt: "الدين الحالي",
          empty: "لا يوجد موردون",
        }
      : {
          title: "Gestion des fournisseurs",
          subtitle: "Suivi des fournisseurs, achats, règlements et dettes.",
          add: "Ajouter un fournisseur",
          search: "Rechercher fournisseur, téléphone ou ville...",
          total: "Fournisseurs",
          active: "Actifs",
          purchases: "Total achats",
          debt: "Dette actuelle",
          empty: "Aucun fournisseur",
        };

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [list, summary] = await Promise.all([
          fetchJson<{ data: Supplier[] }>("/inventory/suppliers?limit=200", {
            signal: controller.signal,
          }),
          fetchJson<SupplierStats>("/inventory/suppliers/stats", {
            signal: controller.signal,
          }),
        ]);
        setSuppliers(list.data);
        setStats({ ...emptyStats, ...summary });
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load suppliers",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const filtered = suppliers.filter((supplier) => {
    const needle = deferredSearch.trim().toLocaleLowerCase();
    if (!needle) return true;
    return [supplier.name, supplier.phone, supplier.address, supplier.city, supplier.notes].some((value) =>
      value?.toLocaleLowerCase().includes(needle),
    );
  });

  async function archiveSupplier(supplier: Supplier) {
    const ok = window.confirm(
      lang === "ar"
        ? `أرشفة ${supplier.name}؟ سيبقى التاريخ المالي محفوظاً.`
        : `Archiver ${supplier.name} ? Son historique financier sera conservé.`,
    );
    if (!ok) return;
    await fetchJson(`/inventory/suppliers/${supplier.id}`, { method: "DELETE" });
    setRefreshKey((value) => value + 1);
  }

  return (
    <PageBackground>
      <PageHeading
        title={text.title}
        subtitle={text.subtitle}
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> {text.add}
          </Button>
        }
      />

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Truck} label={text.total} value={stats.totalSuppliers} />
        <StatCard icon={Truck} label={text.active} value={stats.activeSuppliers} color="#4d8a6a" tint="rgba(77,138,106,0.12)" />
        <StatCard icon={Wallet} label={text.purchases} value={formatMoney(stats.totalPurchases, lang)} color="#a87d3c" tint="rgba(195,154,91,0.15)" />
        <StatCard icon={Wallet} label={text.debt} value={formatMoney(stats.totalDebt, lang)} color="#b46a66" tint="rgba(201,138,134,0.13)" />
      </section>

      <section
        className="mt-5"
        style={{
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: 22,
          padding: 20,
        }}
      >
        <div className="relative mb-5">
          <Search size={17} className="absolute top-1/2 -translate-y-1/2" style={{ insetInlineStart: 14, color: palette.muted }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.search}
            className="h-10 w-full rounded-xl border outline-none"
            style={{ borderColor: palette.border, paddingInlineStart: 42, paddingInlineEnd: 14, fontSize: 13.5 }}
          />
        </div>
        <StatePanel
          loading={loading}
          error={error}
          empty={!loading && !error && filtered.length === 0}
          emptyTitle={text.empty}
          onRetry={() => setRefreshKey((value) => value + 1)}
        />
        {!loading && !error && filtered.length ? (
          <SuppliersTable
            suppliers={filtered}
            lang={lang}
            onView={(supplier) => navigate(`/suppliers/${supplier.id}`)}
            onEdit={(supplier) => {
              setEditingSupplier(supplier);
              setModalOpen(true);
            }}
            onArchive={archiveSupplier}
          />
        ) : null}
      </section>

      <SupplierModal
        open={modalOpen}
        supplier={editingSupplier}
        onClose={() => {
          setModalOpen(false);
          setEditingSupplier(null);
        }}
        onSaved={() => setRefreshKey((value) => value + 1)}
      />
    </PageBackground>
  );
}

function SuppliersTable({
  suppliers,
  lang,
  onView,
  onEdit,
  onArchive,
}: {
  suppliers: Supplier[];
  lang: "ar" | "fr";
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onArchive: (supplier: Supplier) => void;
}) {
  const headers =
    lang === "ar"
      ? ["المورد", "الهاتف", "المدينة", "المشتريات", "المدفوع", "الدين", "آخر شراء", "الحالة", "الإجراءات"]
      : ["Fournisseur", "Téléphone", "Ville", "Achats", "Payé", "Dette", "Dernier achat", "État", "Actions"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ minWidth: 1040, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            {headers.map((header) => (
              <th key={header} style={headStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
              <td style={{ ...cellStyle, fontWeight: 900, color: palette.primary }}>{supplier.name}</td>
              <td style={cellStyle}>{supplier.phone || "-"}</td>
              <td style={cellStyle}>{supplier.city || supplier.address || "-"}</td>
              <td style={cellStyle}>{formatMoney(supplier.totalPurchases, lang)}</td>
              <td style={cellStyle}>{formatMoney(supplier.totalPaid, lang)}</td>
              <td style={{ ...cellStyle, fontWeight: 900, color: supplier.totalDebt > 0 ? "#b46a66" : "#4d8a6a" }}>{formatMoney(supplier.totalDebt, lang)}</td>
              <td style={cellStyle}>{formatDate(supplier.lastPurchaseDate, lang)}</td>
              <td style={cellStyle}>
                <Badge bg="rgba(77,138,106,0.12)" fg="#4d8a6a">{supplier.status}</Badge>
              </td>
              <td style={cellStyle}>
                <div className="flex gap-1">
                  <IconButton label="view" color={palette.primary} onClick={() => onView(supplier)}><Eye size={15} /></IconButton>
                  <IconButton label="edit" color="#6b8aa0" onClick={() => onEdit(supplier)}><Pencil size={15} /></IconButton>
                  <IconButton label="archive" color="#b46a66" onClick={() => onArchive(supplier)}><Archive size={15} /></IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupplierModal({
  open,
  supplier,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      supplier
        ? {
            name: supplier.name,
            phone: supplier.phone ?? "",
            address: supplier.address ?? "",
            city: supplier.city ?? "",
            notes: supplier.notes ?? "",
          }
        : { name: "", phone: "", address: "", city: "", notes: "" },
    );
  }, [open, supplier]);

  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fetchJson(
        supplier ? `/inventory/suppliers/${supplier.id}` : "/inventory/suppliers",
        {
          method: supplier ? "PATCH" : "POST",
          body: JSON.stringify({
            name: form.name,
            phone: form.phone || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
            notes: form.notes || undefined,
          }),
        },
      );
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={supplier ? (lang === "ar" ? "تعديل مورد" : "Modifier fournisseur") : (lang === "ar" ? "إضافة مورد" : "Ajouter fournisseur")}
      maxWidth={620}
    >
      <form onSubmit={submit} className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={lang === "ar" ? "اسم المورد *" : "Nom du fournisseur *"}>
            <TextInput required value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label={lang === "ar" ? "الهاتف" : "Téléphone"}>
            <TextInput value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </Field>
          <Field label={lang === "ar" ? "المدينة" : "Ville"}>
            <TextInput value={form.city} onChange={(event) => update("city", event.target.value)} />
          </Field>
          <Field label={lang === "ar" ? "العنوان" : "Adresse"}>
            <TextInput value={form.address} onChange={(event) => update("address", event.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={lang === "ar" ? "ملاحظات" : "Notes"}>
            <Textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
        </div>
        {error ? <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ color: "#a94f4a", backgroundColor: "rgba(201,138,134,0.12)" }}>{error}</div> : null}
        <div className="mt-6 flex justify-end gap-2" style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 18 }}>
          <Button onClick={onClose} disabled={saving}>{lang === "ar" ? "إلغاء" : "Annuler"}</Button>
          <Button type="submit" variant="primary" disabled={saving}>{lang === "ar" ? "حفظ" : "Enregistrer"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function IconButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50"
      style={{ color }}
    >
      {children}
    </button>
  );
}

const headStyle: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "start",
  fontSize: 12,
  color: palette.muted,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  padding: "13px 10px",
  fontSize: 13,
  color: palette.text,
  verticalAlign: "middle",
};
