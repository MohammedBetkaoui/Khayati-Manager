import { Minus, Square, UserRound, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import sewingMachineLogo from "../../static/sewing-machine.png";
import { LanguageSwitcher } from "./language-switcher";

type ElectronCSSProperties = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

const dragStyle: ElectronCSSProperties = { WebkitAppRegion: "drag" };
const noDragStyle: ElectronCSSProperties = { WebkitAppRegion: "no-drag" };

function WindowControl({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onDoubleClick={(event) => event.stopPropagation()}
      className="flex h-8 w-10 items-center justify-center rounded-lg transition-all duration-150 hover:brightness-95 active:scale-95 dark:hover:brightness-110"
      style={{
        ...noDragStyle,
        color: danger ? palette.rose : palette.primary,
        backgroundColor: danger
          ? "rgba(201, 138, 134, 0.1)"
          : "var(--app-window-button)",
        border: `1px solid ${
          danger ? "rgba(201, 138, 134, 0.28)" : palette.border
        }`,
      }}
    >
      {icon}
    </button>
  );
}

export function WindowTitleBar() {
  const { lang, dir, setLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const controls = window.electron?.windowControls;
  const isHomePage = location.pathname === "/";

  const labels =
    lang === "ar"
      ? {
          minimize: "تصغير النافذة",
          maximize: "تكبير أو استعادة النافذة",
          close: "إغلاق التطبيق",
        }
      : {
          minimize: "Réduire",
          maximize: "Agrandir ou restaurer",
          close: "Fermer l'application",
        };

  return (
    <div
      dir="ltr"
      className={`relative z-[100] flex shrink-0 items-center gap-3 border-b px-2 transition-[height] duration-200 ${
        isHomePage ? "h-16" : "h-11"
      }`}
      style={{
        ...dragStyle,
        background: "var(--app-header-surface)",
        borderColor: palette.border,
        boxShadow: "0 4px 18px rgba(18, 60, 74, 0.07)",
      }}
      onDoubleClick={() => void controls?.toggleMaximize()}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-70"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--app-accent), transparent)",
        }}
      />
      {isHomePage ? (
        <button
          type="button"
          dir={dir}
          onClick={() => navigate("/")}
          onDoubleClick={(event) => event.stopPropagation()}
          className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-start transition-colors hover:bg-[var(--app-window-button)]"
          style={noDragStyle}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
            style={{
              background:
                "linear-gradient(145deg, rgba(18,60,74,0.98), rgba(13,45,56,0.96))",
              borderColor: "rgba(255,255,255,0.18)",
              boxShadow: "0 7px 18px rgba(18, 60, 74, 0.16)",
            }}
          >
            <img
              src={sewingMachineLogo}
              alt=""
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span
              className="block truncate text-[15px] font-extrabold"
              style={{ color: palette.primary }}
            >
              {t.appName}
            </span>
            <span
              className="block truncate text-[11px]"
              style={{ color: palette.muted }}
            >
              {t.appSubtitle}
            </span>
          </span>
        </button>
      ) : null}

      <div className="flex-1" />

      <div
        dir={dir}
        className="flex items-center gap-2"
        style={noDragStyle}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <LanguageSwitcher
          lang={lang}
          onChange={setLang}
          size={isHomePage ? "default" : "compact"}
        />
        {isHomePage ? (
          <div
            className="hidden items-center gap-2 rounded-xl border px-2.5 py-1.5 lg:flex"
            style={{
              borderColor: palette.border,
              backgroundColor: "var(--app-translucent-surface)",
            }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                backgroundColor: palette.accentSoft,
                color: palette.primary,
              }}
            >
              <UserRound size={14} strokeWidth={2} />
            </span>
            <span className="leading-tight">
              <span
                className="block text-[11px] font-extrabold"
                style={{ color: palette.text }}
              >
                {t.userName}
              </span>
              <span
                className="block text-[10px]"
                style={{ color: palette.muted }}
              >
                {t.userRole}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {controls ? (
        <div className="flex items-center gap-1.5" style={noDragStyle}>
          <WindowControl
            label={labels.minimize}
            onClick={() => void controls.minimize()}
            icon={<Minus size={15} strokeWidth={2.2} />}
          />
          <WindowControl
            label={labels.maximize}
            onClick={() => void controls.toggleMaximize()}
            icon={<Square size={13} strokeWidth={2.1} />}
          />
          <WindowControl
            label={labels.close}
            onClick={() => void controls.close()}
            danger
            icon={<X size={15} strokeWidth={2.2} />}
          />
        </div>
      ) : null}
    </div>
  );
}
