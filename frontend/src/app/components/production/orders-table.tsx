import { Eye, ArrowRightLeft } from "lucide-react";
import {
  palette,
  prodText,
  productLabels,
  stageLabels,
  stageColors,
  paymentLabels,
  paymentColors,
  deadlineColors,
  orderTotalCost,
  initialsOf,
} from "../../pages/production-data";
import type { Order } from "../../pages/production-data";
import { useLanguage } from "../../language-context";
import { Badge } from "../kit";

export function OrdersTable({
  rows,
  selectedId,
  onSelect,
  onChangeStage,
}: {
  rows: Order[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChangeStage: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = prodText[lang];
  const cur = t.currency;

  const headStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    padding: "0 14px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 940 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={headStyle}>{t.cols.number}</th>
            <th style={headStyle}>{t.cols.customer}</th>
            <th style={headStyle}>{t.cols.product}</th>
            <th style={headStyle}>{t.cols.quantity}</th>
            <th style={headStyle}>{t.cols.delivery}</th>
            <th style={headStyle}>{t.cols.stage}</th>
            <th style={headStyle}>{t.cols.workers}</th>
            <th style={headStyle}>{t.cols.cost}</th>
            <th style={headStyle}>{t.cols.payment}</th>
            <th style={{ ...headStyle, textAlign: "center" }}>{t.cols.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const accent = stageColors[o.stage];
            const selected = o.id === selectedId;
            return (
              <tr
                key={o.id}
                onClick={() => onSelect(o.id)}
                className="cursor-pointer transition-colors"
                style={{
                  borderBottom: `1px solid ${palette.border}`,
                  backgroundColor: selected ? "rgba(18,60,74,0.05)" : "transparent",
                }}
              >
                <td style={{ ...cellStyle, direction: "ltr", fontWeight: 800, color: palette.primary }}>
                  #{o.number}
                </td>
                <td style={{ ...cellStyle, fontWeight: 600 }}>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: deadlineColors[o.deadline],
                      }}
                      title={o.deadline}
                    />
                    {o.customer[lang]}
                  </div>
                </td>
                <td style={cellStyle}>{productLabels[o.product][lang]}</td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>{o.quantity}</td>
                <td style={{ ...cellStyle, direction: "ltr", textAlign: "start", color: palette.muted }}>
                  {o.deliveryDate}
                </td>
                <td style={cellStyle}>
                  <Badge bg={`${accent}1f`} fg={accent} dot={accent}>
                    {stageLabels[o.stage][lang]}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex items-center">
                    {o.workers.slice(0, 3).map((w, i) => (
                      <span
                        key={w}
                        title={w}
                        className="flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
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
                    {o.workers.length > 3 ? (
                      <span
                        className="flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          backgroundColor: palette.bg,
                          color: palette.muted,
                          fontSize: 10,
                          fontWeight: 700,
                          border: `1.5px solid ${palette.surface}`,
                          marginInlineStart: -8,
                        }}
                      >
                        +{o.workers.length - 3}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>
                  {orderTotalCost(o).toLocaleString()}{" "}
                  <span style={{ fontWeight: 500, fontSize: 12, color: palette.muted }}>{cur}</span>
                </td>
                <td style={cellStyle}>
                  <Badge bg={`${paymentColors[o.payment]}1f`} fg={paymentColors[o.payment]} dot={paymentColors[o.payment]}>
                    {paymentLabels[o.payment][lang]}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      title={t.panel.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(o.id);
                      }}
                      className="flex items-center justify-center transition-colors hover:bg-black/5"
                      style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${palette.border}`, color: palette.primary }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      title={t.panel.changeStage}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeStage(o.id);
                      }}
                      className="flex items-center justify-center transition-colors hover:bg-black/5"
                      style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${palette.border}`, color: palette.muted }}
                    >
                      <ArrowRightLeft size={16} />
                    </button>
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
