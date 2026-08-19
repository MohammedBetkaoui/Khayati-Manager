import { ArrowRightLeft, Eye, Pencil, Trash2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLanguage } from "../../language-context";
import {
  palette,
  priorityLabels,
  productionText,
  statusColors,
  statusLabels,
  type OrderListItem,
} from "../../pages/production-data";
import { Avatar, Badge } from "../kit";

export function OrdersTable({
  rows,
  onView,
  onEdit,
  onChangeStatus,
  onDelete,
}: {
  rows: OrderListItem[];
  onView: (order: OrderListItem) => void;
  onEdit: (order: OrderListItem) => void;
  onChangeStatus: (order: OrderListItem) => void;
  onDelete: (order: OrderListItem) => void;
}) {
  const { lang } = useLanguage();
  const text = productionText[lang];
  const headStyle: CSSProperties = {
    padding: "12px 13px",
    color: palette.muted,
    fontSize: 11.5,
    fontWeight: 700,
    textAlign: "start",
    whiteSpace: "nowrap",
  };
  const cellStyle: CSSProperties = {
    padding: "13px",
    color: palette.text,
    fontSize: 13,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  if (rows.length === 0) {
    return (
      <div
        className="flex min-h-48 items-center justify-center"
        style={{ color: palette.muted, fontSize: 13.5 }}
      >
        {text.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ borderCollapse: "collapse", minWidth: 1240 }}
      >
        <thead style={{ backgroundColor: "rgba(18,60,74,.035)" }}>
          <tr>
            <th style={headStyle}>{text.columns.number}</th>
            <th style={headStyle}>{text.columns.customer}</th>
            <th style={headStyle}>{text.columns.product}</th>
            <th style={headStyle}>{text.columns.quantity}</th>
            <th style={headStyle}>{text.columns.color}</th>
            <th style={headStyle}>{text.columns.received}</th>
            <th style={headStyle}>{text.columns.delivery}</th>
            <th style={headStyle}>{text.columns.responsible}</th>
            <th style={headStyle}>{text.columns.status}</th>
            <th style={headStyle}>{text.columns.cost}</th>
            <th style={{ ...headStyle, textAlign: "center" }}>
              {text.columns.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => {
            const accent = statusColors[order.statusCode];
            return (
              <tr
                key={order.id}
                className="transition-colors hover:bg-black/[.018]"
                style={{ borderTop: `1px solid ${palette.border}` }}
              >
                <td
                  style={{
                    ...cellStyle,
                    direction: "ltr",
                    color: palette.primary,
                    fontWeight: 800,
                  }}
                >
                  {order.orderNumber}
                </td>
                <td style={cellStyle}>
                  <button
                    type="button"
                    onClick={() => onView(order)}
                    className="text-start"
                    style={{ fontWeight: 700, color: palette.text }}
                  >
                    {order.customer}
                    <span
                      className="block"
                      style={{
                        color: palette.muted,
                        fontSize: 10.5,
                        fontWeight: 500,
                        direction: "ltr",
                      }}
                    >
                      {order.customerPhone}
                    </span>
                  </button>
                </td>
                <td style={{ ...cellStyle, fontWeight: 600 }}>
                  {order.product}
                </td>
                <td
                  style={{ ...cellStyle, textAlign: "center", fontWeight: 800 }}
                >
                  {order.quantity}
                </td>
                <td style={cellStyle}>{order.color}</td>
                <td
                  style={{
                    ...cellStyle,
                    direction: "ltr",
                    color: palette.muted,
                  }}
                >
                  {order.receivedDate || "-"}
                </td>
                <td
                  style={{
                    ...cellStyle,
                    direction: "ltr",
                    color: order.delayed ? "#b46a66" : palette.text,
                    fontWeight: order.delayed ? 800 : 500,
                  }}
                >
                  {order.deliveryDate || "-"}
                </td>
                <td style={cellStyle}>
                  {order.responsible !== "-" ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={order.responsible} size={28} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {order.responsible}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: palette.muted }}>-</span>
                  )}
                </td>
                <td style={cellStyle}>
                  <div className="flex flex-col items-start gap-1">
                    <Badge bg={`${accent}18`} fg={accent} dot={accent}>
                      {statusLabels[order.statusCode][lang]}
                    </Badge>
                    {order.priorityCode === "URGENT" ? (
                      <span
                        style={{
                          color: "#b46a66",
                          fontSize: 10.5,
                          fontWeight: 800,
                        }}
                      >
                        {priorityLabels.URGENT[lang]}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td style={{ ...cellStyle, direction: "ltr", fontWeight: 800 }}>
                  {order.cost.toLocaleString()}{" "}
                  <span style={{ color: palette.muted, fontSize: 10.5 }}>
                    {text.currency}
                  </span>
                </td>
                <td style={cellStyle}>
                  <div className="flex items-center justify-center gap-1.5">
                    <ActionButton
                      label={text.actions.view}
                      color={palette.primary}
                      onClick={() => onView(order)}
                    >
                      <Eye size={15} />
                    </ActionButton>
                    <ActionButton
                      label={text.actions.edit}
                      color="#6b8aa0"
                      onClick={() => onEdit(order)}
                    >
                      <Pencil size={15} />
                    </ActionButton>
                    <ActionButton
                      label={text.actions.status}
                      color="#a87d3c"
                      onClick={() => onChangeStatus(order)}
                    >
                      <ArrowRightLeft size={15} />
                    </ActionButton>
                    <ActionButton
                      label={text.actions.delete}
                      color="#b46a66"
                      onClick={() => onDelete(order)}
                    >
                      <Trash2 size={15} />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center transition-transform hover:-translate-y-0.5"
      style={{
        width: 31,
        height: 31,
        borderRadius: 9,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
        color,
      }}
    >
      {children}
    </button>
  );
}
