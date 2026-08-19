import { useState } from "react";
import { CalendarClock, Layers } from "lucide-react";
import {
  palette,
  prodText,
  productLabels,
  deadlineLabels,
  deadlineColors,
  priorityLabels,
  orderTotalCost,
  initialsOf,
} from "../../pages/production-data";
import type { Order } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Badge } from "../kit";

export function OrderCard({
  order,
  selected,
  onSelect,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const cur = t.currency;
  const [hover, setHover] = useState(false);

  const dl = deadlineColors[order.deadline];
  const cost = orderTotalCost(order);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full text-start transition-all duration-150"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 14,
        border: `1px solid ${selected ? palette.primary : hover ? palette.borderStrong : palette.border}`,
        boxShadow: selected
          ? "0 10px 26px -14px rgba(18,60,74,0.4)"
          : hover
          ? "0 8px 20px -14px rgba(18,60,74,0.3)"
          : "0 1px 4px -2px rgba(18,60,74,0.12)",
        padding: 13,
        outline: selected ? `1px solid ${palette.primary}` : "none",
      }}
    >
      {/* Top: order number + priority */}
      <div className="flex items-center justify-between gap-2">
        <span style={{ direction: "ltr", fontSize: 13, fontWeight: 800, color: palette.primary }}>
          #{order.number}
        </span>
        {order.priority === "urgent" ? (
          <Badge bg="rgba(201,138,134,0.16)" fg="#b46a66" dot="#b46a66">
            {priorityLabels.urgent[lang]}
          </Badge>
        ) : null}
      </div>

      {/* Customer */}
      <div className="mt-1.5" style={{ fontSize: 14, fontWeight: 700, color: palette.text, lineHeight: 1.3 }}>
        {order.customer[lang]}
      </div>

      {/* Product + qty */}
      <div className="mt-1 flex items-center gap-1.5" style={{ fontSize: 12, color: palette.muted }}>
        <Layers size={13} strokeWidth={1.9} />
        <span>{productLabels[order.product][lang]}</span>
        <span style={{ color: palette.borderStrong }}>•</span>
        <span>
          {order.quantity} {lang === "ar" ? "قطعة" : "pcs"}
        </span>
      </div>

      {/* Delivery date + deadline badge */}
      <div
        className="mt-2.5 flex items-center justify-between gap-2 pt-2.5"
        style={{ borderTop: `1px solid ${palette.border}` }}
      >
        <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: palette.muted }}>
          <CalendarClock size={13} strokeWidth={1.9} />
          <span style={{ direction: "ltr" }}>{order.deliveryDate}</span>
        </span>
        <span
          className="inline-flex items-center gap-1"
          style={{ fontSize: 11, fontWeight: 700, color: dl }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: dl }} />
          {deadlineLabels[order.deadline][lang]}
        </span>
      </div>

      {/* Footer: workers + cost */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center" style={{ flexShrink: 0 }}>
          {order.workers.slice(0, 3).map((w, i) => (
            <span
              key={w}
              className="flex items-center justify-center"
              title={w}
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: palette.accentSoft,
                color: palette.accent,
                fontSize: 10.5,
                fontWeight: 700,
                border: `1.5px solid ${palette.surface}`,
                marginInlineStart: i === 0 ? 0 : -8,
              }}
            >
              {initialsOf(w)}
            </span>
          ))}
          {order.workers.length > 3 ? (
            <span
              className="flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: palette.bg,
                color: palette.muted,
                fontSize: 10,
                fontWeight: 700,
                border: `1.5px solid ${palette.surface}`,
                marginInlineStart: -8,
              }}
            >
              +{order.workers.length - 3}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 text-end">
          <div style={{ fontSize: 9.5, color: palette.muted }}>{t.estCost}</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: palette.text }}>
            {cost.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 600, color: palette.muted }}>{cur}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
