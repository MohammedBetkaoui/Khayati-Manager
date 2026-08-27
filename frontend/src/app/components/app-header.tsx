import { type CSSProperties, type ReactNode } from "react";
import { Minus, Square, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { LanguageSwitcher } from "./language-switcher";
import sewingMachineLogo from "../../static/sewing-machine.png";

type ElectronCSSProperties = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

const dragStyle: ElectronCSSProperties = { WebkitAppRegion: "drag" };
const noDragStyle: ElectronCSSProperties = { WebkitAppRegion: "no-drag" };

function WindowButton({
  label,
  onClick,
  variant = "default",
  icon,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  icon: ReactNode;
}) {
  const baseStyle = noDragStyle;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200"
      style={{
        ...baseStyle,
        backgroundColor:
          variant === "danger"
            ? "rgba(201, 138, 134, 0.08)"
            : "var(--app-window-button)",
        borderColor:
          variant === "danger" ? "rgba(201, 138, 134, 0.24)" : palette.border,
        color: variant === "danger" ? palette.rose : palette.primary,
      }}
    >
      {icon}
    </button>
  );
}

export function AppHeader() {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const windowControls = window.electron?.windowControls;

  return (
    <header
      className="overflow-hidden rounded-[28px] border shadow-[0_22px_50px_rgba(18,60,74,0.08)]"
      style={{
        background: "var(--app-header-surface)",
        borderColor: palette.border,
      }}
    >
      <div
        className="flex items-center justify-between gap-4 border-b px-4 py-3"
        style={{
          ...dragStyle,
          borderColor: palette.borderStrong,
          background: "var(--app-header-strip)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-3.5 text-start"
          style={noDragStyle}
        >
          <div
            className="flex items-center justify-center overflow-hidden rounded-2xl border"
            style={{
              width: 46,
              height: 46,
              background:
                "linear-gradient(145deg, rgba(18,60,74,0.98) 0%, rgba(13,45,56,0.96) 100%)",
              borderColor: "rgba(255,255,255,0.18)",
              boxShadow: "0 10px 24px rgba(18, 60, 74, 0.18)",
            }}
          >
            <img
              src={sewingMachineLogo}
              alt="logo"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
          </div>
          <div className="leading-tight">
            <div
              style={{ fontSize: 20, fontWeight: 800, color: palette.primary }}
            >
              {t.appName}
            </div>
            <div style={{ fontSize: 13, color: palette.muted }}>
              {t.appSubtitle}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <div style={noDragStyle}>
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>
          <div
            className="hidden items-center gap-3 rounded-full border px-3 py-1.5 lg:flex"
            style={{
              ...noDragStyle,
              borderColor: palette.border,
              backgroundColor: "var(--app-translucent-surface)",
            }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor: palette.accentSoft,
                color: palette.primary,
              }}
            >
              <UserRound size={16} strokeWidth={2} />
            </div>
            <div className="leading-tight">
              <div
                style={{ fontSize: 12.5, fontWeight: 800, color: palette.text }}
              >
                {t.userName}
              </div>
              <div style={{ fontSize: 11, color: palette.muted }}>
                {t.userRole}
              </div>
            </div>
          </div>
          {windowControls ? (
            <div className="flex items-center gap-2">
              <WindowButton
                label="Minimize"
                onClick={() => windowControls.minimize()}
                icon={<Minus size={15} strokeWidth={2.2} />}
              />
              <WindowButton
                label="Maximize"
                onClick={() => windowControls.toggleMaximize()}
                icon={<Square size={14} strokeWidth={2.2} />}
              />
              <WindowButton
                label="Close"
                onClick={() => windowControls.close()}
                variant="danger"
                icon={<X size={15} strokeWidth={2.2} />}
              />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
