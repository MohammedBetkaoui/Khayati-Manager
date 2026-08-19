import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { palette, ui, type Lang, type Section } from "../content";

type Props = {
  section: Section;
  lang: Lang;
  onClick?: () => void;
};

export function DashboardCard({ section, lang, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const t = section[lang];
  const Icon = section.icon;
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group flex h-full flex-col text-start transition-all duration-200 ease-out"
      style={{
        backgroundColor: palette.surface,
        borderRadius: 22,
        border: `1px solid ${hover ? palette.borderStrong : palette.border}`,
        padding: 28,
        boxShadow: hover
          ? "0 18px 40px -18px rgba(18, 60, 74, 0.28)"
          : "0 2px 10px -6px rgba(18, 60, 74, 0.12)",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: section.tint,
          color: section.iconColor,
        }}
      >
        <Icon size={26} strokeWidth={1.9} />
      </div>

      <h3 className="mt-5" style={{ color: palette.text, fontSize: 20, fontWeight: 700 }}>
        {t.title}
      </h3>
      <p className="mt-1" style={{ color: palette.muted, fontSize: 13, fontWeight: 500 }}>
        {t.sub}
      </p>
      <p className="mt-3" style={{ color: palette.muted, fontSize: 14, lineHeight: 1.6 }}>
        {t.desc}
      </p>

      <div
        className="mt-6 flex items-center gap-2 pt-4"
        style={{
          borderTop: `1px solid ${palette.border}`,
          color: hover ? section.iconColor : palette.primary,
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        <span>{ui[lang].openSection}</span>
        <Arrow
          size={17}
          className="transition-transform duration-200"
          style={{
            transform: hover
              ? lang === "ar"
                ? "translateX(-4px)"
                : "translateX(4px)"
              : "translateX(0)",
          }}
        />
      </div>
    </button>
  );
}
