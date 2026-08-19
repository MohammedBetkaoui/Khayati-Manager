import { palette, salesText, paymentStatusColors, paymentStatusLabels, paymentMethodLabels } from "../../pages/sales-data";
import type { Invoice } from "../../pages/sales-data";
import { useLanguage } from "../../language-context";
import { Badge } from "../kit";

export function InvoicesTable({
  invoices,
  selectedId,
  onSelect,
}: {
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { lang, dir } = useLanguage();
  const t = salesText[lang].table;
  const cur = salesText[lang].currency;

  const thStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  if (invoices.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground" style={{ color: palette.muted }}>
        {t.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-start" style={{ borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={thStyle}>{t.number}</th>
            <th style={thStyle}>{t.customer}</th>
            <th style={thStyle}>{t.order}</th>
            <th style={thStyle}>{t.date}</th>
            <th style={thStyle}>{t.total}</th>
            <th style={thStyle}>{t.paid}</th>
            <th style={thStyle}>{t.remaining}</th>
            <th style={thStyle}>{t.status}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const active = selectedId === inv.id;
            const statusColor = paymentStatusColors[inv.status];

            return (
              <tr
                key={inv.id}
                onClick={() => onSelect(inv.id)}
                className="group transition-colors hover:bg-black/5 cursor-pointer"
                style={{
                  borderBottom: `1px solid ${palette.border}`,
                  backgroundColor: active ? `${palette.primary}08` : "transparent",
                }}
              >
                <td style={{ ...tdStyle, direction: "ltr", fontWeight: 800, color: palette.primary }}>
                  #{inv.number}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{inv.customerName[lang]}</td>
                <td style={{ ...tdStyle, color: palette.muted }}>
                  {inv.items[0]?.description[lang]} {inv.items.length > 1 ? `+${inv.items.length - 1}` : ""}
                </td>
                <td style={{ ...tdStyle, direction: "ltr", color: palette.muted, textAlign: dir === "rtl" ? "right" : "left" }}>
                  {inv.date}
                </td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>
                  {inv.total.toLocaleString()} <span style={{ fontSize: 11, color: palette.muted, fontWeight: 600 }}>{cur}</span>
                </td>
                <td style={{ ...tdStyle, color: palette.primary, fontWeight: 600 }}>
                  {inv.paid.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, color: inv.remaining > 0 ? "#b46a66" : palette.muted, fontWeight: inv.remaining > 0 ? 700 : 500 }}>
                  {inv.remaining.toLocaleString()}
                </td>
                <td style={tdStyle}>
                  <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                    {paymentStatusLabels[inv.status][lang]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
