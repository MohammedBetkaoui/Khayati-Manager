import { palette } from "../../content";
import {
  settingsMenu,
  specialSettingsText,
  type Lang,
  type SettingSectionId,
} from "../../pages/special-settings-data";

type Props = {
  lang: Lang;
  active: SettingSectionId;
  onChange: (id: SettingSectionId) => void;
};

export function SettingsSidebar({ lang, active, onChange }: Props) {
  const t = specialSettingsText[lang];

  return (
    <aside
      style={{
        backgroundColor: palette.surface,
        borderRadius: 22,
        border: `1px solid ${palette.border}`,
        boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.16)",
        padding: 16,
        alignSelf: "start",
      }}
    >
      <div className="px-2 pb-3">
        <h2 style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{t.menuTitle}</h2>
        <p style={{ fontSize: 12, color: palette.muted, marginTop: 4 }}>{t.sectionHint}</p>
      </div>

      <nav className="mt-2 flex flex-col gap-2">
        {settingsMenu.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className="group flex items-center gap-3 text-start transition-colors"
              style={{
                borderRadius: 16,
                padding: "12px 13px",
                backgroundColor: isActive ? palette.primary : "transparent",
                color: isActive ? "#fff" : palette.text,
                border: `1px solid ${isActive ? palette.primary : "transparent"}`,
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: isActive ? "rgba(255,255,255,0.14)" : palette.bg,
                  color: isActive ? "#fff" : palette.primary,
                }}
              >
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate"
                  style={{ fontSize: 13.5, fontWeight: isActive ? 800 : 700 }}
                >
                  {item.label[lang]}
                </span>
                <span
                  className="block truncate"
                  style={{ fontSize: 11.5, color: isActive ? "rgba(255,255,255,0.74)" : palette.muted, marginTop: 1 }}
                >
                  {item.subtitle[lang]}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
