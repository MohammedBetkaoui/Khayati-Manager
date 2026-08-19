import { Save } from "lucide-react";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "../modal-shell";
import {
  activeStatusOptions,
  modalSectionOptions,
  modalTaskOptions,
  productCategories,
  specialSettingsText,
  workerRoles,
  type Lang,
} from "../../pages/special-settings-data";

function SelectOptions({
  items,
  lang,
}: {
  items: { ar: string; fr: string }[];
  lang: Lang;
}) {
  return (
    <>
      {items.map((item) => (
        <option key={item.ar} value={item[lang]}>
          {item[lang]}
        </option>
      ))}
    </>
  );
}

export function AddRuleModal({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const t = specialSettingsText[lang].modal;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={t.addRuleTitle}
      maxWidth={620}
    >
      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
        <Field label={t.ruleName}>
          <TextInput
            placeholder={
              lang === "ar" ? "مثال: خصم غياب" : "Ex : Retenue absence"
            }
          />
        </Field>
        <Field label={t.section}>
          <Select>
            <SelectOptions items={modalSectionOptions} lang={lang} />
          </Select>
        </Field>
        <Field label={t.type}>
          <TextInput
            placeholder={
              lang === "ar"
                ? "خصم / تنبيه"
                : "Retenue / alerte"
            }
          />
        </Field>
        <Field label={t.value}>
          <TextInput
            placeholder={lang === "ar" ? "مثال: 1,000 دج" : "Ex : 1 000 DA"}
          />
        </Field>
        <Field label={t.condition}>
          <TextInput
            placeholder={lang === "ar" ? "عند تجاوز الهدف" : "Après objectif"}
          />
        </Field>
        <Field label={t.status}>
          <Select>
            <SelectOptions items={activeStatusOptions} lang={lang} />
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={3} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            <Save size={15} />
            {t.saveRule}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function AddPiecePriceModal({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const t = specialSettingsText[lang].modal;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={t.addPieceTitle}
      maxWidth={620}
    >
      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
        <Field label={t.productType}>
          <Select>
            <SelectOptions items={productCategories} lang={lang} />
          </Select>
        </Field>
        <Field label={t.taskType}>
          <Select>
            <SelectOptions items={modalTaskOptions} lang={lang} />
          </Select>
        </Field>
        <Field label={t.responsibleRole}>
          <Select>
            {workerRoles.map((role) => (
              <option key={role.name.ar} value={role.name[lang]}>
                {role.name[lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.piecePrice}>
          <TextInput
            placeholder={lang === "ar" ? "مثال: 120 دج" : "Ex : 120 DA"}
          />
        </Field>
        <Field label={t.startDate}>
          <TextInput type="date" defaultValue="2026-07-04" />
        </Field>
        <Field label={t.status}>
          <Select>
            <SelectOptions items={activeStatusOptions} lang={lang} />
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={3} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            <Save size={15} />
            {t.savePrice}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function AddProductionStageModal({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const t = specialSettingsText[lang].modal;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={t.addStageTitle}
      maxWidth={560}
    >
      <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
        <Field label={t.stageName}>
          <TextInput
            placeholder={
              lang === "ar" ? "مثال: مراجعة الجودة" : "Ex : Contrôle qualité"
            }
          />
        </Field>
        <Field label={t.stageOrder}>
          <TextInput type="number" defaultValue="7" />
        </Field>
        <Field label={t.stageColor}>
          <TextInput
            type="color"
            defaultValue="#123c4a"
            style={{ padding: 4 }}
          />
        </Field>
        <Field label={t.status}>
          <Select>
            <SelectOptions items={activeStatusOptions} lang={lang} />
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.description}>
            <Textarea rows={3} />
          </Field>
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            <Save size={15} />
            {t.saveStage}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
