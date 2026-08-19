import { useState } from "react";
import {
  prodText,
  stageOrder,
  stageLabels,
  taskLabels,
  workerRoster,
  orders,
} from "../../pages/production-data";
import type { StageId } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function AssignWorkersModal({
  open,
  onClose,
  defaultOrderId,
}: {
  open: boolean;
  onClose: () => void;
  defaultOrderId?: string | null;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang].assignModal;

  const [form, setForm] = useState({
    order: defaultOrderId ?? orders[0]?.id ?? "",
    stage: "cutting" as StageId,
    worker: workerRoster[0]?.ar ?? "",
    task: "cut",
    pieces: "",
    notes: "",
  });

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={520}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={t.order}>
            <Select value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })}>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.number} — {o.customer[lang]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t.stage}>
          <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as StageId })}>
            {stageOrder.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s][lang]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.worker}>
          <Select value={form.worker} onChange={(e) => setForm({ ...form, worker: e.target.value })}>
            {workerRoster.map((w) => (
              <option key={w.ar} value={w.ar}>
                {w[lang]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.task}>
          <Select value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })}>
            {Object.keys(taskLabels).map((k) => (
              <option key={k} value={k}>
                {taskLabels[k][lang]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.pieces}>
          <TextInput
            type="number"
            value={form.pieces}
            onChange={(e) => setForm({ ...form, pieces: e.target.value })}
            placeholder="0"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>

        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" type="submit">
            {t.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
