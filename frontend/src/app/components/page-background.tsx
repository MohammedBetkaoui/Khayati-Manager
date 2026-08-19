import type { ReactNode } from "react";
import { palette } from "../content";
import { useLanguage } from "../language-context";

/**
 * Shared page frame: off-white background, subtle diagonal stitch texture,
 * and a centered max-width column. Used by every screen so spacing and
 * identity stay identical across the app.
 */
export function PageBackground({ children }: { children: ReactNode }) {
  const { lang, dir } = useLanguage();
  return (
    <div
      dir={dir}
      lang={lang}
      className="size-full overflow-auto"
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        fontFamily: "'Cairo', 'Inter', sans-serif",
      }}
    >
      <div className="relative min-h-full">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(18,60,74,0.035) 0px, rgba(18,60,74,0.035) 2px, transparent 2px, transparent 22px)",
          }}
        />
        <div className="relative mx-auto flex min-h-full w-full max-w-[1320px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export function StitchDivider({ className = "" }: { className?: string }) {
  const { dir } = useLanguage();
  return (
    <div
      aria-hidden
      className={className}
      style={{
        height: 1,
        backgroundImage: `repeating-linear-gradient(to ${
          dir === "rtl" ? "left" : "right"
        }, ${palette.borderStrong} 0px, ${palette.borderStrong} 6px, transparent 6px, transparent 12px)`,
      }}
    />
  );
}
