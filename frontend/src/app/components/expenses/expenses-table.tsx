import { palette, expensesText, categoryLabels, typeLabels, methodLabels, linkLabels, typeColors, methodColors } from "../../pages/expenses-data";
import type { ExpenseRecord } from "../../pages/expenses-data";
import { useLanguage } from "../../language-context";
import { Badge } from "../kit";

export function ExpensesTable({
  records,
  selectedId,
  onSelect,
}: {
  records: ExpenseRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { lang, dir } = useLanguage();
  const t = expensesText[lang].table;
  const cur = expensesText[lang].currency;

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

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground" style={{ color: palette.muted }}>
        {t.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-start" style={{ borderCollapse: "collapse", minWidth: 1000 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={thStyle}>{t.name}</th>
            <th style={thStyle}>{t.category}</th>
            <th style={thStyle}>{t.type}</th>
            <th style={thStyle}>{t.date}</th>
            <th style={thStyle}>{t.amount}</th>
            <th style={thStyle}>{t.method}</th>
            <th style={thStyle}>{t.linkedTo}</th>
            <th style={thStyle}>{t.notes}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => {
            const active = selectedId === rec.id;
            const tColor = typeColors[rec.type];
            const mColor = methodColors[rec.paymentMethod];

            return (
              <tr
                key={rec.id}
                onClick={() => onSelect(rec.id)}
                className="group transition-colors hover:bg-black/5 cursor-pointer"
                style={{
                  borderBottom: `1px solid ${palette.border}`,
                  backgroundColor: active ? `${palette.primary}08` : "transparent",
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {rec.name[lang]}
                </td>
                <td style={{ ...tdStyle, color: palette.muted }}>
                  {categoryLabels[rec.category][lang]}
                </td>
                <td style={tdStyle}>
                  <Badge bg={`${tColor}12`} fg={tColor}>{typeLabels[rec.type][lang]}</Badge>
                </td>
                <td style={{ ...tdStyle, color: palette.muted, direction: "ltr", textAlign: dir === "rtl" ? "right" : "left" }}>
                  {rec.date}
                </td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>
                  {rec.amount.toLocaleString()} <span style={{ fontSize: 11, color: palette.muted, fontWeight: 600 }}>{cur}</span>
                </td>
                <td style={tdStyle}>
                  <Badge bg={`${mColor}1f`} fg={mColor} dot={mColor}>{methodLabels[rec.paymentMethod][lang]}</Badge>
                </td>
                <td style={{ ...tdStyle, color: palette.muted }}>
                  {linkLabels[rec.linkedTo][lang]}
                </td>
                <td style={{ ...tdStyle, color: palette.muted, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {rec.notes[lang] || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
