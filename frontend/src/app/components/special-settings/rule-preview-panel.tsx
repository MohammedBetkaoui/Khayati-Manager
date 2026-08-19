import { Calculator, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { palette } from "../../content";
import { specialSettingsText, type Lang } from "../../pages/special-settings-data";

function PreviewRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        padding: "9px 0",
        borderBottom: `1px solid ${palette.border}`,
        fontSize: 12.5,
      }}
    >
      <span style={{ color: palette.muted }}>{label}</span>
      <span style={{ color: strong ? palette.primary : palette.text, fontWeight: strong ? 800 : 700 }}>{value}</span>
    </div>
  );
}

function PreviewButton({
  children,
  primary,
}: {
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 transition-colors"
      style={{
        height: 40,
        borderRadius: 12,
        border: `1px solid ${primary ? palette.primary : palette.border}`,
        backgroundColor: primary ? palette.primary : palette.surface,
        color: primary ? "#fff" : palette.primary,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

export function RulePreviewPanel({ lang }: { lang: Lang }) {
  const t = specialSettingsText[lang].preview;

  return (
    <aside
      style={{
        backgroundColor: palette.surface,
        borderRadius: 22,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding: 18,
        alignSelf: "start",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: "rgba(18,60,74,0.08)",
            color: palette.primary,
          }}
        >
          <Calculator size={20} strokeWidth={1.9} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: palette.text }}>{t.title}</h2>
          <p style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{t.impact}</p>
        </div>
      </div>

      <div
        className="mt-5"
        style={{
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          backgroundColor: palette.bg,
          padding: 14,
        }}
      >
        <div style={{ fontSize: 12, color: palette.muted }}>{t.selectedType}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: palette.text, marginTop: 4 }}>{t.selectedValue}</div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2" style={{ fontSize: 13.5, fontWeight: 800, color: palette.text }}>
          <SlidersHorizontal size={16} style={{ color: palette.primary }} />
          {t.exampleTitle}
        </div>
        <div className="mt-3">
          <PreviewRow label={t.base} value={lang === "ar" ? "9,600 دج" : "9 600 DA"} />
          <PreviewRow label={t.days} value={lang === "ar" ? "22 يوم" : "22 jours"} />
          <PreviewRow label={t.pieces} value={lang === "ar" ? "120 قطعة" : "120 pièces"} />
          <PreviewRow label={t.deductions} value={lang === "ar" ? "-500 دج" : "-500 DA"} />
          <PreviewRow label={t.net} value={t.netValue} strong />
        </div>
      </div>

      <div
        className="mt-5"
        style={{
          borderRadius: 16,
          backgroundColor: "#fff8ee",
          border: "1px solid #ead8bd",
          padding: 14,
        }}
      >
        <div style={{ fontSize: 12.5, color: "#7c633d", lineHeight: 1.8 }}>
          <div>{t.formula}</div>
          <div>{t.absenceDeduction}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <PreviewButton primary>
          <Save size={15} />
          {t.saveChanges}
        </PreviewButton>
        <PreviewButton>
          <RotateCcw size={15} />
          {t.restoreDefaults}
        </PreviewButton>
        <PreviewButton>
          <Calculator size={15} />
          {t.testRule}
        </PreviewButton>
      </div>
    </aside>
  );
}
