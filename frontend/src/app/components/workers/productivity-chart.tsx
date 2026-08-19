import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { workersText } from "../../pages/workers-data";
import type { Worker } from "../../pages/workers-data";

export function ProductivityChart({ rows }: { rows: Worker[] }) {
  const { lang, dir } = useLanguage();
  const t = workersText[lang];

  const data = [...rows]
    .sort((a, b) => b.pieces - a.pieces)
    .slice(0, 5)
    .map((w) => ({
      name: w.name[lang].split(" ")[0],
      pieces: w.pieces,
      productivity: w.productivity,
    }));

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        padding: 18,
      }}
    >
      <div className="mb-1" style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>
        {t.topProductive}
      </div>
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <XAxis type="number" hide domain={[0, "dataMax + 40"]} reversed={dir === "rtl"} />
            <YAxis
              type="category"
              dataKey="name"
              orientation={dir === "rtl" ? "right" : "left"}
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: palette.muted }}
            />
            <Bar dataKey="pieces" radius={6} barSize={16} label={{ position: dir === "rtl" ? "left" : "right", fontSize: 11, fill: palette.muted }}>
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={i === 0 ? palette.primary : i === 1 ? palette.accent : "rgba(18,60,74,0.35)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
