import { palette, type Lang } from "../content";

type Props = {
  lang: Lang;
  onChange: (lang: Lang) => void;
  size?: "default" | "compact";
};

const options: { value: Lang; label: string; shortLabel: string }[] = [
  { value: "ar", label: "العربية", shortLabel: "ع" },
  { value: "fr", label: "Français", shortLabel: "FR" },
];

export function LanguageSwitcher({
  lang,
  onChange,
  size = "default",
}: Props) {
  const compact = size === "compact";

  return (
    <div
      className={`inline-flex items-center ${
        compact ? "gap-0.5 rounded-lg p-0.5" : "gap-1 rounded-full p-1"
      }`}
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
            aria-label={opt.label}
            title={opt.label}
            className={`transition-colors ${
              compact
                ? "min-w-7 rounded-md px-1.5 py-1 text-[10px]"
                : "rounded-full px-3.5 py-1.5"
            }`}
            style={{
              backgroundColor: active ? palette.primary : "transparent",
              color: active ? "#ffffff" : palette.muted,
              fontWeight: active ? 600 : 500,
            }}
          >
            {compact ? opt.shortLabel : opt.label}
          </button>
        );
      })}
    </div>
  );
}
