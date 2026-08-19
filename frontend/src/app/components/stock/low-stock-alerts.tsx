import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import {
  statusColors,
  stockText,
  stockStatusOf,
  unitLabels,
  type Material,
} from "../../pages/stock-data";

export function LowStockAlerts({
  materials,
  onSelect,
}: {
  materials: Material[];
  onSelect?: (id: string) => void;
}) {
  const { lang, dir } = useLanguage();
  const t = stockText[lang].alerts;
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const flagged = materials
    .filter((m) => stockStatusOf(m) !== "available")
    .sort((a, b) => a.quantity - b.quantity);

  if (flagged.length === 0) return null;

  const reason = (m: Material) => {
    const s = stockStatusOf(m);
    if (s === "out") return t.reorder;
    if (m.quantity <= m.minAlert * 0.5) return t.nearOut;
    return t.belowMin;
  };

  return (
    <div
      style={{
        // warm, calm amber tone — not aggressive red
        backgroundColor: "#fbf6ec",
        borderRadius: 20,
        border: "1px solid #ecd9b4",
        boxShadow: "0 2px 10px -6px rgba(163, 125, 60, 0.18)",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div
          className="flex items-center justify-center"
          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(195,154,91,0.2)", color: "#a87d3c" }}
        >
          <AlertTriangle size={18} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#7a5c25" }}>{t.title}</div>
          <div style={{ fontSize: 12, color: "#a08a5e" }}>{t.subtitle}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-3">
        {flagged.slice(0, 4).map((m) => {
          const s = stockStatusOf(m);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect?.(m.id)}
              className="flex items-center gap-3 text-start transition-colors hover:opacity-90"
              style={{
                backgroundColor: palette.surface,
                borderRadius: 14,
                border: "1px solid #eadcc0",
                padding: "10px 12px",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  backgroundColor: statusColors[s],
                  flexShrink: 0,
                }}
              />
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 13.5, fontWeight: 600, color: palette.text }}>{m.name[lang]}</div>
                <div style={{ fontSize: 12, color: palette.muted }}>{reason(m)}</div>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: statusColors[s], whiteSpace: "nowrap" }}>
                {m.quantity} {unitLabels[m.unit][lang]}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 py-3 transition-colors hover:opacity-80"
        style={{ borderTop: "1px solid #eadcc0", fontSize: 13, fontWeight: 600, color: "#a87d3c" }}
      >
        {t.viewAll}
        <Chevron size={16} />
      </button>
    </div>
  );
}
