import {
  Phone,
  Layers,
  Boxes,
  Ruler,
  Palette,
  CalendarPlus,
  CalendarClock,
  Users,
  Package,
  CreditCard,
  Pencil,
  ArrowRightLeft,
  UserPlus,
  Link2,
  Coins,
  Truck,
  Check,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  palette,
  prodText,
  productLabels,
  stageLabels,
  stageColors,
  deadlineLabels,
  deadlineColors,
  paymentLabels,
  paymentColors,
  priorityLabels,
  orderMaterialCost,
  orderTotalCost,
  orderMargin,
} from "../../pages/production-data";
import type { Order } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Badge, Button } from "../kit";

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ fontSize: 12.5 }}>
      <span className="flex items-center gap-1.5" style={{ color: palette.muted }}>
        <Icon size={14} strokeWidth={1.9} />
        {label}
      </span>
      <span style={{ fontWeight: 600, color: palette.text, textAlign: "end" }}>{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
      <Icon size={14} strokeWidth={2} style={{ color: palette.primary }} />
      <span style={{ fontSize: 12, fontWeight: 800, color: palette.text, letterSpacing: 0.1 }}>{children}</span>
    </div>
  );
}

function HorizontalTimeline({ order }: { order: Order }) {
  const { lang } = useLanguage();
  return (
    <div className="flex items-start">
      {order.timeline.map((step, i) => {
        const done = step.date !== null;
        const accent = stageColors[step.stage];
        const last = i === order.timeline.length - 1;
        return (
          <div key={step.stage} className="flex flex-1 flex-col items-center" style={{ minWidth: 60, paddingInline: i === 0 ? "0 4px" : last ? "4px 0" : "0" }}>
            <div className="flex w-full items-center">
              {/* trailing connector (start side) */}
              <span
                style={{
                  height: 2,
                  flex: 1,
                  backgroundColor: i === 0 ? "transparent" : done ? accent : palette.border,
                }}
              />
              <span
                className="flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  flexShrink: 0,
                  backgroundColor: done ? accent : palette.surface,
                  border: `2px solid ${done ? accent : palette.borderStrong}`,
                  color: "#fff",
                }}
              >
                {done ? <Check size={10} strokeWidth={3} /> : null}
              </span>
              <span
                style={{
                  height: 2,
                  flex: 1,
                  backgroundColor: last ? "transparent" : order.timeline[i + 1].date ? stageColors[order.timeline[i + 1].stage] : palette.border,
                }}
              />
            </div>
            <div className="mt-1.5 text-center">
              <div style={{ fontSize: 10.5, fontWeight: done ? 700 : 500, color: done ? palette.text : palette.muted, lineHeight: 1.3 }}>
                {stageLabels[step.stage][lang]}
              </div>
              {step.date ? (
                <div style={{ direction: "ltr", fontSize: 9.5, color: palette.muted }}>{step.date.slice(5)}</div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrderDetailsBar({
  order,
  onClose,
  onChangeStage,
  onAssign,
  onLink,
}: {
  order: Order;
  onClose: () => void;
  onChangeStage: () => void;
  onAssign: () => void;
  onLink: () => void;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const cur = t.currency;

  const accent = stageColors[order.stage];
  const dl = deadlineColors[order.deadline];
  const mat = orderMaterialCost(order);
  const total = orderTotalCost(order);
  const margin = orderMargin(order);

  const costLine = (label: string, value: string, opts?: { strong?: boolean; color?: string }) => (
    <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
      <span style={{ color: palette.muted }}>{label}</span>
      <span style={{ fontWeight: opts?.strong ? 800 : 600, color: opts?.color ?? palette.text }}>
        {value} <span style={{ fontSize: 10.5, fontWeight: 600, color: palette.muted }}>{cur}</span>
      </span>
    </div>
  );

  return (
    <div
      className="relative animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        overflow: "hidden",
      }}
    >
      {/* Top strip: identity + actions */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
        style={{ backgroundColor: "rgba(18,60,74,0.04)", borderBottom: `1px solid ${palette.border}` }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11.5, color: palette.muted }}>{t.panel.title}</span>
            <span style={{ direction: "ltr", fontSize: 18, fontWeight: 800, color: palette.primary }}>
              #{order.number}
            </span>
          </div>
          <span style={{ width: 1, height: 22, backgroundColor: palette.border }} className="hidden sm:block" />
          <span style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>{order.customer[lang]}</span>
          <Badge bg={`${accent}1f`} fg={accent} dot={accent}>
            {stageLabels[order.stage][lang]}
          </Badge>
          <Badge bg={`${dl}1f`} fg={dl} dot={dl}>
            {deadlineLabels[order.deadline][lang]}
          </Badge>
          {order.priority === "urgent" ? (
            <Badge bg="rgba(201,138,134,0.16)" fg="#b46a66" dot="#b46a66">
              {priorityLabels.urgent[lang]}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => {}}>
            <Pencil size={15} />
            {t.panel.edit}
          </Button>
          <Button variant="secondary" onClick={onChangeStage}>
            <ArrowRightLeft size={15} />
            {t.panel.changeStage}
          </Button>
          <Button variant="secondary" onClick={onAssign}>
            <UserPlus size={15} />
            {t.panel.assign}
          </Button>
          <Button variant="secondary" onClick={onLink}>
            <Link2 size={15} />
            {t.panel.link}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Coins size={15} />
            {t.panel.recordCost}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            <Truck size={15} />
            {t.panel.deliver}
          </Button>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{ width: 34, height: 34, borderRadius: 10, color: palette.muted, border: `1px solid ${palette.border}` }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal columns */}
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Col 1: order info */}
        <div className="flex flex-col gap-2.5 xl:border-e xl:pe-5" style={{ borderColor: palette.border }}>
          <InfoRow icon={Phone} label={t.panel.phone} value={<span style={{ direction: "ltr" }}>{order.phone}</span>} />
          <InfoRow icon={Layers} label={t.panel.product} value={productLabels[order.product][lang]} />
          <InfoRow icon={Boxes} label={t.panel.quantity} value={`${order.quantity} ${lang === "ar" ? "قطعة" : "pcs"}`} />
          <InfoRow icon={Ruler} label={t.panel.sizes} value={<span style={{ direction: "ltr" }}>{order.sizes}</span>} />
          <InfoRow
            icon={Palette}
            label={t.panel.colors}
            value={
              <span className="inline-flex items-center gap-1">
                {order.colors.map((c) => (
                  <span
                    key={c.hex}
                    title={c.label[lang]}
                    style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: c.hex, border: `1px solid ${palette.borderStrong}` }}
                  />
                ))}
              </span>
            }
          />
          <InfoRow icon={CalendarPlus} label={t.panel.received} value={<span style={{ direction: "ltr" }}>{order.receivedDate}</span>} />
          <InfoRow icon={CalendarClock} label={t.panel.delivery} value={<span style={{ direction: "ltr" }}>{order.deliveryDate}</span>} />
          <InfoRow
            icon={CreditCard}
            label={t.panel.payment}
            value={
              <Badge bg={`${paymentColors[order.payment]}1f`} fg={paymentColors[order.payment]} dot={paymentColors[order.payment]}>
                {paymentLabels[order.payment][lang]}
              </Badge>
            }
          />
        </div>

        {/* Col 2: workers + materials */}
        <div className="flex flex-col gap-4 xl:border-e xl:pe-5" style={{ borderColor: palette.border }}>
          <div>
            <SectionTitle icon={Users}>{t.panel.workers}</SectionTitle>
            {order.workers.length === 0 ? (
              <div style={{ fontSize: 12, color: palette.muted }}>{t.panel.noWorkers}</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {order.workers.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: palette.bg,
                      border: `1px solid ${palette.border}`,
                      borderRadius: 999,
                      padding: "3px 9px 3px 3px",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: palette.text,
                    }}
                  >
                    <span
                      className="flex items-center justify-center"
                      style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: palette.accentSoft, color: palette.accent, fontSize: 9.5, fontWeight: 700 }}
                    >
                      {w.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                    </span>
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <SectionTitle icon={Package}>{t.panel.materials}</SectionTitle>
            <div className="flex flex-col gap-1">
              {order.materials.map((m) => (
                <div key={m.name.ar} className="flex items-center justify-between gap-2" style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: palette.text }}>{m.name[lang]}</span>
                  <span style={{ color: palette.muted }}>
                    {m.qty} {m.unit[lang]} · {(m.qty * m.unitCost).toLocaleString()} {cur}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: cost summary */}
        <div className="flex flex-col xl:border-e xl:pe-5" style={{ borderColor: palette.border }}>
          <SectionTitle icon={Coins}>{t.panel.costTitle}</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {costLine(t.panel.materialCost, mat.toLocaleString())}
            {costLine(t.panel.laborCost, order.laborCost.toLocaleString())}
            {costLine(t.panel.extraCost, order.extraCost.toLocaleString())}
            <div style={{ height: 1, backgroundColor: palette.border, margin: "3px 0" }} />
            {costLine(t.panel.totalCost, total.toLocaleString(), { strong: true, color: palette.primary })}
            {costLine(t.panel.margin, margin.toLocaleString(), { strong: true, color: margin >= 0 ? "#4d8a6a" : "#b46a66" })}
          </div>
          {order.notes[lang] ? (
            <div className="mt-3">
              <div style={{ fontSize: 11, color: palette.muted, marginBottom: 4 }}>{t.panel.notes}</div>
              <div
                style={{
                  backgroundColor: palette.bg,
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                  padding: "8px 10px",
                  fontSize: 11.5,
                  color: palette.text,
                  lineHeight: 1.55,
                }}
              >
                {order.notes[lang]}
              </div>
            </div>
          ) : null}
        </div>

        {/* Col 4: timeline */}
        <div className="flex flex-col min-w-0">
          <SectionTitle icon={CalendarClock}>{t.panel.timelineTitle}</SectionTitle>
          <div className="mt-2 overflow-x-auto pb-2 custom-scrollbar">
            <div className="min-w-max">
              <HorizontalTimeline order={order} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
