import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground, StitchDivider } from "../components/page-background";
import { SettingsActionBar } from "../components/special-settings/settings-action-bar";
import { SettingsSidebar } from "../components/special-settings/settings-sidebar";
import {
  AddPiecePriceModal,
  AddProductionStageModal,
  AddRuleModal,
} from "../components/special-settings/settings-modals";
import { RulePreviewPanel } from "../components/special-settings/rule-preview-panel";
import { SpecialSettingsSectionContent } from "../components/special-settings/section-content";
import { SpecialSettingsSummaryCards } from "../components/special-settings/summary-cards";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { specialSettingsText, type SettingSectionId } from "./special-settings-data";

export function SpecialSettingsPage() {
  const { lang, dir } = useLanguage();
  const t = specialSettingsText[lang];
  const navigate = useNavigate();
  const [active, setActive] = useState<SettingSectionId>("wages");
  const [ruleOpen, setRuleOpen] = useState(false);
  const [pieceOpen, setPieceOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const CrumbChevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <PageBackground>

      <div className="flex items-center gap-4 pt-7">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            color: palette.primary,
          }}
        >
          <BackArrow size={20} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
            <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
              {t.breadcrumbHome}
            </button>
            <CrumbChevron size={14} />
            <span style={{ color: palette.text, fontWeight: 700 }}>{t.breadcrumb}</span>
          </div>
          <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 780 }}>{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-6">
        <SpecialSettingsSummaryCards lang={lang} />
      </div>

      <main dir="ltr" className="mt-5 grid grid-cols-1 gap-5 pb-10 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div
          dir={dir}
          className="self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)] xl:overflow-y-auto"
        >
          <SettingsSidebar lang={lang} active={active} onChange={setActive} />
        </div>

        <div dir={dir} className="min-w-0">
          <SpecialSettingsSectionContent
            active={active}
            lang={lang}
            onAddRule={() => setRuleOpen(true)}
            onAddPiece={() => setPieceOpen(true)}
            onAddStage={() => setStageOpen(true)}
          />
          <SettingsActionBar lang={lang} />
        </div>

        <div
          dir={dir}
          className="self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-48px)] xl:overflow-y-auto"
        >
          <RulePreviewPanel lang={lang} />
        </div>
      </main>

      <AddRuleModal open={ruleOpen} onClose={() => setRuleOpen(false)} lang={lang} />
      <AddPiecePriceModal open={pieceOpen} onClose={() => setPieceOpen(false)} lang={lang} />
      <AddProductionStageModal open={stageOpen} onClose={() => setStageOpen(false)} lang={lang} />
    </PageBackground>
  );
}
