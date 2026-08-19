import { useState, useEffect } from "react";
import { palette, prodText, stageOrder, stageLabels, stageColors } from "../../pages/production-data";
import type { Order, StageId } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Button, Field, TextInput } from "../kit";
import { ModalShell, Textarea } from "./modal-shell";

export function ChangeStageModal({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang].stageModal;

  const [stage, setStage] = useState<StageId>(order?.stage ?? "new");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order) setStage(order.stage);
  }, [order]);

  return (
    <ModalShell open={open} onClose={onClose} title={t.title} maxWidth={440}>
      <div className="px-6 py-5">
        {order ? (
          <div
            className="mb-4 flex items-center gap-2"
            style={{ fontSize: 13.5 }}
          >
            <span style={{ direction: "ltr", fontWeight: 800, color: palette.primary }}>#{order.number}</span>
            <span style={{ color: palette.muted }}>—</span>
            <span style={{ fontWeight: 600, color: palette.text }}>{order.customer[lang]}</span>
          </div>
        ) : null}

        <Field label={t.stage}>
          <div className="mt-1 flex flex-col gap-2">
            {stageOrder.map((s) => {
              const active = s === stage;
              const accent = stageColors[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className="flex items-center gap-2.5 text-start transition-colors"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${active ? accent : palette.border}`,
                    backgroundColor: active ? `${accent}12` : palette.surface,
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      border: `2px solid ${active ? accent : palette.borderStrong}`,
                      backgroundColor: active ? accent : "transparent",
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? palette.text : palette.muted }}>
                    {stageLabels[s][lang]}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="mt-4">
          <Field label={t.date}>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={t.note}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t.save}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
