import { Phone, CalendarDays, Wallet, Coins, CheckCircle2, Package, Pencil, CalendarCheck, StickyNote, ArrowLeft, ArrowRight, UserRound, X } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Avatar, Badge, Button } from "../kit";
import {
  getRoleColors,
  getRoleLabel,
  salaryLabels,
  statusColors,
  statusLabels,
  workersText,
  type Worker,
} from "../../pages/workers-data";

function Row({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${palette.border}` }}>
      <span className="flex items-center gap-2" style={{ color: palette.muted, fontSize: 13 }}>
        <Icon size={16} strokeWidth={1.9} />
        {label}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: palette.text }}>{value}</span>
    </div>
  );
}

export function WorkerDetailsPanel({
  worker,
  onClose,
  onEdit,
  onMarkAttendance,
  onAddNote,
  onOpenProfile,
}: {
  worker: Worker | null;
  onClose?: () => void;
  onEdit?: (id: string) => void;
  onMarkAttendance?: (id: string) => void;
  onAddNote?: (id: string) => void;
  onOpenProfile?: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = workersText[lang];
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  if (!worker) {
    return null;
  }

  const present = worker.attendance === "present";
  const roleColor = getRoleColors(worker.role);

  return (
    <div
      className="relative"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        overflow: "hidden",
      }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 transition-colors"
          style={{
            insetInlineEnd: 16,
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: palette.bg,
            border: `1px solid ${palette.border}`,
            color: palette.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
      )}

      {/* Header band */}
      <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center" style={{ backgroundColor: "rgba(18,60,74,0.04)" }}>
        <Avatar name={worker.name[lang]} size={64} />
        <div className="mt-3" style={{ fontSize: 17, fontWeight: 800, color: palette.text }}>
          {worker.name[lang]}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge bg={roleColor.bg} fg={roleColor.fg}>
            {getRoleLabel(worker.role, lang)}
          </Badge>
          <Badge bg={`${statusColors[worker.status]}1f`} fg={statusColors[worker.status]} dot={statusColors[worker.status]}>
            {statusLabels[worker.status][lang]}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-4">
        <Row icon={Phone} label={t.panel.phone} value={<span style={{ direction: "ltr" }}>{worker.phone}</span>} />
        <Row icon={CalendarDays} label={t.panel.start} value={worker.startDate} />
        <Row icon={Wallet} label={t.panel.salaryType} value={salaryLabels[worker.salaryType][lang]} />
        <Row icon={Coins} label={t.panel.salaryRate} value={worker.salaryRate[lang]} />
        <Row
          icon={CheckCircle2}
          label={t.panel.attendance}
          value={
            <span style={{ color: present ? "#4d8a6a" : "#b46a66" }}>{present ? t.present : t.absent}</span>
          }
        />
        <Row icon={Package} label={t.panel.pieces} value={worker.pieces} />

        {/* Latest note */}
        <div className="mt-4">
          <div style={{ color: palette.muted, fontSize: 13, marginBottom: 6 }}>{t.panel.latestNote}</div>
          <div
            style={{
              backgroundColor: palette.bg,
              borderRadius: 12,
              border: `1px solid ${palette.border}`,
              padding: "10px 12px",
              fontSize: 13,
              color: palette.text,
              lineHeight: 1.6,
            }}
          >
            {worker.note[lang]}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button variant="primary" full onClick={() => onEdit?.(worker.id)}>
            <Pencil size={16} />
            {t.panel.editData}
          </Button>
          <Button variant="secondary" full onClick={() => onMarkAttendance?.(worker.id)}>
            <CalendarCheck size={16} />
            {t.panel.markAttendance}
          </Button>
          <Button variant="secondary" full onClick={() => onAddNote?.(worker.id)}>
            <StickyNote size={16} />
            {t.panel.addNote}
          </Button>
          <Button variant="secondary" full onClick={() => onOpenProfile?.(worker.id)}>
            {t.panel.fullDetails}
            <Arrow size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
