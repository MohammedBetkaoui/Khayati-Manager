import { UserCheck, UserX, CalendarCheck } from "lucide-react";
import { palette } from "../../content";
import { useLanguage } from "../../language-context";
import { Button } from "../kit";
import { workersText } from "../../pages/workers-data";

export function AttendanceWidget({ present, absent }: { present: number; absent: number }) {
  const { lang } = useLanguage();
  const t = workersText[lang].attendanceWidget;
  const total = present + absent || 1;

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
      <div className="mb-3" style={{ fontSize: 15, fontWeight: 700, color: palette.text }}>
        {t.title}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3" style={{ backgroundColor: "rgba(77,138,106,0.10)", borderRadius: 14, padding: 12 }}>
          <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(77,138,106,0.16)", color: "#4d8a6a" }}>
            <UserCheck size={19} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#4d8a6a", lineHeight: 1.1 }}>{present}</div>
            <div style={{ fontSize: 12, color: palette.muted }}>{t.present}</div>
          </div>
        </div>
        <div className="flex items-center gap-3" style={{ backgroundColor: "rgba(201,138,134,0.10)", borderRadius: 14, padding: 12 }}>
          <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(201,138,134,0.16)", color: "#b46a66" }}>
            <UserX size={19} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#b46a66", lineHeight: 1.1 }}>{absent}</div>
            <div style={{ fontSize: 12, color: palette.muted }}>{t.absent}</div>
          </div>
        </div>
      </div>

      {/* Ratio bar */}
      <div className="mt-3 flex overflow-hidden" style={{ height: 8, borderRadius: 999, backgroundColor: palette.bg }}>
        <div style={{ width: `${(present / total) * 100}%`, backgroundColor: "#4d8a6a" }} />
        <div style={{ width: `${(absent / total) * 100}%`, backgroundColor: "#b46a66" }} />
      </div>

      <div className="mt-4">
        <Button variant="primary" full>
          <CalendarCheck size={17} />
          {t.action}
        </Button>
      </div>
    </div>
  );
}
