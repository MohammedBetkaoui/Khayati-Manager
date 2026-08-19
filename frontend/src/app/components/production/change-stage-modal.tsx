import { useEffect, useState } from "react";
import { useLanguage } from "../../language-context";
import { fetchJson } from "../../lib/api";
import {
  palette,
  statusColors,
  statusFlow,
  statusLabels,
  type OrderListItem,
  type OrderStatusCode,
  type WorkerOption,
} from "../../pages/production-data";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function ChangeStageModal({
  open,
  onClose,
  order,
  workers,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  order: OrderListItem | null;
  workers: WorkerOption[];
  onSaved: () => void | Promise<void>;
}) {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<OrderStatusCode>(
    order?.statusCode ?? "NEW",
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workerId, setWorkerId] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels =
    lang === "ar"
      ? {
          title:
            "\u062a\u063a\u064a\u064a\u0631 \u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628\u064a\u0629",
          date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
          worker: "\u0627\u0644\u0645\u0633\u0624\u0648\u0644",
          noWorker: "\u0628\u062f\u0648\u0646 \u062a\u062d\u062f\u064a\u062f",
          comment: "\u062a\u0639\u0644\u064a\u0642",
          cancel: "\u0625\u0644\u063a\u0627\u0621",
          save: "\u062d\u0641\u0638 \u0627\u0644\u062d\u0627\u0644\u0629",
        }
      : {
          title: "Changer l'\u00e9tat",
          date: "Date",
          worker: "Responsable",
          noWorker: "Non renseign\u00e9",
          comment: "Commentaire",
          cancel: "Annuler",
          save: "Enregistrer l'\u00e9tat",
        };

  useEffect(() => {
    if (!open) return;
    setStatus(order?.statusCode ?? "NEW");
    setDate(new Date().toISOString().slice(0, 10));
    setWorkerId("");
    setComment("");
    setError(null);
  }, [open, order]);

  async function submit() {
    if (!order) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          date,
          workerId: workerId ? Number(workerId) : undefined,
          comment: comment || undefined,
        }),
      });
      await onSaved();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to change status",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={labels.title}
      maxWidth={500}
    >
      <form
        className="px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {statusFlow.map((item) => {
            const active = item === status;
            const accent = statusColors[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className="text-start transition-colors"
                style={{
                  padding: "10px 11px",
                  borderRadius: 12,
                  border: `1px solid ${active ? accent : palette.border}`,
                  backgroundColor: active ? `${accent}12` : palette.surface,
                  color: active ? accent : palette.muted,
                  fontSize: 12.5,
                  fontWeight: active ? 800 : 600,
                }}
              >
                {statusLabels[item][lang]}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={labels.date}>
            <TextInput
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label={labels.worker}>
            <Select
              value={workerId}
              onChange={(event) => setWorkerId(event.target.value)}
            >
              <option value="">{labels.noWorker}</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.fullName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label={labels.comment}>
            <Textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>
        </div>
        {error ? (
          <div className="mt-3" style={{ color: "#b46a66", fontSize: 12 }}>
            {error}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || !order}
          >
            {labels.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
