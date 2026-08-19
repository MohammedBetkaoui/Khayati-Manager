import { useState } from "react";
import { palette, salesText } from "../../pages/sales-data";
import { useLanguage } from "../../language-context";
import { Button, Field, TextInput } from "../kit";
import { ModalShell, Textarea } from "../production/modal-shell";

export function AddInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = salesText[lang].addModal;

  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");

  const numTotal = parseFloat(total) || 0;
  const numPaid = parseFloat(paid) || 0;
  const numDiscount = parseFloat(discount) || 0;
  
  const netTotal = Math.max(0, numTotal - numDiscount);
  const remaining = Math.max(0, netTotal - numPaid);

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={540}>
      <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t.customer}>
            <TextInput placeholder={lang === "ar" ? "اسم الزبون..." : "Nom du client..."} />
          </Field>
        </div>
        
        <Field label={t.phone}>
          <TextInput placeholder="0000 00 00 00" dir="ltr" />
        </Field>
        <Field label={t.orderId}>
          <TextInput placeholder="#1024" dir="ltr" />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.product}>
            <TextInput placeholder={lang === "ar" ? "تفاصيل المنتجات أو الخدمات..." : "Détails produits/services..."} />
          </Field>
        </div>

        <Field label={t.unitPrice}>
          <TextInput
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t.discount}>
          <TextInput
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
          />
        </Field>

        <Field label={t.paid}>
          <TextInput
            type="number"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t.method}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              fontSize: 13.5,
              outline: "none",
            }}
          >
            <option value="cash">{lang === "ar" ? "نقداً" : "Espèces"}</option>
            <option value="transfer">{lang === "ar" ? "تحويل" : "Virement"}</option>
            <option value="check">{lang === "ar" ? "صك" : "Chèque"}</option>
          </select>
        </Field>

        <div className="sm:col-span-2 mt-2 rounded-xl bg-black/5 p-4 text-sm">
          <div className="flex justify-between font-semibold text-muted-foreground mb-1">
            <span>{salesText[lang].preview.netTotal}:</span>
            <span>{netTotal.toLocaleString()} {salesText[lang].currency}</span>
          </div>
          <div className="flex justify-between font-bold" style={{ color: remaining > 0 ? "#b46a66" : "#4d8a6a" }}>
            <span>{salesText[lang].preview.remainingAmount}:</span>
            <span>{remaining.toLocaleString()} {salesText[lang].currency}</span>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={2} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 sm:col-span-2 mt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.savePrint}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
