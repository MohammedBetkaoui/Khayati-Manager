import { palette, type Lang } from "../content";

type Props = {
  lang: Lang;
  onChange: (lang: Lang) => void;
};

const options: { value: Lang; label: string }[] = [
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
];

export function LanguageSwitcher({ lang, onChange }: Props) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full p-1"
      style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}
      role="group"
      aria-label="Language"
    >
      {options.map((opt) => {
        const active = lang === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-full px-3.5 py-1.5 transition-colors"
            style={{
              backgroundColor: active ? palette.primary : "transparent",
              color: active ? "#ffffff" : palette.muted,
              fontWeight: active ? 600 : 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
