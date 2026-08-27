import { Moon, Sun } from "lucide-react";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { useAppTheme } from "../theme-context";

export function ThemeToggle() {
  const { lang } = useLanguage();
  const { theme, toggleTheme } = useAppTheme();
  const dark = theme === "dark";
  const label =
    lang === "ar"
      ? dark
        ? "تفعيل الوضع الفاتح"
        : "تفعيل الوضع الداكن"
      : dark
        ? "Activer le mode clair"
        : "Activer le mode sombre";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className="group flex items-center gap-2 rounded-full border px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: palette.surfaceElevated,
        borderColor: palette.border,
        color: palette.text,
        boxShadow: "var(--app-floating-shadow)",
      }}
    >
      <Sun
        size={16}
        strokeWidth={2}
        style={{ color: dark ? palette.muted : palette.accent }}
      />
      <span
        aria-hidden
        className="relative block h-5 w-9 rounded-full"
        style={{
          backgroundColor: dark ? palette.primary : palette.borderStrong,
        }}
      >
        <span
          className="absolute top-0.5 block h-4 w-4 rounded-full transition-transform duration-200"
          style={{
            left: 2,
            backgroundColor: dark ? "#f4e8d3" : palette.surface,
            boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
            transform: dark ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </span>
      <Moon
        size={15}
        strokeWidth={2}
        style={{ color: dark ? "#d8b777" : palette.muted }}
      />
    </button>
  );
}
