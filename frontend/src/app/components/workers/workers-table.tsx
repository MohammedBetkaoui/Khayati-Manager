import { Eye, Pencil, StickyNote, Trash2 } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Avatar, Badge, ProgressBar } from "../kit";
import {
  roleColors,
  roleLabels,
  salaryLabels,
  statusColors,
  statusLabels,
  workersText,
  type Worker,
} from "../../pages/workers-data";

function ActionIcon({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  danger?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center transition-colors hover:opacity-80"
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        color: danger ? palette.rose : palette.muted,
      }}
    >
      <Icon size={16} strokeWidth={1.9} />
    </button>
  );
}

export function WorkersTable({
  rows,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  rows: Worker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = workersText[lang];

  const headStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: palette.muted,
    textAlign: "start",
    padding: "0 14px 12px",
    whiteSpace: "nowrap",
  };
  const cellStyle: React.CSSProperties = {
    padding: "14px",
    fontSize: 13.5,
    color: palette.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 920 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={headStyle}>{t.cols.name}</th>
            <th style={headStyle}>{t.cols.role}</th>
            <th style={headStyle}>{t.cols.phone}</th>
            <th style={headStyle}>{t.cols.start}</th>
            <th style={headStyle}>{t.cols.salary}</th>
            <th style={headStyle}>{t.cols.attendance}</th>
            <th style={headStyle}>{t.cols.pieces}</th>
            <th style={{ ...headStyle, minWidth: 130 }}>{t.cols.productivity}</th>
            <th style={headStyle}>{t.cols.status}</th>
            <th style={{ ...headStyle, textAlign: "center" }}>{t.cols.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => {
            const selected = w.id === selectedId;
            const present = w.attendance === "present";
            return (
              <tr
                key={w.id}
                onClick={() => onSelect(w.id)}
                className="cursor-pointer transition-colors"
                style={{
                  borderBottom: `1px solid ${palette.border}`,
                  backgroundColor: selected ? "rgba(18,60,74,0.045)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = palette.bg;
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <td style={cellStyle}>
                  <div className="flex items-center gap-3">
                    <Avatar name={w.name[lang]} />
                    <span style={{ fontWeight: 600 }}>{w.name[lang]}</span>
                  </div>
                </td>
                <td style={cellStyle}>
                  <Badge bg={roleColors[w.role].bg} fg={roleColors[w.role].fg}>
                    {roleLabels[w.role][lang]}
                  </Badge>
                </td>
                <td style={{ ...cellStyle, direction: "ltr", color: palette.muted }}>{w.phone}</td>
                <td style={{ ...cellStyle, color: palette.muted }}>{w.startDate}</td>
                <td style={cellStyle}>
                  <Badge bg={palette.bg} fg={palette.text}>
                    {salaryLabels[w.salaryType][lang]}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ color: present ? "#4d8a6a" : "#b46a66", fontWeight: 600, fontSize: 12.5 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: present ? "#4d8a6a" : "#b46a66",
                      }}
                    />
                    {present ? t.present : t.absent}
                  </span>
                </td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>{w.pieces}</td>
                <td style={cellStyle}>
                  <ProgressBar value={w.productivity} />
                </td>
                <td style={cellStyle}>
                  <Badge
                    bg={`${statusColors[w.status]}1f`}
                    fg={statusColors[w.status]}
                    dot={statusColors[w.status]}
                  >
                    {statusLabels[w.status][lang]}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex items-center justify-center gap-0.5">
                    <ActionIcon icon={Eye} label={t.view} onClick={(e) => { e.stopPropagation(); onSelect(w.id); }} />
                    <ActionIcon icon={Pencil} label={t.edit} onClick={(e) => { e.stopPropagation(); onEdit?.(w.id); }} />
                    <ActionIcon icon={StickyNote} label={t.notes} onClick={(e) => e.stopPropagation()} />
                    <ActionIcon icon={Trash2} label={t.delete} danger onClick={(e) => { e.stopPropagation(); onDelete?.(w.id); }} />
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
