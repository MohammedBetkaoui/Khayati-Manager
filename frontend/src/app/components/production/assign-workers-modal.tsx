import { useEffect, useState } from "react";
import { prodText, stageOrder, stageLabels, taskLabels, type Bilingual, type Order, type StageId } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function AssignWorkersModal({
  open,
  onClose,
  defaultOrderId,
  orders,
  workers,
}: {
  open: boolean;
  onClose: () => void;
  defaultOrderId?: string | null;
  orders: Order[];
  workers: Bilingual[];
}) {
  const { lang } = useLanguage();
  const t = prodText[lang].assignModal;

  const [form, setForm] = useState({
    order: defaultOrderId ?? orders[0]?.id ?? "",
    stage: "cutting" as StageId,
    worker: workers[0]?.ar ?? "",
    task: "cut",
    pieces: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      order: defaultOrderId ?? current.order ?? orders[0]?.id ?? "",
      worker: current.worker || workers[0]?.ar || "",
    }));
  }, [defaultOrderId, open, orders, workers]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={520}>
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <div className="sm:col-span-2">
          <Field label={t.order}>
            <Select value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })}>
              {orders.length === 0 ? (
                <option value="">{lang === "ar" ? "لا توجد طلبيات" : "Aucune commande"}</option>
              ) : (
                orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.number} — {order.customer[lang]}
                  </option>
                ))
              )}
            </Select>
          </Field>
        </div>

        <Field label={t.stage}>
          <Select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as StageId })}>
            {stageOrder.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage][lang]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.worker}>
          <Select value={form.worker} onChange={(event) => setForm({ ...form, worker: event.target.value })}>
            {workers.length === 0 ? (
              <option value="">{lang === "ar" ? "لا يوجد عمال" : "Aucun ouvrier"}</option>
            ) : (
              workers.map((worker) => (
                <option key={worker.ar} value={worker.ar}>
                  {worker[lang]}
                </option>
              ))
            )}
          </Select>
        </Field>

        <Field label={t.task}>
          <Select value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })}>
            {Object.keys(taskLabels).map((task) => (
              <option key={task} value={task}>
                {taskLabels[task][lang]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.pieces}>
          <TextInput
            type="number"
            value={form.pieces}
            onChange={(event) => setForm({ ...form, pieces: event.target.value })}
            placeholder="0"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t.notes}>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
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
