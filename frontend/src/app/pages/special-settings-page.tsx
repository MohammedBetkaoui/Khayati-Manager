import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { useNavigate } from "react-router";
import { PageBackground } from "../components/page-background";
import { palette } from "../content";
import { useLanguage } from "../language-context";
import { asRecord, fetchJson } from "../lib/api";

type SettingsEntry = {
  key: string;
  value: string;
};

export function SpecialSettingsPage() {
  const { lang, dir } = useLanguage();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SettingsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/settings");
        if (cancelled) return;

        const record = asRecord(payload);
        if (!record) {
          setEntries([]);
          return;
        }

        setEntries(
          Object.entries(record).map(([key, value]) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value),
          })),
        );
      } catch (err) {
        if (cancelled) return;
        setEntries([]);
        setError(err instanceof Error ? err.message : "Unable to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      sections: entries.length,
      connected: entries.length > 0 ? 1 : 0,
    };
  }, [entries.length]);

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
        <div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: palette.muted }}>
            <button type="button" onClick={() => navigate("/")} className="transition-colors hover:opacity-80">
              {lang === "ar" ? "الرئيسية" : "Accueil"}
            </button>
            <CrumbChevron size={14} />
            <span style={{ color: palette.text, fontWeight: 600 }}>{lang === "ar" ? "إعدادات خاصة" : "Parametres speciaux"}</span>
          </div>
          <h1 className="mt-1" style={{ fontSize: 24, fontWeight: 800, color: palette.text }}>
            {lang === "ar" ? "إعدادات خاصة" : "Parametres speciaux"}
          </h1>
          <p style={{ fontSize: 13.5, color: palette.muted, marginTop: 2, maxWidth: 760 }}>
            {lang === "ar"
              ? "هذه الصفحة تنتظر بيانات إعدادات حقيقية من الـ API. عند توفرها ستظهر هنا مباشرة."
              : "Cette page attend maintenant de vraies donnees settings depuis l'API. Elles s'afficheront ici automatiquement des qu'elles seront disponibles."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div style={{ backgroundColor: palette.surface, borderRadius: 20, border: `1px solid ${palette.border}`, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: palette.muted }}>{lang === "ar" ? "الأقسام المحملة" : "Sections chargees"}</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: palette.primary }}>{summary.sections}</div>
        </div>
        <div style={{ backgroundColor: palette.surface, borderRadius: 20, border: `1px solid ${palette.border}`, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: palette.muted }}>{lang === "ar" ? "حالة الربط" : "Etat de connexion"}</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: summary.connected ? "#4d8a6a" : "#b46a66" }}>
            {summary.connected ? (lang === "ar" ? "مربوط" : "Connecte") : (lang === "ar" ? "غير مربوط" : "Non connecte")}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-sm" style={{ color: palette.muted }}>
          {lang === "ar" ? "جاري تحميل الإعدادات..." : "Chargement des parametres..."}
        </div>
      ) : null}
      {!loading && error ? (
        <div className="mt-6 text-sm" style={{ color: "#b46a66" }}>
          {lang === "ar" ? "تعذر تحميل الإعدادات الخاصة." : "Impossible de charger les parametres speciaux."}
        </div>
      ) : null}

      {!loading && entries.length === 0 ? (
        <div
          className="mt-6 rounded-2xl border p-6 text-sm"
          style={{ borderColor: palette.border, backgroundColor: palette.surface, color: palette.muted }}
        >
          <div className="mb-3 flex items-center gap-2" style={{ color: palette.text, fontWeight: 700 }}>
            <Settings2 size={18} />
            {lang === "ar" ? "لا توجد إعدادات حقيقية حتى الآن" : "Aucun parametre reel pour le moment"}
          </div>
          {lang === "ar"
            ? "في يوم الأربعاء 19 أغسطس 2026، هذه الصفحة أصبحت خالية من كل بيانات العرض الوهمية. ستبدأ بالامتلاء فقط عندما يعيد endpoint /settings بيانات منظمة."
            : "Au mercredi 19 août 2026, cette page ne contient plus aucune donnee fictive. Elle se remplira uniquement quand l'endpoint /settings renverra des donnees structurees."}
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div
          className="mt-6 overflow-hidden rounded-2xl border"
          style={{ borderColor: palette.border, backgroundColor: palette.surface }}
        >
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: palette.text }}>{lang === "ar" ? "القيم القادمة من الـ API" : "Valeurs recues depuis l'API"}</div>
          </div>
          <div className="overflow-x-auto p-5">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${palette.border}`, color: palette.muted }}>
                  <th className="pb-2 text-start">{lang === "ar" ? "المفتاح" : "Cle"}</th>
                  <th className="pb-2 text-start">{lang === "ar" ? "القيمة" : "Valeur"}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.key} style={{ borderBottom: `1px solid ${palette.border}` }}>
                    <td className="py-2 font-semibold">{entry.key}</td>
                    <td className="py-2" style={{ color: palette.muted }}>{entry.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </PageBackground>
  );
}
