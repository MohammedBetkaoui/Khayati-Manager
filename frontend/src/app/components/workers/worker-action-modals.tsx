import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, StickyNote, X } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button, Field, Select, TextInput } from "../kit";
import type { Worker } from "../../pages/workers-data";

export type AttendanceForm = {
  date: string;
  status: "present" | "absent" | "late";
  checkInTime: string;
  checkOutTime: string;
  lateMinutes: string;
  notes: string;
};

export type NoteForm = {
  notes: string;
};

function todayDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function ModalShell({
  open,
  title,
  icon,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { dir } = useLanguage();

  if (!open) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(18,60,74,0.28)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: palette.surface,
          borderRadius: 22,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 30px 70px -30px rgba(18,60,74,0.5)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${palette.border}` }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: 18, fontWeight: 800, color: palette.text }}>
            {icon}
            {title}
          </h2>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{ width: 34, height: 34, borderRadius: 10, color: palette.muted, border: `1px solid ${palette.border}` }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MarkAttendanceModal({
  open,
  worker,
  onClose,
  onSubmit,
  isSaving = false,
}: {
  open: boolean;
  worker: Worker | null;
  onClose: () => void;
  onSubmit: (form: AttendanceForm) => void | Promise<void>;
  isSaving?: boolean;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState<AttendanceForm>({
    date: todayDate(),
    status: "present",
    checkInTime: "08:00",
    checkOutTime: "",
    lateMinutes: "0",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        date: todayDate(),
        status: "present",
        checkInTime: "08:00",
        checkOutTime: "",
        lateMinutes: "0",
        notes: "",
      });
    }
  }, [open, worker?.id]);

  const text = useMemo(
    () => ({
      title: lang === "ar" ? "تسجيل الحضور" : "Marquer la présence",
      date: lang === "ar" ? "التاريخ" : "Date",
      status: lang === "ar" ? "الحالة" : "Statut",
      present: lang === "ar" ? "حاضر" : "Présent",
      absent: lang === "ar" ? "غائب" : "Absent",
      late: lang === "ar" ? "متأخر" : "En retard",
      checkIn: lang === "ar" ? "وقت الدخول" : "Heure d'entrée",
      checkOut: lang === "ar" ? "وقت الخروج" : "Heure de sortie",
      lateMinutes: lang === "ar" ? "دقائق التأخر" : "Minutes de retard",
      notes: lang === "ar" ? "ملاحظات" : "Notes",
      save: lang === "ar" ? "حفظ الحضور" : "Enregistrer",
      saving: lang === "ar" ? "جاري الحفظ..." : "Enregistrement...",
      cancel: lang === "ar" ? "إلغاء" : "Annuler",
    }),
    [lang],
  );

  return (
    <ModalShell
      open={open && !!worker}
      title={text.title}
      icon={<CalendarCheck size={20} color={palette.primary} />}
      onClose={onClose}
    >
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit(form);
          onClose();
        }}
      >
        <div className="sm:col-span-2">
          <div style={{ fontSize: 13, color: palette.muted }}>
            {worker?.name[lang]}
          </div>
        </div>

        <Field label={text.date}>
          <TextInput
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>

        <Field label={text.status}>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceForm["status"] })}
          >
            <option value="present">{text.present}</option>
            <option value="absent">{text.absent}</option>
            <option value="late">{text.late}</option>
          </Select>
        </Field>

        <Field label={text.checkIn}>
          <TextInput
            type="time"
            value={form.checkInTime}
            onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
          />
        </Field>

        <Field label={text.checkOut}>
          <TextInput
            type="time"
            value={form.checkOutTime}
            onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
          />
        </Field>

        <Field label={text.lateMinutes}>
          <TextInput
            min={0}
            type="number"
            value={form.lateMinutes}
            onChange={(e) => setForm({ ...form, lateMinutes: e.target.value })}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={text.notes}>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="outline-none"
              style={{
                width: "100%",
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.surface,
                color: palette.text,
                fontSize: 14,
                padding: "10px 14px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </Field>
        </div>

        <div className="mt-1 flex items-center justify-end gap-3 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            {text.cancel}
          </Button>
          <Button variant="primary" type="submit">
            {isSaving ? text.saving : text.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function AddNoteModal({
  open,
  worker,
  onClose,
  onSubmit,
  isSaving = false,
}: {
  open: boolean;
  worker: Worker | null;
  onClose: () => void;
  onSubmit: (form: NoteForm) => void | Promise<void>;
  isSaving?: boolean;
}) {
  const { lang } = useLanguage();
  const [form, setForm] = useState<NoteForm>({ notes: "" });

  useEffect(() => {
    if (open) setForm({ notes: "" });
  }, [open, worker?.id]);

  const text = {
    title: lang === "ar" ? "إضافة ملاحظة" : "Ajouter une note",
    notes: lang === "ar" ? "الملاحظة الجديدة" : "Nouvelle note",
    latest: lang === "ar" ? "آخر ملاحظة مسجلة" : "Dernière note enregistrée",
    save: lang === "ar" ? "حفظ الملاحظة" : "Enregistrer la note",
    saving: lang === "ar" ? "جاري الحفظ..." : "Enregistrement...",
    cancel: lang === "ar" ? "إلغاء" : "Annuler",
    placeholder: lang === "ar" ? "اكتب ملاحظة واضحة عن العامل..." : "Écrire une note claire sur le travailleur...",
  };

  return (
    <ModalShell
      open={open && !!worker}
      title={text.title}
      icon={<StickyNote size={20} color={palette.accent} />}
      onClose={onClose}
    >
      <form
        className="grid grid-cols-1 gap-4 px-6 py-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit(form);
          onClose();
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: palette.muted }}>{worker?.name[lang]}</div>
        </div>

        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.bg,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: palette.muted, marginBottom: 6 }}>
            {text.latest}
          </div>
          <div style={{ fontSize: 13.5, color: palette.text, lineHeight: 1.7 }}>
            {worker?.note[lang]}
          </div>
        </div>

        <Field label={text.notes}>
          <textarea
            required
            value={form.notes}
            onChange={(e) => setForm({ notes: e.target.value })}
            rows={5}
            placeholder={text.placeholder}
            className="outline-none"
            style={{
              width: "100%",
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              backgroundColor: palette.surface,
              color: palette.text,
              fontSize: 14,
              padding: "10px 14px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </Field>

        <div className="mt-1 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {text.cancel}
          </Button>
          <Button variant="primary" type="submit">
            {isSaving ? text.saving : text.save}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
