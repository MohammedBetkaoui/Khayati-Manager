import { useState } from "react";
import { palette, salesText } from "../../pages/sales-data";
import type { Invoice } from "../../pages/sales-data";
import { useLanguage } from "../../language-context";
import { Button, Field, TextInput } from "../kit";
import { ModalShell, Textarea } from "../production/modal-shell";

export function RegisterPaymentModal({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}) {
  const { lang } = useLanguage();
  const t = salesText[lang].payModal;
  const cur = salesText[lang].currency;

  const [amount, setAmount] = useState("");
  const numAmount = parseFloat(amount) || 0;
  
  const remaining = invoice ? invoice.remaining : 0;
  const newRemaining = Math.max(0, remaining - numAmount);

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={440}>
      <div className="px-6 py-5">
        {invoice && (
          <div className="mb-5 rounded-xl border p-4" style={{ borderColor: palette.border, backgroundColor: palette.bg }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: 13, color: palette.muted }}>{t.invoice}</span>
              <span style={{ direction: "ltr", fontSize: 14, fontWeight: 800, color: palette.primary }}>
                #{invoice.number}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 13, color: palette.muted }}>{t.customer}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{invoice.customerName[lang]}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Field label={t.amount}>
            <div className="relative">
              <TextInput
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={remaining.toString()}
                style={{ paddingInlineEnd: 40 }}
              />
              <span className="absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground" style={{ insetInlineEnd: 14 }}>
                {cur}
              </span>
            </div>
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

          <Field label={t.date}>
            <TextInput type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </Field>

          {invoice && (
            <div className="mt-2 rounded-xl bg-black/5 p-4 text-sm">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>{t.oldRem}:</span>
                <span>{remaining.toLocaleString()} {cur}</span>
              </div>
              <div className="flex justify-between text-muted-foreground mb-2">
                <span>{t.newPay}:</span>
                <span style={{ color: palette.primary }}>- {numAmount.toLocaleString()} {cur}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: palette.borderStrong, color: newRemaining > 0 ? "#b46a66" : "#4d8a6a" }}>
                <span>{t.newRem}:</span>
                <span>{newRemaining.toLocaleString()} {cur}</span>
              </div>
            </div>
          )}

          <Field label={t.notes}>
            <Textarea rows={2} />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose} disabled={numAmount <= 0}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
