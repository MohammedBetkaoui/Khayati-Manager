import {
  Eye,
  Pencil,
  ArrowLeftRight,
  Trash2,
  Scissors,
  Disc3,
  Circle,
  ArrowUpDown,
  Package,
  Wrench,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Badge } from "../kit";
import {
  categoryColors,
  categoryLabels,
  statusColors,
  statusLabels,
  stockText,
  stockStatusOf,
  unitLabels,
  type CategoryId,
  type Material,
} from "../../pages/stock-data";

/** Small visual marker per category. */
const categoryIcons: Record<CategoryId, LucideIcon> = {
  fabrics: Layers,
  threads: Disc3,
  buttons: Circle,
  zippers: ArrowUpDown,
  accessories: Scissors,
  packaging: Package,
  tools: Wrench,
};

function ActionIcon({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon;
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

export function StockTable({
  rows,
  selectedId,
  onSelect,
  onEdit,
  onMove,
  onDelete,
}: {
  rows: Material[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onMove?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const t = stockText[lang];

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
      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 980 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
            <th style={headStyle}>{t.cols.name}</th>
            <th style={headStyle}>{t.cols.category}</th>
            <th style={headStyle}>{t.cols.color}</th>
            <th style={headStyle}>{t.cols.type}</th>
            <th style={headStyle}>{t.cols.quantity}</th>
            <th style={headStyle}>{t.cols.unitPrice}</th>
            <th style={headStyle}>{t.cols.supplier}</th>
            <th style={headStyle}>{t.cols.status}</th>
            <th style={{ ...headStyle, textAlign: "center" }}>{t.cols.actions}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const selected = m.id === selectedId;
            const status = stockStatusOf(m);
            const Icon = categoryIcons[m.category];
            const cc = categoryColors[m.category];
            return (
              <tr
                key={m.id}
                onClick={() => onSelect(m.id)}
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
                    <div
                      className="flex shrink-0 items-center justify-center"
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: cc.bg, color: cc.fg }}
                    >
                      <Icon size={17} strokeWidth={1.9} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{m.name[lang]}</span>
                  </div>
                </td>
                <td style={cellStyle}>
                  <Badge bg={cc.bg} fg={cc.fg}>
                    {categoryLabels[m.category][lang]}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  {m.color ? (
                    <span className="inline-flex items-center gap-2" style={{ color: palette.muted, fontSize: 13 }}>
                      {m.colorHex ? (
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            backgroundColor: m.colorHex,
                            border: `1px solid ${palette.borderStrong}`,
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background:
                              "conic-gradient(#c98a86,#c39a5b,#4d8a6a,#4f6a99,#c98a86)",
                            border: `1px solid ${palette.borderStrong}`,
                          }}
                        />
                      )}
                      {m.color[lang]}
                    </span>
                  ) : (
                    <span style={{ color: palette.muted }}>—</span>
                  )}
                </td>
                <td style={{ ...cellStyle, color: palette.muted, maxWidth: 200, whiteSpace: "normal" }}>
                  {m.type[lang]}
                </td>
                <td style={{ ...cellStyle, fontWeight: 700 }}>
                  {m.quantity}{" "}
                  <span style={{ fontWeight: 500, fontSize: 12.5, color: palette.muted }}>
                    {unitLabels[m.unit][lang]}
                  </span>
                </td>
                <td style={cellStyle}>
                  {m.unitPrice} <span style={{ fontSize: 12, color: palette.muted }}>{t.currency}</span>
                </td>
                <td style={{ ...cellStyle, color: palette.muted }}>{m.supplier}</td>
                <td style={cellStyle}>
                  <Badge
                    bg={`${statusColors[status]}1f`}
                    fg={statusColors[status]}
                    dot={statusColors[status]}
                  >
                    {statusLabels[status][lang]}
                  </Badge>
                </td>
                <td style={cellStyle}>
                  <div className="flex items-center justify-center gap-0.5">
                    <ActionIcon icon={Eye} label={t.view} onClick={(e) => { e.stopPropagation(); onSelect(m.id); }} />
                    <ActionIcon icon={Pencil} label={t.edit} onClick={(e) => { e.stopPropagation(); onEdit?.(m.id); }} />
                    <ActionIcon
                      icon={ArrowLeftRight}
                      label={t.move}
                      onClick={(e) => { e.stopPropagation(); onMove?.(m.id); }}
                    />
                    <ActionIcon
                      icon={Trash2}
                      label={t.delete}
                      danger
                      onClick={(e) => { e.stopPropagation(); onDelete?.(m.id); }}
                    />
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
