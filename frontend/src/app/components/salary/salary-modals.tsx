import { useState } from "react";
import { palette, salaryText, salaryTypeLabels } from "../../pages/salary-data";
import type { PayrollRecord } from "../../pages/salary-data";
import { useLanguage } from "../../language-context";
import { Button, Field, TextInput } from "../kit";
import { ModalShell, Textarea } from "../modal-shell";

export function CalculateSalaryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang].modals.calc;
  const cur = salaryText[lang].currency;

  const [type, setType] = useState("piece");
  const [base, setBase] = useState("");
  const [pieces, setPieces] = useState("");
  const [rate, setRate] = useState("");

  const numBase = parseFloat(base) || 0;
  const numPieces = parseFloat(pieces) || 0;
  const numRate = parseFloat(rate) || 0;

  let calculatedBase = numBase;
  if (type === "piece") {
    calculatedBase = numPieces * numRate;
  } else if (type === "mixed") {
    calculatedBase = numBase + numPieces * numRate;
  }

  const helperText =
    type === "daily"
      ? t.methodDaily
      : type === "piece"
        ? t.methodPiece
        : type === "mixed"
          ? t.methodMixed
          : lang === "ar"
            ? "إدخال الراتب الثابت المتفق عليه"
            : "Saisir le salaire fixe convenu";

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={540}>
      <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
        <Field label={t.worker}>
          <TextInput placeholder={lang === "ar" ? "اسم العامل..." : "Nom..."} />
        </Field>

        <Field label={t.period}>
          <TextInput
            placeholder={lang === "ar" ? "مثال: جوان 2026" : "Ex: Juin 2026"}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.type}>
            <select
              className="w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
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
              {Object.entries(salaryTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[lang]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Dynamic fields based on type */}
        {(type === "daily" ||
          type === "weekly" ||
          type === "monthly" ||
          type === "mixed") && (
          <Field label={t.base}>
            <TextInput
              type="number"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="0"
            />
          </Field>
        )}

        {(type === "piece" || type === "mixed") && (
          <>
            <Field label={t.piecesCount}>
              <TextInput
                type="number"
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label={t.pieceRate}>
              <TextInput
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0"
              />
            </Field>
          </>
        )}

        {type === "daily" && (
          <Field label={t.workDays}>
            <TextInput type="number" placeholder="0" />
          </Field>
        )}

        <div className="sm:col-span-2 mt-2 rounded-xl bg-black/5 p-4 text-sm">
          <div className="text-muted-foreground font-semibold mb-2">
            {t.methodTitle}
          </div>
          <div
            className="mb-3"
            style={{ fontSize: 12.5, color: palette.muted }}
          >
            {helperText}
          </div>

          <div
            className="flex justify-between border-t pt-2 font-bold"
            style={{
              borderColor: palette.borderStrong,
              color: palette.primary,
              fontSize: 15,
            }}
          >
            <span>{t.net}:</span>
            <span>
              {calculatedBase.toLocaleString()} {cur}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 sm:col-span-2 mt-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.savePay}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function AdvanceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang].modals.advance;

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={440}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label={t.worker}>
          <TextInput
            placeholder={
              lang === "ar" ? "اختيار العامل..." : "Choisir travailleur..."
            }
          />
        </Field>
        <Field label={t.amount}>
          <TextInput type="number" placeholder="0" />
        </Field>
        <Field label={t.date}>
          <TextInput
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </Field>
        <Field label={t.deductMethod}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              outline: "none",
            }}
          >
            <option value="month">{t.deductMonth}</option>
            <option value="part">{t.deductPart}</option>
            <option value="later">{t.deductLater}</option>
          </select>
        </Field>
        <Field label={t.notes}>
          <Textarea rows={2} />
        </Field>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {salaryText[lang].modals.calc.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function BonusDeductionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang].modals.bonus;

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={440}>
      <div className="flex flex-col gap-4 px-6 py-5">
        <Field label={t.worker}>
          <TextInput
            placeholder={
              lang === "ar" ? "اختيار العامل..." : "Choisir travailleur..."
            }
          />
        </Field>
        <Field label={t.type}>
          <select
            className="w-full"
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              outline: "none",
            }}
          >
            <option value="prod">{t.typeProd}</option>
            <option value="qual">{t.typeQual}</option>
            <option value="abs">{t.typeAbs}</option>
            <option value="late">{t.typeLate}</option>
            <option value="err">{t.typeErr}</option>
            <option value="other">{t.typeOther}</option>
          </select>
        </Field>
        <Field label={t.amount}>
          <TextInput type="number" placeholder="0" />
        </Field>
        <Field label={t.reason}>
          <TextInput />
        </Field>
        <Field label={t.date}>
          <TextInput
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </Field>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {salaryText[lang].modals.calc.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function PaymentModal({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
}) {
  const { lang } = useLanguage();
  const t = salaryText[lang].modals.pay;
  const cur = salaryText[lang].currency;

  const net = record ? record.netSalary : 0;
  const [amount, setAmount] = useState("");
  const numAmount = parseFloat(amount) || 0;
  const rem = Math.max(0, net - numAmount);

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={440}>
      <div className="px-6 py-5">
        {record && (
          <div
            className="mb-5 rounded-xl border p-4"
            style={{ borderColor: palette.border, backgroundColor: palette.bg }}
          >
            <div className="flex justify-between items-center mb-1">
              <span style={{ fontSize: 13, color: palette.muted }}>
                {t.worker}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {record.workerName[lang]}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 13, color: palette.muted }}>
                {t.net}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: palette.primary,
                }}
              >
                {net.toLocaleString()} {cur}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Field label={t.paid}>
            <TextInput
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={net.toString()}
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
                outline: "none",
              }}
            >
              <option value="cash">{t.methodCash}</option>
              <option value="transfer">{t.methodTransfer}</option>
            </select>
          </Field>

          <div className="mt-2 rounded-xl bg-black/5 p-4 text-sm">
            <div
              className="flex justify-between border-t pt-2 font-bold"
              style={{
                borderColor: palette.borderStrong,
                color: rem > 0 ? "#b46a66" : "#4d8a6a",
              }}
            >
              <span>{t.remaining}:</span>
              <span>
                {rem.toLocaleString()} {cur}
              </span>
            </div>
          </div>

          <Field label={t.notes}>
            <Textarea rows={2} />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {salaryText[lang].modals.calc.cancel}
          </Button>
          <Button variant="primary" onClick={onClose} disabled={numAmount <= 0}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
