import { palette, salaryText, paymentStatusColors, paymentStatusLabels, salaryTypeLabels, roleLabels } from "../../pages/salary-data";
import type { PayrollRecord } from "../../pages/salary-data";
import { useLanguage } from "../../language-context";
import { Badge } from "../kit";

export function PayrollTable({
  records,
  selectedId,
  onSelect,
}: {
  records: PayrollRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { lang, dir } = useLanguage();
  const t = salaryText[lang].table;
  const cur = salaryText[lang].currency;

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
      <table className="w-full text-start" style={{ borderCollapse: "collapse", minWidth: 1100 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={thStyle}>{t.worker}</th>
            <th style={thStyle}>{t.role}</th>
            <th style={thStyle}>{t.type}</th>
            <th style={thStyle}>{t.period}</th>
            <th style={thStyle}>{t.base}</th>
            <th style={thStyle}>{t.pieces}</th>
            <th style={thStyle}>{t.bonus}</th>
            <th style={thStyle}>{t.deduction}</th>
            <th style={thStyle}>{t.advance}</th>
            <th style={thStyle}>{t.net}</th>
            <th style={thStyle}>{t.status}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => {
            const active = selectedId === rec.id;
            const statusColor = paymentStatusColors[rec.status];
            const initials = rec.workerName[lang].split(" ").slice(0, 2).map(w => w[0]).join("");

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
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: palette.accentSoft,
                        color: palette.accent,
                        fontSize: 12,
                      }}
                    >
                      {initials}
                    </span>
                    <span>{rec.workerName[lang]}</span>
                  </div>
                </td>
                <td style={tdStyle}>
                  <Badge bg={`${palette.border}`} fg={palette.muted}>{roleLabels[rec.role][lang]}</Badge>
                </td>
                <td style={tdStyle}>
                  <Badge bg={`${palette.primary}12`} fg={palette.primary}>{salaryTypeLabels[rec.salaryType][lang]}</Badge>
                </td>
                <td style={{ ...tdStyle, color: palette.muted, direction: "ltr", textAlign: dir === "rtl" ? "right" : "left" }}>
                  {rec.period}
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{rec.baseSalary.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: palette.muted }}>{rec.piecesCount > 0 ? rec.piecesCount : "-"}</td>
                <td style={{ ...tdStyle, color: rec.bonuses > 0 ? "#4d8a6a" : palette.muted }}>{rec.bonuses > 0 ? `+${rec.bonuses.toLocaleString()}` : "-"}</td>
                <td style={{ ...tdStyle, color: rec.deductions > 0 ? "#b46a66" : palette.muted }}>{rec.deductions > 0 ? `-${rec.deductions.toLocaleString()}` : "-"}</td>
                <td style={{ ...tdStyle, color: rec.advances > 0 ? "#a87d3c" : palette.muted }}>{rec.advances > 0 ? `-${rec.advances.toLocaleString()}` : "-"}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>
                  {rec.netSalary.toLocaleString()} <span style={{ fontSize: 11, color: palette.muted, fontWeight: 600 }}>{cur}</span>
                </td>
                <td style={tdStyle}>
                  <Badge bg={`${statusColor}1f`} fg={statusColor} dot={statusColor}>
                    {paymentStatusLabels[rec.status][lang]}
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
