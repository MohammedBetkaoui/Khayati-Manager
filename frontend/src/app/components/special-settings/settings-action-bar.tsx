import { Eye, RotateCcw, Save, X } from "lucide-react";
import type { ReactNode } from "react";
import { palette } from "../../content";
import { specialSettingsText, type Lang } from "../../pages/special-settings-data";

function ActionButton({
  children,
  primary,
  muted,
}: {
  children: ReactNode;
  primary?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 transition-colors"
      style={{
        height: 40,
        borderRadius: 12,
        padding: "0 15px",
        border: `1px solid ${primary ? palette.primary : palette.border}`,
        backgroundColor: primary ? palette.primary : muted ? palette.bg : palette.surface,
        color: primary ? "#fff" : muted ? palette.muted : palette.primary,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

export function SettingsActionBar({ lang }: { lang: Lang }) {
  const t = specialSettingsText[lang].actionBar;
  return (
    <div
      className="mt-5 flex flex-wrap items-center justify-between gap-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.96)",
        borderRadius: 18,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 10px 30px -24px rgba(18,60,74,0.38)",
        backdropFilter: "blur(8px)",
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: palette.muted }}>{t.updated}</div>
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton primary>
          <Save size={15} />
          {t.save}
        </ActionButton>
        <ActionButton muted>
          <X size={15} />
          {t.cancel}
        </ActionButton>
        <ActionButton>
          <RotateCcw size={15} />
          {t.reset}
        </ActionButton>
        <ActionButton>
          <Eye size={15} />
          {t.preview}
        </ActionButton>
      </div>
    </div>
  );
}
