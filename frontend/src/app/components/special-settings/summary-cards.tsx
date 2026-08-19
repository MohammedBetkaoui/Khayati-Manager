import { summaryCards, type Lang } from "../../pages/special-settings-data";
import { palette } from "../../content";

export function SpecialSettingsSummaryCards({ lang }: { lang: Lang }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title.ar}
            className="flex min-h-[112px] flex-col justify-between"
            style={{
              backgroundColor: palette.surface,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              boxShadow: "0 2px 12px -8px rgba(18, 60, 74, 0.14)",
              padding: "18px 20px",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: card.tint,
                  color: card.color,
                }}
              >
                <Icon size={22} strokeWidth={1.9} />
              </div>
              <div style={{ textAlign: "end" }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: palette.text, lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11.5, color: palette.muted, marginTop: 5 }}>{card.frenchSubtitle}</div>
              </div>
            </div>

            <div className="mt-4">
              <div style={{ fontSize: 14, fontWeight: 800, color: palette.text }}>{card.title[lang]}</div>
              <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{card.helper[lang]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
