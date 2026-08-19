import { useEffect, useState } from "react";
import { useLanguage } from "../../language-context";
import { fetchJson } from "../../lib/api";
import {
  statusFlow,
  statusLabels,
  type OrderStatusCode,
  type WorkerOption,
} from "../../pages/production-data";
import { Button, Field, Select, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function AssignWorkersModal({
  open,
  onClose,
  orderId,
  workers,
  defaultStage,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number | null;
  workers: WorkerOption[];
  defaultStage: OrderStatusCode;
  onSaved: () => void | Promise<void>;
}) {
  const { lang } = useLanguage();
  const [workerId, setWorkerId] = useState("");
  const [stage, setStage] = useState<OrderStatusCode>(defaultStage);
  const [completedPieces, setCompletedPieces] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels =
    lang === "ar"
      ? {
          title: "\u0625\u0633\u0646\u0627\u062f \u0639\u0627\u0645\u0644",
          worker: "\u0627\u0644\u0639\u0627\u0645\u0644",
          stage: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629",
          pieces:
            "\u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0645\u0646\u062c\u0632\u0629",
          notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
          cancel: "\u0625\u0644\u063a\u0627\u0621",
          save: "\u0625\u0633\u0646\u0627\u062f",
        }
      : {
          title: "Assigner un travailleur",
          worker: "Travailleur",
          stage: "\u00c9tape",
          pieces: "Pi\u00e8ces termin\u00e9es",
          notes: "Notes",
          cancel: "Annuler",
          save: "Assigner",
        };

  useEffect(() => {
    if (!open) return;
    setWorkerId(workers[0] ? String(workers[0].id) : "");
    setStage(defaultStage);
    setCompletedPieces("0");
    setNotes("");
    setError(null);
  }, [defaultStage, open, workers]);

  async function submit() {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/orders/${orderId}/workers`, {
        method: "POST",
        body: JSON.stringify({
          workerId: Number(workerId),
          stage,
          completedPieces: Number(completedPieces || 0),
          notes: notes || undefined,
        }),
      });
      await onSaved();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to assign worker",
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
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field label={labels.worker}>
          <Select
            value={workerId}
            onChange={(event) => setWorkerId(event.target.value)}
          >
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.fullName} - {worker.role}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.stage}>
          <Select
            value={stage}
            onChange={(event) =>
              setStage(event.target.value as OrderStatusCode)
            }
          >
            {statusFlow.slice(1, -1).map((item) => (
              <option key={item} value={item}>
                {statusLabels[item][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.pieces}>
          <TextInput
            min="0"
            type="number"
            value={completedPieces}
            onChange={(event) => setCompletedPieces(event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={labels.notes}>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
        {error ? (
          <div
            className="sm:col-span-2"
            style={{ color: "#b46a66", fontSize: 12 }}
          >
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={submitting || !workerId || !orderId}
          >
            {labels.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
